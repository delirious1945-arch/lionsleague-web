'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Maximize2, Minimize2 } from 'lucide-react';

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
  boardId?: string;
  updatedAt?: number;
}

const TARGETS = ['D20', 'D10', 'D16', 'D8', 'D4'];

const TARGET_THEMES: Record<string, { ring: string; glow: string; text: string; bgGlow: string; label: string }> = {
  D20: {
    ring: 'border-rose-500/70 shadow-[0_0_60px_rgba(244,63,94,0.45)]',
    glow: 'from-rose-500/20 to-transparent',
    text: 'text-rose-300 drop-shadow-[0_0_25px_rgba(244,63,94,0.8)]',
    bgGlow: 'bg-rose-500/[0.08]',
    label: 'Tops · Doppel 20',
  },
  D10: {
    ring: 'border-cyan-400/70 shadow-[0_0_60px_rgba(6,182,212,0.45)]',
    glow: 'from-cyan-500/20 to-transparent',
    text: 'text-cyan-300 drop-shadow-[0_0_25px_rgba(6,182,212,0.8)]',
    bgGlow: 'bg-cyan-500/[0.08]',
    label: 'Halb-Tops · Doppel 10',
  },
  D16: {
    ring: 'border-emerald-400/70 shadow-[0_0_60px_rgba(16,185,129,0.45)]',
    glow: 'from-emerald-500/20 to-transparent',
    text: 'text-emerald-300 drop-shadow-[0_0_25px_rgba(16,185,129,0.8)]',
    bgGlow: 'bg-emerald-500/[0.08]',
    label: 'Favorit · Doppel 16',
  },
  D8: {
    ring: 'border-amber-400/70 shadow-[0_0_60px_rgba(245,158,11,0.45)]',
    glow: 'from-amber-500/20 to-transparent',
    text: 'text-amber-300 drop-shadow-[0_0_25px_rgba(245,158,11,0.8)]',
    bgGlow: 'bg-amber-500/[0.08]',
    label: 'Halb-16 · Doppel 8',
  },
  D4: {
    ring: 'border-purple-400/70 shadow-[0_0_60px_rgba(168,85,247,0.45)]',
    glow: 'from-purple-500/20 to-transparent',
    text: 'text-purple-300 drop-shadow-[0_0_25px_rgba(168,85,247,0.8)]',
    bgGlow: 'bg-purple-500/[0.08]',
    label: 'Finish-Doppel · Doppel 4',
  },
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

  // 1. BroadcastChannel (0ms Sync am selben Gerät / DeX)
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

    try {
      const raw = localStorage.getItem('lions_doppelquote_live_sync');
      if (raw) {
        setLiveState(JSON.parse(raw));
      }
    } catch (err) {}

    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // 3. API Polling (für Fire TV Stick / externe Displays alle 1.2s)
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
    const timer = setInterval(pollApi, 1200);
    return () => clearInterval(timer);
  }, []);

  const curTarget = liveState.currentTarget || 'D20';
  const theme = TARGET_THEMES[curTarget] || TARGET_THEMES.D20;
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
  const currentRound = liveState.currentRound ?? 1;
  const currentTargetIdx = liveState.currentTargetIndex ?? 0;

  // Hilfsfunktion: Detailwerte pro Doppel
  const calcTargetStats = (scores?: Record<string, (number | null)[]>) => {
    return TARGETS.map((t) => {
      const sc = scores?.[t] || [];
      const hits = sc.filter((s) => s !== null).reduce((a, b) => (a ?? 0) + (b ?? 0), 0) ?? 0;
      const thrown = sc.filter((s) => s !== null).length * 3;
      const quote = thrown > 0 ? (hits / thrown) * 100 : 0;
      return { target: t, hits, thrown, quote };
    });
  };

  const p1TargetStats = calcTargetStats(liveState.scoresP1);
  const p2TargetStats = calcTargetStats(liveState.scoresP2);

  // Stärkstes & schwächstes Doppel für P1
  const validP1Stats = p1TargetStats.filter((s) => s.thrown > 0);
  const bestP1Target = validP1Stats.length > 0 ? [...validP1Stats].sort((a, b) => b.quote - a.quote)[0] : null;
  const weakestP1Target = validP1Stats.length > 0 ? [...validP1Stats].sort((a, b) => a.quote - b.quote)[0] : null;

  // =========================================================================
  // PHASE 1: STANDBY / RUHEZUSTAND (Edles Lions Wappen mit Cyber-Glow)
  // =========================================================================
  if (liveState.status === 'idle') {
    return (
      <div className="w-screen h-screen min-h-screen bg-[#040711] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none font-sans">
        <div className="absolute top-[20%] left-[25%] w-[500px] h-[500px] bg-cyan-500/[0.07] rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[25%] w-[500px] h-[500px] bg-amber-500/[0.06] rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(4,7,17,0.85)_100%)] pointer-events-none" />

        <div className="absolute top-8 right-8 z-20">
          <button
            onClick={toggleFullscreen}
            className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer backdrop-blur-xl"
            title="Vollbild umschalten"
          >
            {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </button>
        </div>

        <div className="text-center space-y-7 relative z-10 max-w-xl mx-auto flex flex-col items-center">
          <div className="relative w-52 h-52 sm:w-72 sm:h-72 drop-shadow-[0_0_60px_rgba(6,182,212,0.35)] animate-pulse">
            <Image
              src="/logo.png"
              alt="Lions Weyhausen"
              fill
              className="object-contain"
              priority
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-mono text-xs font-bold tracking-wider">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>BOARD 1 · BEREIT AM OCHE</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
              Warte auf Spielbeginn...
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-mono">
              Wähle am Tablet dein Spiel und drücke auf „Spiel starten“
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PHASE 3: NÜCHTERNES FEEDBACK BEI SPIELENDE (KEIN POKAL, KEINE TOP-KACHEL)
  // =========================================================================
  if (liveState.status === 'completed') {
    return (
      <div className="w-screen h-screen min-h-screen bg-[#040711] text-white flex flex-col justify-between p-5 sm:p-8 relative overflow-hidden select-none font-sans">
        {/* Subtile Hintergrund-Lichter */}
        <div className="absolute top-1/4 left-1/3 w-[650px] h-[650px] bg-emerald-500/[0.05] rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-[650px] h-[650px] bg-cyan-500/[0.05] rounded-full blur-[160px] pointer-events-none" />

        {/* Schlanker Header ohne klobige Box */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 relative z-20">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              <Image src="/logo.png" alt="Lions" fill className="object-contain" priority />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-widest text-white uppercase font-mono">
                Trainings-Auswertung · Checkout Battle
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">
                150 Darts · 5 Doppel (D20, D10, D16, D8, D4)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-slate-400">
              {currentTime}
            </span>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Vollbild"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Haupt-Feedback-Bereich (Nüchtern & Analytisch) */}
        <main className="my-auto max-w-7xl mx-auto w-full relative z-10 py-4">
          {is1vs1 ? (
            /* =============================================================== */
            /* 1VS1 VERGLEICHENDE AUSWERTUNG */
            /* =============================================================== */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SPIELER 1 */}
              <div className="rounded-3xl p-6 sm:p-8 bg-white/[0.025] backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] space-y-5">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                    {p1Name}
                  </h2>
                  <span className="text-xs font-mono text-slate-400 uppercase">Spieler 1</span>
                </div>

                <div className="flex items-baseline gap-4">
                  <div className="text-5xl sm:text-6xl font-black font-mono text-emerald-400 tracking-tight">
                    {p1Quote.toFixed(1)}%
                  </div>
                  <div className="text-sm font-mono text-slate-300 font-semibold">
                    {p1Hits} Treffer / {p1Thrown} Darts
                  </div>
                </div>

                {/* Doppel-Aufschlüsselung */}
                <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                  <span className="text-[11px] font-mono uppercase text-slate-400 font-bold block">
                    Aufschlüsselung nach Doppeln
                  </span>
                  <div className="grid grid-cols-5 gap-2 text-center font-mono text-xs">
                    {p1TargetStats.map((st) => (
                      <div key={st.target} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <span className="font-black text-white block text-sm">{st.target}</span>
                        <span className="text-emerald-400 font-bold block mt-1">{st.quote.toFixed(0)}%</span>
                        <span className="text-[10px] text-slate-500 block">{st.hits}/30</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SPIELER 2 */}
              <div className="rounded-3xl p-6 sm:p-8 bg-white/[0.025] backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] space-y-5">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                    {p2Name}
                  </h2>
                  <span className="text-xs font-mono text-slate-400 uppercase">Spieler 2</span>
                </div>

                <div className="flex items-baseline gap-4">
                  <div className="text-5xl sm:text-6xl font-black font-mono text-emerald-400 tracking-tight">
                    {p2Quote.toFixed(1)}%
                  </div>
                  <div className="text-sm font-mono text-slate-300 font-semibold">
                    {p2Hits} Treffer / {p2Thrown} Darts
                  </div>
                </div>

                {/* Doppel-Aufschlüsselung */}
                <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                  <span className="text-[11px] font-mono uppercase text-slate-400 font-bold block">
                    Aufschlüsselung nach Doppeln
                  </span>
                  <div className="grid grid-cols-5 gap-2 text-center font-mono text-xs">
                    {p2TargetStats.map((st) => (
                      <div key={st.target} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <span className="font-black text-white block text-sm">{st.target}</span>
                        <span className="text-emerald-400 font-bold block mt-1">{st.quote.toFixed(0)}%</span>
                        <span className="text-[10px] text-slate-500 block">{st.hits}/30</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* =============================================================== */
            /* SOLO-TRAINING NÜCHTERNES ANALYTIK-FEEDBACK */
            /* =============================================================== */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* LINKE SPALTE: GESAMTERGEBNIS & WERFER */}
              <div className="lg:col-span-5 rounded-3xl p-7 sm:p-9 bg-white/[0.025] backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase text-slate-400 font-bold block">
                    Werfer am Oche
                  </span>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mt-1">
                    {p1Name}
                  </h2>
                </div>

                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block">
                    Gesamt-Doppelquote
                  </span>
                  <div className="text-6xl sm:text-7xl font-black font-mono text-emerald-400 mt-1 tracking-tight drop-shadow-[0_0_30px_rgba(16,185,129,0.35)]">
                    {p1Quote.toFixed(1)}%
                  </div>
                  <div className="text-base font-mono text-slate-300 font-semibold mt-2">
                    {p1Hits} Treffer / {p1Thrown} Darts
                  </div>
                </div>

                {/* Nüchternes Kurz-Fazit */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/[0.08] text-xs font-mono">
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Stärkstes Feld</span>
                    <span className="text-emerald-300 font-black text-base mt-0.5 block">
                      {bestP1Target ? `${bestP1Target.target} (${bestP1Target.quote.toFixed(0)}%)` : '–'}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Fokusbereich</span>
                    <span className="text-amber-300 font-black text-base mt-0.5 block">
                      {weakestP1Target ? `${weakestP1Target.target} (${weakestP1Target.quote.toFixed(0)}%)` : '–'}
                    </span>
                  </div>
                </div>
              </div>

              {/* RECHTE SPALTE: DETAILLIERTE MATRIX ALLER 5 DOPPEL */}
              <div className="lg:col-span-7 rounded-3xl p-7 sm:p-9 bg-white/[0.025] backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] flex flex-col justify-between space-y-4">
                <span className="text-xs font-mono uppercase text-slate-400 font-bold block">
                  Detail-Statistik aller 5 Doppel (je 10 Aufnahmen / 30 Darts)
                </span>

                <div className="space-y-3">
                  {p1TargetStats.map((st) => {
                    const isBest = bestP1Target && st.target === bestP1Target.target && st.thrown > 0;
                    return (
                      <div
                        key={st.target}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all font-mono flex items-center justify-between ${
                          isBest
                            ? 'bg-emerald-500/[0.08] border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                            : 'bg-white/[0.02] border-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span className="text-xl sm:text-2xl font-black text-white w-12">{st.target}</span>
                          <div className="text-xs text-slate-400">
                            <span>{st.hits} von 30 Darts</span>
                            {isBest && (
                              <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                                Bestwert
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                            {st.quote.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Schlanker Footer */}
        <footer className="flex items-center justify-between text-xs text-slate-500 border-t border-white/[0.06] pt-3 relative z-20 font-mono">
          <span>Lions Weyhausen · Leistungsdiagnostik</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Bereit für nächste Session</span>
          </span>
        </footer>
      </div>
    );
  }

  // =========================================================================
  // PHASE 2: LIVE MATCH – FUTURISTIC GLASS COCKPIT (BILD 4)
  // =========================================================================
  return (
    <div className="w-screen h-screen min-h-screen bg-[#040711] text-white flex flex-col justify-between p-4 sm:p-7 relative overflow-hidden select-none font-sans">
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] ${theme.bgGlow} rounded-full blur-[170px] pointer-events-none transition-all duration-700`} />
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-cyan-500/[0.05] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-emerald-500/[0.05] rounded-full blur-[140px] pointer-events-none" />

      {/* 1. TOP HEADER (Edle Glas-Leiste mit Board-Status, Aufnahme & Digitaluhr) */}
      <header className="flex items-center justify-between gap-4 px-6 py-3.5 rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.5)] relative z-20">
        <div className="flex items-center gap-3.5">
          <div className="relative w-9 h-9 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <Image src="/logo.png" alt="Lions" fill className="object-contain" priority />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black tracking-widest text-white uppercase">
                Lions Weyhausen
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold uppercase tracking-wider">
                Live
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Checkout Battle · 150 Darts
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300">
            Aufnahme {currentRound} von 10
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            {Array.from({ length: 10 }).map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx + 1 === currentRound
                    ? 'w-6 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]'
                    : idx + 1 < currentRound
                    ? 'w-2 bg-emerald-400'
                    : 'w-2 bg-white/15'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-mono text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>BOARD 1</span>
          </div>

          <span className="text-sm font-mono font-bold text-slate-300 hidden md:inline">
            {currentTime}
          </span>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Vollbild"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2. MAIN COCKPIT */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-7 my-auto items-center relative z-10 max-w-7xl mx-auto w-full">
        {/* SPIELER 1 */}
        <div
          className={`lg:col-span-4 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl transition-all duration-500 relative overflow-hidden ${
            activePlayer === 1
              ? 'bg-gradient-to-br from-emerald-500/[0.12] via-white/[0.04] to-transparent border-2 border-emerald-400/70 shadow-[0_0_50px_rgba(16,185,129,0.25),inset_0_1px_0_0_rgba(255,255,255,0.2)] scale-[1.01]'
              : 'bg-white/[0.025] border border-white/[0.08] opacity-65 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400 font-mono">
              {is1vs1 ? 'Spieler 1 (Heim)' : 'Spieler am Oche'}
            </span>

            {activePlayer === 1 ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-black uppercase flex items-center gap-1.5 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                <span>🎯</span>
                <span>Am Wurf</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 font-mono font-medium">Wartet</span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight min-h-[2.5rem] flex items-center">
            {p1Name}
          </h2>

          <div className="mt-5 pt-5 border-t border-white/[0.08]">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Doppelquote
            </span>
            <div className="text-5xl sm:text-6xl lg:text-7xl font-black font-mono text-emerald-400 mt-1 tracking-tight drop-shadow-[0_0_30px_rgba(16,185,129,0.4)]">
              {p1Quote.toFixed(1)}%
            </div>
            <div className="text-sm font-mono font-semibold text-slate-300 mt-2 flex items-center gap-2">
              <span className="text-amber-300 font-bold">{p1Hits} Treffer</span>
              <span className="text-slate-500">/</span>
              <span>{p1Thrown} Darts</span>
            </div>
          </div>
        </div>

        {/* ZENTRUM: HOLOGRAFISCHER ZIELFELD-RING */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center text-center space-y-4">
          <span className="text-xs font-black uppercase tracking-widest text-slate-400 font-mono">
            Aktuelles Zielfeld ({currentTargetIdx + 1}/5)
          </span>

          <div className="relative group">
            <div className={`absolute -inset-2 rounded-full ${theme.ring} opacity-75 blur-md animate-pulse pointer-events-none`} />

            <div
              className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-full border-4 ${theme.ring} bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl flex flex-col items-center justify-center shadow-[inset_0_2px_8px_rgba(255,255,255,0.25)] transition-all duration-500`}
            >
              <span className={`text-6xl sm:text-7xl lg:text-8xl font-black font-mono tracking-tighter ${theme.text}`}>
                {curTarget}
              </span>
              <span className="text-[11px] sm:text-xs uppercase font-bold text-slate-300 mt-1 tracking-wider">
                10 Runden
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono bg-white/[0.03] px-4 py-1.5 rounded-full border border-white/[0.06]">
            {theme.label}
          </div>
        </div>

        {/* RECHTS: SPIELER 2 ODER MATRIX */}
        <div className="lg:col-span-4">
          {is1vs1 ? (
            <div
              className={`rounded-3xl p-6 sm:p-8 backdrop-blur-2xl transition-all duration-500 relative overflow-hidden ${
                activePlayer === 2
                  ? 'bg-gradient-to-br from-emerald-500/[0.12] via-white/[0.04] to-transparent border-2 border-emerald-400/70 shadow-[0_0_50px_rgba(16,185,129,0.25),inset_0_1px_0_0_rgba(255,255,255,0.2)] scale-[1.01]'
                  : 'bg-white/[0.025] border border-white/[0.08] opacity-65 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400 font-mono">
                  Spieler 2 (Gast)
                </span>

                {activePlayer === 2 ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-black uppercase flex items-center gap-1.5 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                    <span>🎯</span>
                    <span>Am Wurf</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 font-mono font-medium">Wartet</span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight min-h-[2.5rem] flex items-center">
                {p2Name}
              </h2>

              <div className="mt-5 pt-5 border-t border-white/[0.08]">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block font-mono">
                  Doppelquote
                </span>
                <div className="text-5xl sm:text-6xl lg:text-7xl font-black font-mono text-emerald-400 mt-1 tracking-tight drop-shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                  {p2Quote.toFixed(1)}%
                </div>
                <div className="text-sm font-mono font-semibold text-slate-300 mt-2 flex items-center gap-2">
                  <span className="text-amber-300 font-bold">{p2Hits} Treffer</span>
                  <span className="text-slate-500">/</span>
                  <span>{p2Thrown} Darts</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl p-5 sm:p-6 bg-white/[0.025] backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] space-y-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 block font-mono">
                Trainings-Fortschritt (5 Doppel)
              </span>

              <div className="space-y-2">
                {TARGETS.map((t) => {
                  const isCur = t === curTarget;
                  const scores = liveState.scoresP1?.[t] || [];
                  const hitsOnT = scores.filter((s) => s !== null).reduce((a, b) => (a ?? 0) + (b ?? 0), 0) ?? 0;
                  const thrownOnT = scores.filter((s) => s !== null).length * 3;
                  const qOnT = thrownOnT > 0 ? (hitsOnT / thrownOnT) * 100 : 0;

                  return (
                    <div
                      key={t}
                      className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border text-xs sm:text-sm font-mono transition-all duration-300 ${
                        isCur
                          ? 'bg-emerald-500/15 border-emerald-400 text-white font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[1.02]'
                          : thrownOnT > 0
                          ? 'bg-white/[0.02] border-white/10 text-slate-200'
                          : 'bg-transparent border-white/5 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm">{t}</span>
                        {isCur && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            Aktiv
                          </span>
                        )}
                      </div>
                      <div>
                        {thrownOnT > 0 ? (
                          <span className="font-bold">
                            {hitsOnT}/{thrownOnT} <span className="text-amber-300">({qOnT.toFixed(0)}%)</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-600">Offen</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="flex items-center justify-between text-xs text-slate-500 border-t border-white/[0.06] pt-3 relative z-20 font-mono">
        <span>Lions Weyhausen · SCW Dartsport 2.0</span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Realtime Cockpit Sync</span>
        </span>
      </footer>
    </div>
  );
}
