'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Maximize2, Minimize2 } from 'lucide-react';
import { StellenCheckenLiveState } from '@/app/api/live/stellen-checken/route';
import HolographicStellenCheckenCockpit from '@/components/HolographicStellenCheckenCockpit';

interface StellenCheckenLiveMonitorProps {
  initialBoardId?: string;
}

export default function StellenCheckenLiveMonitorClient({ initialBoardId = '1' }: StellenCheckenLiveMonitorProps) {
  const [boardId, setBoardId] = useState<string>(initialBoardId);
  const [liveState, setLiveState] = useState<StellenCheckenLiveState>({
    status: 'idle',
    boardId: initialBoardId,
    currentVisit: 1,
    totalVisits: 15,
    currentNumber: 64,
    recommendedRoute: 'T16 ➔ D8',
    p1Checks: 0,
    p1Points: 0,
    p2Checks: 0,
    p2Points: 0,
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // 1. BroadcastChannel Listener
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel(`lions_stellen_checken_live_sync_${boardId}`);
        bc.onmessage = (event) => {
          if (event.data && typeof event.data === 'object') {
            setLiveState(event.data);
          }
        };
      } catch (e) {}
    }
    return () => {
      bc?.close();
    };
  }, [boardId]);

  // 2. localStorage Event Listener
  useEffect(() => {
    const storageKey = `lions_stellen_checken_live_sync_${boardId}`;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setLiveState(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setLiveState(JSON.parse(raw));
    } catch (err) {}
    return () => window.removeEventListener('storage', handleStorage);
  }, [boardId]);

  // 3. API Polling alle 1.2s für dieses Board
  useEffect(() => {
    const pollApi = async () => {
      try {
        const res = await fetch(`/api/live/stellen-checken?board=${boardId}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.updatedAt) {
            setLiveState((prev) => {
              if (!prev.updatedAt || data.updatedAt > prev.updatedAt || data.status === 'idle') {
                return data;
              }
              return prev;
            });
          }
        }
      } catch (e) {}
    };

    pollApi();
    const interval = setInterval(pollApi, 1200);
    return () => clearInterval(interval);
  }, [boardId]);

  const rawP1Name = (liveState.p1Name || 'Sebastian Kirsch').trim();
  const rawP2Name = (liveState.p2Name || 'Gastspieler').trim();
  const is1vs1 = liveState.gameMode === '1vs1';
  const activePlayer = liveState.activePlayer || 1;
  const currentVisit = liveState.currentVisit || 1;
  const totalVisits = liveState.totalVisits || 15;
  const currentNumber = liveState.currentNumber || 64;
  const recommendedRoute = liveState.recommendedRoute || 'T16 ➔ D8';
  const activeName = is1vs1 ? (activePlayer === 1 ? rawP1Name : rawP2Name) : rawP1Name;
  const checksCount = is1vs1 ? (activePlayer === 1 ? liveState.p1Checks : liveState.p2Checks) ?? 0 : liveState.p1Checks ?? 0;
  const checkPct = currentVisit > 1 ? Math.round((checksCount / (currentVisit - 1)) * 100) : 0;

  // STANDBY SCREEN
  if (liveState.status === 'idle') {
    return (
      <div className="relative w-screen h-screen bg-[#040711] text-white flex flex-col justify-between p-6 sm:p-12 overflow-hidden select-none font-sans">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[20%] w-[55vw] h-[55vw] bg-cyan-600/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-[-15%] right-[15%] w-[45vw] h-[45vw] bg-amber-600/10 rounded-full blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:40px_40px] opacity-40" />
        </div>

        <div className="relative z-10 flex items-center justify-between w-full border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-black tracking-wider text-cyan-400 font-mono">
              BOARD {boardId}
            </span>
            <span className="text-xs uppercase px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
              STELLEN & CHECKEN
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm sm:text-base font-mono text-slate-400 tracking-widest">{currentTime}</span>
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-8 my-auto">
          <div className="relative w-44 h-44 sm:w-60 sm:h-60 filter drop-shadow-[0_0_45px_rgba(6,182,212,0.4)]">
            <Image src="/lions-logo.png" alt="Lions Weyhausen" fill sizes="240px" className="object-contain" priority />
          </div>

          <div className="space-y-4 max-w-xl">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase drop-shadow-md">
              STELLEN & CHECKEN · LIVE
            </h1>
            <p className="text-base sm:text-lg text-cyan-300 font-mono tracking-widest animate-pulse">
              Warte auf Spielbeginn am Board {boardId}...
            </p>
          </div>

          <div className="flex items-center gap-2 pt-4">
            <span className="text-xs text-slate-400 font-mono mr-2">BOARD WÄHLEN:</span>
            {['1', '2', '3', '4', '5'].map((b) => (
              <button
                key={b}
                onClick={() => setBoardId(b)}
                className={`w-10 h-10 rounded-xl font-mono text-sm font-black transition-all cursor-pointer ${
                  boardId === b
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.6)] scale-110'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/10'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 font-mono border-t border-white/10 pt-4">
          <span>LIONS WEYHAUSEN 2.0 · LIVE TELEMETRY</span>
          <span>15 AUFNAHMEN · 3 BIS 101 PUNKTE</span>
        </div>
      </div>
    );
  }

  // COMPLETED SCREEN
  if (liveState.status === 'completed') {
    return (
      <div className="relative w-screen h-screen bg-[#040711] text-white flex flex-col justify-between p-6 sm:p-10 overflow-hidden select-none font-sans">
        <div className="relative z-10 flex items-center justify-between w-full border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-black tracking-wider text-cyan-400 font-mono">
              BOARD {boardId}
            </span>
            <span className="text-xs uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
              SESSION BEENDET
            </span>
          </div>
          <span className="text-sm sm:text-base font-mono text-slate-400 tracking-widest">{currentTime}</span>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center space-y-6 my-auto max-w-4xl mx-auto w-full">
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400 font-mono">
            CHECKOUT-LEISTUNG
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight text-center">
            {rawP1Name}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full pt-4">
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-2xl text-center space-y-2">
              <span className="text-xs font-mono uppercase text-slate-400">Verwandelte Checks</span>
              <div className="text-6xl sm:text-7xl font-black font-mono text-emerald-400">
                {liveState.p1Checks ?? 0} <span className="text-2xl text-slate-500 font-normal">/ 15</span>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-2xl text-center space-y-2">
              <span className="text-xs font-mono uppercase text-slate-400">Erzielte Punkte</span>
              <div className="text-6xl sm:text-7xl font-black font-mono text-cyan-400">
                {liveState.p1Points ?? 0} <span className="text-2xl text-slate-500 font-normal">/ 28</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 font-mono border-t border-white/10 pt-4">
          <span>BOARD {boardId}</span>
          <button
            onClick={() => setLiveState((prev) => ({ ...prev, status: 'idle' }))}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 cursor-pointer"
          >
            Zurück zum Standby
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE PLAYING SCREEN (1:1 EXAKT SOLL-BILD)
  return (
    <HolographicStellenCheckenCockpit
      boardId={boardId}
      activeName={activeName}
      is1vs1={is1vs1}
      activePlayer={activePlayer}
      currentVisit={currentVisit}
      totalVisits={totalVisits}
      currentNumber={currentNumber}
      recommendedRoute={recommendedRoute}
      checksCount={checksCount}
      isFullscreen={isFullscreen}
      onToggleFullscreen={toggleFullscreen}
    />
  );
}
