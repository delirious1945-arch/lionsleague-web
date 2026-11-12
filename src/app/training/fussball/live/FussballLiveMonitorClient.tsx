'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Maximize2, Minimize2 } from 'lucide-react';
import { FussballLiveState } from '@/app/api/live/fussball/route';
import HolographicFussballCockpit from '@/components/HolographicFussballCockpit';

interface FussballLiveMonitorProps {
  initialBoardId?: string;
}

export default function FussballLiveMonitorClient({ initialBoardId = '1' }: FussballLiveMonitorProps) {
  const [boardId, setBoardId] = useState<string>(initialBoardId);
  const [liveState, setLiveState] = useState<FussballLiveState>({
    status: 'idle',
    boardId: initialBoardId,
    scoreP1: 0,
    scoreP2: 0,
    targetGoals: 5,
    ballPossession: 1,
    activePlayer: 1,
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
        bc = new BroadcastChannel(`lions_fussball_live_sync_${boardId}`);
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
    const storageKey = `lions_fussball_live_sync_${boardId}`;
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
        const res = await fetch(`/api/live/fussball?board=${boardId}`, { cache: 'no-store' });
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
  const rawP2Name = (liveState.p2Name || 'Bot-Gegner').trim();
  const scoreP1 = liveState.scoreP1 ?? 0;
  const scoreP2 = liveState.scoreP2 ?? 0;
  const targetGoals = liveState.targetGoals ?? 5;
  const ballPossession = liveState.ballPossession || 1;
  const activeName = ballPossession === 1 ? rawP1Name : rawP2Name;
  const is1vs1 = liveState.gameMode === '1vs1' || liveState.gameMode === 'bot' || !!liveState.p2Name;

  // STANDBY SCREEN
  if (liveState.status === 'idle') {
    return (
      <div className="relative w-screen h-screen bg-[#040711] text-white flex flex-col justify-between p-6 sm:p-12 overflow-hidden select-none font-sans">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[20%] w-[55vw] h-[55vw] bg-emerald-600/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-[-15%] right-[15%] w-[45vw] h-[45vw] bg-cyan-600/10 rounded-full blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:40px_40px] opacity-40" />
        </div>

        <div className="relative z-10 flex items-center justify-between w-full border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-black tracking-wider text-emerald-400 font-mono">
              BOARD {boardId}
            </span>
            <span className="text-xs uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
              FUßBALL DARTS
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
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 filter drop-shadow-[0_0_50px_rgba(16,185,129,0.5)]">
            <Image src="/logo.png" alt="Lions Weyhausen" fill sizes="260px" className="object-contain" priority />
          </div>

          <div className="space-y-4 max-w-xl">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase drop-shadow-md">
              FUßBALL DARTS · LIVE
            </h1>
            <p className="text-base sm:text-lg text-emerald-300 font-mono tracking-widest animate-pulse">
              Warte auf Anstoß am Board {boardId}...
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
                    ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.6)] scale-110'
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
          <span>DUELL UM BALLBESITZ & TORE</span>
        </div>
      </div>
    );
  }

  // COMPLETED SCREEN
  if (liveState.status === 'completed') {
    const winnerName = liveState.winner || (scoreP1 > scoreP2 ? rawP1Name : rawP2Name);
    return (
      <div className="relative w-screen h-screen bg-[#040711] text-white flex flex-col justify-between p-6 sm:p-10 overflow-hidden select-none font-sans">
        <div className="relative z-10 flex items-center justify-between w-full border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-black tracking-wider text-emerald-400 font-mono">
              BOARD {boardId}
            </span>
            <span className="text-xs uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
              ABPFIFF · ENDSTAND
            </span>
          </div>
          <span className="text-sm sm:text-base font-mono text-slate-400 tracking-widest">{currentTime}</span>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center space-y-6 my-auto max-w-4xl mx-auto w-full">
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400 font-mono">
            SIEGER DES DUELLS
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight text-center">
            ⚽ {winnerName}
          </h2>

          <div className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-2xl text-center space-y-2 w-full max-w-md">
            <span className="text-xs font-mono uppercase text-slate-400">Endergebnis</span>
            <div className="text-6xl sm:text-7xl font-black font-mono text-emerald-400">
              {scoreP1} : {scoreP2}
            </div>
            <span className="text-xs text-slate-400 block pt-1">
              {rawP1Name} gegen {rawP2Name}
            </span>
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

  // ACTIVE PLAYING SCREEN (1:1 EXAKT SOLL-BILD 1)
  return (
    <HolographicFussballCockpit
      boardId={boardId}
      activeName={activeName}
      is1vs1={is1vs1}
      activePlayer={ballPossession as 1 | 2}
      scoreP1={scoreP1}
      scoreP2={scoreP2}
      targetGoals={targetGoals}
      ballPossession={ballPossession as 1 | 2}
      activeTarget={liveState.activeTarget}
      isFullscreen={isFullscreen}
      onToggleFullscreen={toggleFullscreen}
    />
  );
}
