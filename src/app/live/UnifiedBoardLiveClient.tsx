'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Maximize2, Minimize2 } from 'lucide-react';
import { UnifiedLiveState } from '@/app/api/live/board/route';
import HolographicStellenCheckenCockpit from '@/components/HolographicStellenCheckenCockpit';
import HolographicFussballCockpit from '@/components/HolographicFussballCockpit';
import HolographicDartboard from '@/components/HolographicDartboard';
import HolographicPdcChallengeCockpit from '@/components/HolographicPdcChallengeCockpit';

interface UnifiedBoardLiveProps {
  initialBoardId?: string;
}

const TARGET_ANGLES: Record<string, { angle: number; color: string; label: string }> = {
  D20: { angle: 0, color: '#ff3366', label: 'Tops · Doppel 20' },
  D10: { angle: 108, color: '#ff3366', label: 'Halb-Tops · Doppel 10' },
  D16: { angle: 234, color: '#ff3366', label: 'Favorit · Doppel 16' },
  D8: { angle: 252, color: '#ff3366', label: 'Halb-16 · Doppel 8' },
  D4: { angle: 54, color: '#ff3366', label: 'Finish-Doppel · Doppel 4' },
};

export default function UnifiedBoardLiveClient({ initialBoardId = '1' }: UnifiedBoardLiveProps) {
  const [boardId, setBoardId] = useState<string>(initialBoardId);
  const [liveState, setLiveState] = useState<UnifiedLiveState>({
    boardId: initialBoardId,
    status: 'idle',
    gameType: 'idle',
    updatedAt: 0,
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

  // 1. BroadcastChannel Listener (für 0ms Latenz am selben Host)
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel(`lions_board_live_sync_${boardId}`);
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
    const storageKey = `lions_board_live_sync_${boardId}`;
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

  // 3. API Polling alle 1.0s für externe Smart-TVs / Fire TV Sticks mit Cache-Busting
  useEffect(() => {
    const pollApi = async () => {
      try {
        const res = await fetch(`/api/live/board?board=${boardId}&_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setLiveState((prev) => {
              // 1. Wenn ein Spiel läuft: IMMER sofort umschalten!
              if (data.status === 'playing' || (data.gameType && data.gameType !== 'idle' && data.status !== 'idle')) {
                return data;
              }
              // 2. Wenn das Spiel beendet ist:
              if (data.status === 'completed') {
                return data;
              }
              // 3. Wenn Standby:
              if (data.status === 'idle') {
                return data;
              }
              return data;
            });
          }
        }
      } catch (e) {}
    };

    pollApi();
    const interval = setInterval(pollApi, 1000);
    return () => clearInterval(interval);
  }, [boardId]);

  const p1Name = (liveState.p1Name || 'Sebastian Kirsch').trim();
  const p2Name = (liveState.p2Name || 'Gastspieler').trim();
  const is1vs1 = liveState.gameMode === '1vs1';
  const activePlayer = liveState.activePlayer || 1;
  const activeName = is1vs1 ? (activePlayer === 1 ? p1Name : p2Name) : p1Name;

  // =========================================================================
  // 1. STANDBY SCREEN (Wenn kein Spiel aktiv ist)
  // =========================================================================
  if (liveState.status === 'idle' || liveState.gameType === 'idle') {
    return (
      <div className="relative w-screen h-screen bg-[#040711] text-white flex flex-col justify-between p-6 sm:p-12 overflow-hidden select-none font-sans">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[20%] w-[55vw] h-[55vw] bg-cyan-600/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-[-15%] right-[15%] w-[45vw] h-[45vw] bg-emerald-600/10 rounded-full blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:40px_40px] opacity-40" />
        </div>

        <div className="relative z-10 flex items-center justify-between w-full border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-black tracking-wider text-cyan-400 font-mono">
              BOARD {boardId}
            </span>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-6 my-auto">
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 filter drop-shadow-[0_0_50px_rgba(6,182,212,0.5)]">
            <Image src="/logo.png" alt="Lions Weyhausen" fill sizes="260px" className="object-contain" priority />
          </div>

          <div className="space-y-3 max-w-xl">
            <p className="text-lg sm:text-2xl text-cyan-300 font-mono tracking-widest animate-pulse font-bold">
              Warte auf Spielbeginn am Board {boardId}...
            </p>
            <span className="text-xs text-slate-400 block pt-1">
              Starte einfach ein beliebiges Spiel am Tablet. Der Bildschirm schaltet automatisch um.
            </span>
          </div>

          <div className="flex items-center gap-2 pt-2">
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
          <span>AUTO-SWITCHING LIVE BOARD</span>
          <span>CHECKOUT BATTLE · PDC CHALLENGE · FUßBALL · STELLEN & CHECKEN</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. SPIEL: CHECKOUT BATTLE (DOPPELQUOTE)
  // =========================================================================
  if (liveState.gameType === 'doppelquote') {
    const curTarget = liveState.currentTarget || 'D20';
    const targetInfo = TARGET_ANGLES[curTarget] || { angle: 0, color: '#ff3366', label: curTarget };
    const p1Quote = liveState.p1Stats?.quote ?? 0;
    const p2Quote = liveState.p2Stats?.quote ?? 0;
    const curQuote = is1vs1 ? (activePlayer === 1 ? p1Quote : p2Quote) : p1Quote;

    return (
      <div className="relative w-screen h-screen bg-[#040711] text-white flex flex-col justify-between p-4 sm:p-8 overflow-hidden select-none font-sans">
        {/* God Rays */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-[18%] w-[26vw] h-[130vh] bg-gradient-to-b from-cyan-400/25 via-cyan-500/05 to-transparent rotate-[18deg] blur-2xl opacity-60" />
          <div className="absolute -top-32 right-[18%] w-[26vw] h-[130vh] bg-gradient-to-b from-cyan-400/25 via-cyan-500/05 to-transparent -rotate-[18deg] blur-2xl opacity-60" />
          <div className="absolute top-[35%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-cyan-600/15 rounded-full blur-[130px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:48px_48px] opacity-35" />
        </div>

        {/* Top Header */}
        <div className="relative z-20 flex items-center justify-between w-full px-2">
          <div className="w-32 hidden sm:block">
            <span className="text-xs font-mono text-slate-400">CHECKOUT BATTLE</span>
          </div>
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
              AUFNAHME {liveState.currentRound || 1}/10
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

        {/* Zentrales Cockpit */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-2 sm:px-6">
          <div className="relative flex items-center justify-center w-full max-w-6xl">
            {/* Linker Flügel */}
            <div className="relative z-10 w-[280px] sm:w-[320px] md:w-[360px] h-[210px] sm:h-[240px] rounded-3xl bg-slate-900/40 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.2)] p-6 sm:p-7 flex flex-col justify-between -mr-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                  <span className="text-xl">🦁</span>
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300 font-mono">
                  {is1vs1 ? `SPIELER ${activePlayer} · AM OCHE` : 'SPIELER AM OCHE'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-none drop-shadow-md">
                {activeName}
              </h2>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 font-mono text-xs font-black tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>🎯 AM WURF</span>
                </span>
              </div>
            </div>

            {/* Zentrum: Detailreiches Holografisches Turnier-Dartboard */}
            <HolographicDartboard
              target={curTarget}
              className="relative z-20 w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] md:w-[450px] md:h-[450px] shrink-0"
            />

            {/* Rechter Flügel */}
            <div className="relative z-10 w-[280px] sm:w-[320px] md:w-[360px] h-[210px] sm:h-[240px] rounded-3xl bg-slate-900/40 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.2)] p-6 sm:p-7 flex flex-col justify-between -ml-8">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 font-mono">DOPPELQUOTE</span>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl sm:text-6xl lg:text-7xl font-black font-mono text-[#00ff88] tracking-tight drop-shadow-[0_0_25px_rgba(0,255,136,0.6)]">
                  {curQuote.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-amber-400/40 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
            </div>
          </div>
        </div>

        {/* Bottom Bar: Sauber ohne Corner-Clutter */}
        <div className="relative z-20 h-4" />
      </div>
    );
  }

  // =========================================================================
  // 3. SPIEL: PDC CHALLENGE
  // =========================================================================
  if (liveState.gameType === 'pdc_challenge') {
    const curTarget = liveState.currentTarget || 'D20';
    const curScore = is1vs1 ? (activePlayer === 1 ? liveState.scoreP1 : liveState.scoreP2) ?? 0 : liveState.scoreP1 ?? 0;
    const curVisit = liveState.currentVisit || 1;
    const totalVisits = liveState.totalVisits || 26;

    return (
      <HolographicPdcChallengeCockpit
        boardId={boardId}
        activeName={activeName}
        is1vs1={is1vs1}
        activePlayer={activePlayer}
        currentTarget={curTarget}
        currentScore={curScore}
        currentVisit={curVisit}
        totalVisits={totalVisits}
        currentTime={currentTime}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    );
  }

  // =========================================================================
  // 4. SPIEL: FUßBALL DARTS (1:1 EXAKT SOLL-BILD 1)
  // =========================================================================
  if (liveState.gameType === 'fussball') {
    const scoreP1 = liveState.scoreP1 ?? 0;
    const scoreP2 = liveState.scoreP2 ?? 0;
    const targetGoals = liveState.targetGoals ?? 5;
    const ballPossession = liveState.ballPossession || 1;
    const activeFootballName = ballPossession === 1 ? p1Name : p2Name;
    const isFussball1vs1 = liveState.gameMode === '1vs1' || liveState.gameMode === '1vsComputer' || liveState.gameMode === 'bot' || (liveState.gameMode !== 'solo' && !!liveState.p2Name);

    return (
      <HolographicFussballCockpit
        boardId={boardId}
        p1Name={p1Name}
        p2Name={p2Name}
        activeName={activeFootballName}
        is1vs1={isFussball1vs1}
        activePlayer={activePlayer}
        scoreP1={scoreP1}
        scoreP2={scoreP2}
        targetGoals={targetGoals}
        ballPossession={ballPossession as 1 | 2}
        fussballStats={liveState.fussballStats || liveState.fussballData?.stats}
        activeTarget={liveState.currentTarget}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    );
  }

  // =========================================================================
  // 5. SPIEL: STELLEN & CHECKEN (1:1 EXAKT SOLL-BILD)
  // =========================================================================
  if (liveState.gameType === 'stellen_checken') {
    const curNum = liveState.currentNumber ?? 64;
    const curRoute = liveState.recommendedRoute || 'T16 ➔ D8';
    const curChecks = is1vs1 ? (activePlayer === 1 ? liveState.p1Checks : liveState.p2Checks) ?? 0 : liveState.p1Checks ?? 0;
    const curVisit = liveState.currentVisit ?? 1;

    return (
      <HolographicStellenCheckenCockpit
        boardId={boardId}
        activeName={activeName}
        is1vs1={is1vs1}
        activePlayer={activePlayer}
        currentVisit={curVisit}
        totalVisits={15}
        currentNumber={curNum}
        recommendedRoute={curRoute}
        checksCount={curChecks}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    );
  }

  // Fallback
  return null;
}
