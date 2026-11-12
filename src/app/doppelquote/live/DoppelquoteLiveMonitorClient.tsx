'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Maximize2, Minimize2, Tv, Sparkles, Trophy } from 'lucide-react';

export interface DoppelquoteLiveState {
  status: 'idle' | 'playing' | 'completed';
  gameMode?: 'solo' | '1vs1';
  p1Name?: string;
  p2Name?: string;
  activePlayer?: 1 | 2;
  currentTarget?: string;
  currentTargetIndex?: number;
  currentRound?: number;
  p1Stats?: { hits: number; thrown: number; quote: number };
  p2Stats?: { hits: number; thrown: number; quote: number };
  scoresP1?: Record<string, (number | null)[]>;
  scoresP2?: Record<string, (number | null)[]>;
  updatedAt?: number;
}

const TARGETS = ['D20', 'D10', 'D16', 'D8', 'D4'];

const TARGET_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  D20: { bg: 'bg-rose-500/15', border: 'border-rose-500/50', text: 'text-rose-300', glow: 'shadow-[0_0_35px_rgba(244,63,94,0.35)]' },
  D10: { bg: 'bg-blue-500/15', border: 'border-blue-500/50', text: 'text-blue-300', glow: 'shadow-[0_0_35px_rgba(59,130,246,0.35)]' },
  D16: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/50', text: 'text-emerald-300', glow: 'shadow-[0_0_35px_rgba(16,185,129,0.35)]' },
  D8:  { bg: 'bg-amber-500/15', border: 'border-amber-500/50', text: 'text-amber-300', glow: 'shadow-[0_0_35px_rgba(245,158,11,0.35)]' },
  D4:  { bg: 'bg-purple-500/15', border: 'border-purple-500/50', text: 'text-purple-300', glow: 'shadow-[0_0_35px_rgba(168,85,247,0.35)]' },
};

export default function DoppelquoteLiveMonitorClient() {
  const [liveState, setLiveState] = useState<DoppelquoteLiveState>({ status: 'idle' });
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

  // Vollbild-Toggle
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
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // 1. BroadcastChannel Listener (0ms Sync am selben Gerät / DeX)
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('lions_doppelquote_live_sync');
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
  }, []);

  // 2. localStorage Event Listener (Sync zwischen Browser-Tabs)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'lions_doppelquote_live_sync' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setLiveState(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // Initialen Wert aus localStorage laden
    try {
      const raw = localStorage.getItem('lions_doppelquote_live_sync');
      if (raw) {
        setLiveState(JSON.parse(raw));
      }
    } catch (err) {}

    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // 3. API Polling (für externe Smart-TVs / separate Geräte alle 1.5s)
  useEffect(() => {
    const pollApi = async () => {
      try {
        const res = await fetch('/api/live/doppelquote', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.updatedAt) {
            setLiveState((prev) => {
              if (!prev.updatedAt || data.updatedAt > prev.updatedAt) {
                return data;
              }
              return prev;
            });
          }
        }
      } catch (e) {}
    };

    pollApi();
    const timer = setInterval(pollApi, 1500);
    return () => clearInterval(timer);
  }, []);

  const curTarget = liveState.currentTarget || 'D20';
  const targetColor = TARGET_COLORS[curTarget] || TARGET_COLORS.D20;
  const is1vs1 = liveState.gameMode === '1vs1';
  const p1Name = liveState.p1Name || 'Spieler 1';
  const p2Name = liveState.p2Name || 'Spieler 2';
  const p1Hits = liveState.p1Stats?.hits ?? 0;
  const p1Thrown = liveState.p1Stats?.thrown ?? 0;
  const p1Quote = liveState.p1Stats?.quote ?? 0;
  const p2Hits = liveState.p2Stats?.hits ?? 0;
  const p2Thrown = liveState.p2Stats?.thrown ?? 0;
  const p2Quote = liveState.p2Stats?.quote ?? 0;
  const activePlayer = liveState.activePlayer || 1;

  // =========================================================================
  // PHASE 1: VOR DEM SPIELSTART (STANDBY / WARTERAUM)
  // =========================================================================
  if (liveState.status === 'idle') {
    return (
      <div className="w-screen h-screen min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
        {/* Ambient Glows im Hintergrund */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-10 right-10 flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Vollbild umschalten"
          >
            {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </button>
        </div>

        {/* Zentriertes Vereinslogo & dezenter Status */}
        <div className="text-center space-y-6 relative z-10 max-w-xl mx-auto flex flex-col items-center">
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 drop-shadow-[0_0_50px_rgba(245,158,11,0.3)] animate-pulse">
            <Image
              src="/logo.png"
              alt="Lions Weyhausen"
              fill
              className="object-contain"
              priority
            />
          </div>

          <div className="space-y-2 pt-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-widest uppercase text-zinc-300">
              Warte auf Spielbeginn...
            </h2>
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-amber-400/80">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Oche bereit • TV-Board verbunden</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PHASE 3: NACH SPIELABSCHLUSS (TV-SIEGEREHRUNG)
  // =========================================================================
  if (liveState.status === 'completed') {
    const isP1Winner = !is1vs1 || p1Hits >= p2Hits;
    const winnerName = isP1Winner ? p1Name : p2Name;
    const winnerQuote = isP1Winner ? p1Quote : p2Quote;
    const winnerHits = isP1Winner ? p1Hits : p2Hits;

    return (
      <div className="w-screen h-screen min-h-screen bg-gradient-to-b from-zinc-950 via-[#0a1220] to-zinc-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/15 rounded-full blur-[160px] pointer-events-none" />

        <div className="text-center space-y-6 relative z-10 max-w-4xl mx-auto">
          <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-5xl sm:text-7xl shadow-2xl shadow-amber-500/30 animate-bounce">
            🏆
          </div>

          <div className="space-y-2">
            <span className="text-sm sm:text-base font-black tracking-widest uppercase text-amber-400 block">
              Match beendet • Siegerehrung
            </span>
            <h1 className="text-4xl sm:text-7xl font-black text-white tracking-tight">
              {is1vs1 ? `${winnerName} gewinnt!` : `Starke Leistung, ${p1Name}!`}
            </h1>
            <p className="text-xl sm:text-2xl text-slate-300 font-mono">
              Endergebnis: <strong className="text-amber-400">{winnerHits} Treffer</strong> ({winnerQuote.toFixed(1)}%)
            </p>
          </div>

          {/* Gegenüberstellung bei 1vs1 */}
          {is1vs1 && (
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto pt-4 text-center">
              <div className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10">
                <span className="text-lg font-black text-white block">{p1Name}</span>
                <span className="text-3xl font-black font-mono text-amber-400 mt-1 block">{p1Quote.toFixed(1)}%</span>
                <span className="text-xs text-zinc-400">{p1Hits} Treffer / 150 Darts</span>
              </div>
              <div className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10">
                <span className="text-lg font-black text-white block">{p2Name}</span>
                <span className="text-3xl font-black font-mono text-amber-400 mt-1 block">{p2Quote.toFixed(1)}%</span>
                <span className="text-xs text-zinc-400">{p2Hits} Treffer / 150 Darts</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // PHASE 2: WÄHREND DES SPIELS (LIVE MATCH – NEED-TO-KNOW AUS 5 METERN)
  // =========================================================================
  return (
    <div className="w-screen h-screen min-h-screen bg-zinc-950 text-white flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden select-none">
      {/* Ambient Hintergrund-Licht passend zum aktuellen Zielfeld */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] ${targetColor.bg} rounded-full blur-[150px] pointer-events-none opacity-40`} />

      {/* 1. TOP HEADER (Zuschauer-Status & Digitaluhr) */}
      <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Image src="/logo.png" alt="Lions" width={28} height={28} className="object-contain" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-black tracking-wide text-white flex items-center gap-2">
              <span>Checkout Battle</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold uppercase">
                Live
              </span>
            </h1>
            <p className="text-xs text-zinc-400 font-mono">
              Offizielles 150 Darts Doppel-Training
            </p>
          </div>
        </div>

        {/* Mitte: Aufnahme-Fortschritt */}
        <div className="text-center">
          <div className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400">
            Aufnahme {liveState.currentRound ?? 1} von 10
          </div>
          <div className="text-[11px] text-zinc-400 font-mono">
            Zielfeld {(liveState.currentTargetIndex ?? 0) + 1} von 5 ({curTarget})
          </div>
        </div>

        {/* Rechts: Live Badge & Uhrzeit */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-black">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span>LIVE AM OCHE</span>
          </div>
          <span className="text-base font-mono font-bold text-zinc-300 hidden sm:inline">
            {currentTime}
          </span>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Vollbild"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* 2. MAIN TV-STAGE (Scoreboard & Hero Zielfeld) */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-auto items-center relative z-10 max-w-7xl mx-auto w-full">
        {/* SPIELER 1 (HEIMTEAM) */}
        <div
          className={`p-6 sm:p-8 rounded-3xl border-2 transition-all ${
            activePlayer === 1
              ? 'bg-zinc-900 border-emerald-400 shadow-2xl shadow-emerald-500/20 scale-[1.02]'
              : 'bg-zinc-900/60 border-white/10 opacity-75'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
              {is1vs1 ? 'Spieler 1 (Heim)' : 'Spieler'}
            </span>
            {activePlayer === 1 && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-black uppercase flex items-center gap-1.5 animate-pulse">
                <span>🎯</span>
                <span>Am Wurf</span>
              </span>
            )}
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white truncate tracking-tight">
            {p1Name}
          </h2>

          <div className="mt-4 pt-4 border-t border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
              Doppelquote
            </span>
            <div className="text-5xl sm:text-7xl font-black font-mono text-amber-400 mt-1">
              {p1Quote.toFixed(1)}%
            </div>
            <div className="text-sm sm:text-base font-bold text-zinc-300 mt-1">
              {p1Hits} Treffer / {p1Thrown} Darts
            </div>
          </div>
        </div>

        {/* MITTE: RIESIGES ZIELFELD & AUFNAHME-HERO */}
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-zinc-400">
            Aktuelles Doppel
          </span>

          {/* RIESIGE ZIELFELD-KACHEL */}
          <div
            className={`w-44 h-44 sm:w-56 sm:h-56 rounded-3xl border-4 ${targetColor.border} ${targetColor.bg} ${targetColor.glow} flex flex-col items-center justify-center transition-all duration-300`}
          >
            <span className={`text-6xl sm:text-8xl font-black font-mono ${targetColor.text} tracking-tighter`}>
              {curTarget}
            </span>
            <span className="text-xs uppercase font-bold text-zinc-300 mt-1">
              10 Runden auf {curTarget}
            </span>
          </div>

          <div className="text-xs sm:text-sm text-zinc-400 font-mono">
            Ziel {TARGETS.indexOf(curTarget) + 1} von 5 ({TARGETS.join(' • ')})
          </div>
        </div>

        {/* SPIELER 2 (BEI 1VS1) ODER ZIEL-ÜBERSICHT (BEI SOLO) */}
        {is1vs1 ? (
          <div
            className={`p-6 sm:p-8 rounded-3xl border-2 transition-all ${
              activePlayer === 2
                ? 'bg-zinc-900 border-emerald-400 shadow-2xl shadow-emerald-500/20 scale-[1.02]'
                : 'bg-zinc-900/60 border-white/10 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
                Spieler 2 (Gast)
              </span>
              {activePlayer === 2 && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-black uppercase flex items-center gap-1.5 animate-pulse">
                  <span>🎯</span>
                  <span>Am Wurf</span>
                </span>
              )}
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white truncate tracking-tight">
              {p2Name}
            </h2>

            <div className="mt-4 pt-4 border-t border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                Doppelquote
              </span>
              <div className="text-5xl sm:text-7xl font-black font-mono text-amber-400 mt-1">
                {p2Quote.toFixed(1)}%
              </div>
              <div className="text-sm sm:text-base font-bold text-zinc-300 mt-1">
                {p2Hits} Treffer / {p2Thrown} Darts
              </div>
            </div>
          </div>
        ) : (
          /* SOLO-MODUS: ZIEL-ÜBERSICHT ALLER 5 DOPPEL */
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-white/10 space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400 block">
              Trainings-Fortschritt (5 Doppel)
            </span>
            <div className="space-y-2">
              {TARGETS.map((t, idx) => {
                const isCur = t === curTarget;
                const scores = liveState.scoresP1?.[t] || [];
                const hitsOnT = scores.filter((s) => s !== null).reduce((a, b) => (a ?? 0) + (b ?? 0), 0) ?? 0;
                const thrownOnT = scores.filter((s) => s !== null).length * 3;
                const qOnT = thrownOnT > 0 ? (hitsOnT / thrownOnT) * 100 : 0;

                return (
                  <div
                    key={t}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-sm font-mono ${
                      isCur
                        ? 'bg-emerald-500/15 border-emerald-400 text-white font-black'
                        : 'bg-zinc-950 border-white/5 text-zinc-400'
                    }`}
                  >
                    <span className="font-bold">{t}</span>
                    <span className="text-xs">{thrownOnT > 0 ? `${hitsOnT} / ${thrownOnT} (${qOnT.toFixed(0)}%)` : 'Offen'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* 3. FOOTER (Keine Buttons, reiner Vereins- und Disziplin-Hinweis) */}
      <footer className="flex items-center justify-between text-xs text-zinc-500 border-t border-white/5 pt-3 relative z-10 font-mono">
        <span>Lions Weyhausen • Offizielle Doppelquote-Arena</span>
        <span>Autonome Realtime-Synchronisation aktiv</span>
      </footer>
    </div>
  );
}
