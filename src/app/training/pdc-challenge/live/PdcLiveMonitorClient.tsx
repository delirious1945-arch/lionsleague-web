'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Maximize2, Minimize2, Target, CheckCircle2 } from 'lucide-react';
import { PdcChallengeLiveState } from '@/app/api/live/pdc-challenge/route';
import HolographicDartboard from '@/components/HolographicDartboard';

interface PdcLiveMonitorProps {
  initialBoardId?: string;
}

export default function PdcLiveMonitorClient({ initialBoardId = '1' }: PdcLiveMonitorProps) {
  const [boardId, setBoardId] = useState<string>(initialBoardId);
  const [liveState, setLiveState] = useState<PdcChallengeLiveState>({
    status: 'idle',
    boardId: initialBoardId,
    currentPart: 1,
    currentVisit: 1,
    totalVisits: 26,
    p1Score: 0,
    p2Score: 0,
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Digital-Uhr
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

  // Vollbild umschalten
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
        bc = new BroadcastChannel(`lions_pdc_challenge_live_sync_${boardId}`);
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
    const storageKey = `lions_pdc_challenge_live_sync_${boardId}`;
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
        const res = await fetch(`/api/live/pdc-challenge?board=${boardId}`, { cache: 'no-store' });
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
  const currentPart = liveState.currentPart || 1;
  const currentVisit = liveState.currentVisit || 1;
  const totalVisits = liveState.totalVisits || 26;
  const p1Score = liveState.p1Score ?? 0;
  const p2Score = liveState.p2Score ?? 0;

  const getPartLabel = () => {
    if (currentPart === 1) return 'TEIL 1 (DOPPEL-RUNDE)';
    if (currentPart === 2) return 'TEIL 2 (BULLSEYE)';
    return 'TEIL 3 (SHANGHAI SCORING)';
  };

  const getTargetLabel = () => {
    if (liveState.currentTarget) return liveState.currentTarget;
    if (currentPart === 1) return 'D20';
    if (currentPart === 2) return 'BULL';
    return '20';
  };

  // STANDBY SCREEN
  if (liveState.status === 'idle') {
    return (
      <div className="relative w-screen h-screen bg-[#040711] text-white flex flex-col justify-between p-6 sm:p-12 overflow-hidden select-none font-sans">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[20%] w-[55vw] h-[55vw] bg-cyan-600/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-[-15%] right-[15%] w-[45vw] h-[45vw] bg-rose-600/10 rounded-full blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:40px_40px] opacity-40" />
        </div>

        <div className="relative z-10 flex items-center justify-between w-full border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-black tracking-wider text-cyan-400 font-mono">
              BOARD {boardId}
            </span>
            <span className="text-xs uppercase px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
              PDC CHALLENGE
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
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 filter drop-shadow-[0_0_50px_rgba(6,182,212,0.5)]">
            <Image src="/logo.png" alt="Lions Weyhausen" fill sizes="260px" className="object-contain" priority />
          </div>

          <div className="space-y-4 max-w-xl">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase drop-shadow-md">
              PDC CHALLENGE · LIVE
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
          <span>57 DARTS · 3 PHASEN · MAX 100 PKT</span>
        </div>
      </div>
    );
  }

  // COMPLETED SCREEN (Nüchternes, analytisches Feedback)
  if (liveState.status === 'completed') {
    return (
      <div className="relative w-screen h-screen bg-[#040711] text-white flex flex-col justify-between p-6 sm:p-10 overflow-hidden select-none font-sans">
        <div className="relative z-10 flex items-center justify-between w-full border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-black tracking-wider text-cyan-400 font-mono">
              BOARD {boardId}
            </span>
            <span className="text-xs uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
              SPIEL BEENDET · PDC CHALLENGE
            </span>
          </div>
          <span className="text-sm sm:text-base font-mono text-slate-400 tracking-widest">{currentTime}</span>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center space-y-6 my-auto max-w-4xl mx-auto w-full">
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400 font-mono">
            LEISTUNGS-ANALYSE
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight text-center">
            {rawP1Name}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full pt-4">
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-2xl text-center space-y-2">
              <span className="text-xs font-mono uppercase text-slate-400">Gesamt-Punkte</span>
              <div className="text-6xl sm:text-7xl font-black font-mono text-emerald-400">
                {p1Score} <span className="text-2xl text-slate-500 font-normal">/ 100</span>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-2xl text-center space-y-2">
              <span className="text-xs font-mono uppercase text-slate-400">Absolvierte Aufnahmen</span>
              <div className="text-6xl sm:text-7xl font-black font-mono text-cyan-400">
                {currentVisit} <span className="text-2xl text-slate-500 font-normal">/ {totalVisits}</span>
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

  // ACTIVE PLAYING SCREEN (Futuristic Glass Cockpit)
  const currentTarget = getTargetLabel();
  const activeName = is1vs1 ? (activePlayer === 1 ? rawP1Name : rawP2Name) : rawP1Name;
  const currentScore = is1vs1 ? (activePlayer === 1 ? p1Score : p2Score) : p1Score;

  return (
    <div className="relative w-screen h-screen bg-[#040711] text-white flex flex-col justify-between p-4 sm:p-8 overflow-hidden select-none font-sans">
      {/* 1. Volumetrische God Rays & Cyber-Gitter */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* God Rays von oben */}
        <div className="absolute -top-32 left-[18%] w-[26vw] h-[130vh] bg-gradient-to-b from-cyan-400/25 via-cyan-500/05 to-transparent rotate-[18deg] blur-2xl opacity-60" />
        <div className="absolute -top-32 right-[18%] w-[26vw] h-[130vh] bg-gradient-to-b from-cyan-400/25 via-cyan-500/05 to-transparent -rotate-[18deg] blur-2xl opacity-60" />
        {/* Ambient Spots */}
        <div className="absolute top-[35%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-cyan-600/15 rounded-full blur-[130px]" />
        {/* HUD Rasterlinien */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:48px_48px] opacity-35" />
      </div>

      {/* 2. Top Header mit zentrierter Glass-Kapsel */}
      <div className="relative z-20 flex items-center justify-between w-full px-2">
        <div className="w-32 hidden sm:block">
          <span className="text-xs font-mono text-slate-400">PDC CHALLENGE</span>
        </div>

        {/* Die zentrierte schwebende Glas-Kapsel */}
        <div className="flex items-center gap-2 sm:gap-3 px-5 py-2 rounded-full bg-slate-900/60 backdrop-blur-2xl border border-cyan-400/40 shadow-[0_0_25px_rgba(6,182,212,0.3)]">
          <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-cyan-300">
            BOARD {boardId}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-xs sm:text-sm font-black tracking-wider text-white uppercase">
            LIONS WEYHAUSEN
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-amber-300">
            {getPartLabel()}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm font-mono text-slate-400 tracking-widest">{currentTime}</span>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3. Zentrales Cockpit: Links Flügel (Spieler), Mitte (3D-Radar-Dartboard), Rechts Flügel (Punkte) */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-2 sm:px-6">
        <div className="relative flex items-center justify-center w-full max-w-6xl">
          
          {/* LINKER FLÜGEL: Spieler-Panel */}
          <div className="relative z-10 w-[280px] sm:w-[320px] md:w-[360px] h-[210px] sm:h-[240px] rounded-3xl bg-slate-900/40 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.2)] p-6 sm:p-7 flex flex-col justify-between -mr-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                <span className="text-xl">🦁</span>
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300 font-mono">
                {is1vs1 ? `SPIELER ${activePlayer} · AM OCHE` : 'SPIELER AM OCHE'}
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-none drop-shadow-md">
                {activeName}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 font-mono text-xs font-black tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>🎯 AM WURF</span>
              </span>
            </div>
          </div>

          {/* ZENTRUM: DETAILREICHES HOLOGRAFISCHES TURNIER-DARTBOARD */}
          <HolographicDartboard
            target={currentTarget}
            badgeLabel="ZIELFELD"
            className="relative z-20 w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] md:w-[450px] md:h-[450px] shrink-0"
          />

          {/* RECHTER FLÜGEL: Punkte- & Aufnahmen-Panel */}
          <div className="relative z-10 w-[280px] sm:w-[320px] md:w-[360px] h-[210px] sm:h-[240px] rounded-3xl bg-slate-900/40 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.2)] p-6 sm:p-7 flex flex-col justify-between -ml-8">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 font-mono">
                PUNKTESTAND
              </span>
              <span className="text-xs font-mono text-slate-400">
                MAX 100 PKT
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-5xl sm:text-6xl lg:text-7xl font-black font-mono text-[#00ff88] tracking-tight drop-shadow-[0_0_25px_rgba(0,255,136,0.6)]">
                {currentScore}
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-amber-300">
                / 100
              </span>
            </div>

            {/* Runde / Aufnahme Indicator */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-xs font-mono text-slate-300">
                Aufnahme <strong className="text-white font-bold">{currentVisit}</strong>/{totalVisits}
              </span>
              <div className="w-16 h-2 bg-slate-950 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((currentVisit / totalVisits) * 100))}%` }}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Bottom Bar */}
      <div className="relative z-20 flex items-center justify-between w-full px-2 text-xs text-slate-400 font-mono">
        <span>LIONS WEYHAUSEN · LIVE TELEMETRY</span>
        <span>BOARD {boardId} · PDC CHALLENGE</span>
      </div>
    </div>
  );
}
