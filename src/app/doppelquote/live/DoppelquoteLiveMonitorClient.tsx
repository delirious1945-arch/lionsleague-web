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

const TARGET_THEMES: Record<
  string,
  {
    ringColor: string;
    neonText: string;
    glowBg: string;
    subLabel: string;
    hudBorder: string;
    hudGlow: string;
  }
> = {
  D20: {
    ringColor: 'border-rose-500/80',
    neonText: 'text-rose-400 drop-shadow-[0_0_40px_rgba(244,63,94,0.9)]',
    glowBg: 'rgba(244, 63, 94, 0.18)',
    subLabel: 'TOPS · DOPPEL 20',
    hudBorder: 'border-rose-400/60',
    hudGlow: 'shadow-[0_0_60px_rgba(244,63,94,0.5),inset_0_0_35px_rgba(244,63,94,0.3)]',
  },
  D10: {
    ringColor: 'border-cyan-400/80',
    neonText: 'text-cyan-300 drop-shadow-[0_0_40px_rgba(6,182,212,0.9)]',
    glowBg: 'rgba(6, 182, 212, 0.18)',
    subLabel: 'HALB-TOPS · DOPPEL 10',
    hudBorder: 'border-cyan-400/60',
    hudGlow: 'shadow-[0_0_60px_rgba(6,182,212,0.5),inset_0_0_35px_rgba(6,182,212,0.3)]',
  },
  D16: {
    ringColor: 'border-emerald-400/80',
    neonText: 'text-emerald-300 drop-shadow-[0_0_40px_rgba(16,185,129,0.9)]',
    glowBg: 'rgba(16, 185, 129, 0.18)',
    subLabel: 'FAVORIT · DOPPEL 16',
    hudBorder: 'border-emerald-400/60',
    hudGlow: 'shadow-[0_0_60px_rgba(16,185,129,0.5),inset_0_0_35px_rgba(16,185,129,0.3)]',
  },
  D8: {
    ringColor: 'border-amber-400/80',
    neonText: 'text-amber-300 drop-shadow-[0_0_40px_rgba(245,158,11,0.9)]',
    glowBg: 'rgba(245, 158, 11, 0.18)',
    subLabel: 'HALB-16 · DOPPEL 8',
    hudBorder: 'border-amber-400/60',
    hudGlow: 'shadow-[0_0_60px_rgba(245,158,11,0.5),inset_0_0_35px_rgba(245,158,11,0.3)]',
  },
  D4: {
    ringColor: 'border-purple-400/80',
    neonText: 'text-purple-300 drop-shadow-[0_0_40px_rgba(168,85,247,0.9)]',
    glowBg: 'rgba(168, 85, 247, 0.18)',
    subLabel: 'FINISH-DOPPEL · DOPPEL 4',
    hudBorder: 'border-purple-400/60',
    hudGlow: 'shadow-[0_0_60px_rgba(168,85,247,0.5),inset_0_0_35px_rgba(168,85,247,0.3)]',
  },
};

interface DoppelquoteLiveMonitorProps {
  initialBoardId?: string;
}

export default function DoppelquoteLiveMonitorClient({ initialBoardId = '1' }: DoppelquoteLiveMonitorProps) {
  const [boardId, setBoardId] = useState<string>(initialBoardId);
  const [liveState, setLiveState] = useState<DoppelquoteLiveState>({ status: 'idle', boardId: initialBoardId });
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

  // 1. BroadcastChannel Listener
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel(`lions_doppelquote_live_sync_${boardId}`);
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
    const storageKey = `lions_doppelquote_live_sync_${boardId}`;
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
      if (raw) {
        setLiveState(JSON.parse(raw));
      }
    } catch (err) {}

    return () => window.removeEventListener('storage', handleStorage);
  }, [boardId]);

  // 3. API Polling alle 1.2s für das ausgewählte Board
  useEffect(() => {
    const pollApi = async () => {
      try {
        const res = await fetch(`/api/live/doppelquote?board=${boardId}`, { cache: 'no-store' });
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
    const timer = setInterval(pollApi, 1200);
    return () => clearInterval(timer);
  }, [boardId]);

  const curTarget = liveState.currentTarget || 'D20';
  const theme = TARGET_THEMES[curTarget] || TARGET_THEMES.D20;
  const is1vs1 = liveState.gameMode === '1vs1';
  const p1Name = liveState.p1Name || 'Sebastian Kirsch';
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
  const validP1Stats = p1TargetStats.filter((s) => s.thrown > 0);
  const bestP1Target = validP1Stats.length > 0 ? [...validP1Stats].sort((a, b) => b.quote - a.quote)[0] : null;
  const weakestP1Target = validP1Stats.length > 0 ? [...validP1Stats].sort((a, b) => a.quote - b.quote)[0] : null;

  // =========================================================================
  // GEMEINSAMER HINTERGRUND: DEEP COSMOS MIT CYBER-GRID & RADIALEN LICHTKUGELN
  // =========================================================================
  const backgroundLayers = (
    <>
      {/* 1. Deep Space Base */}
      <div className="absolute inset-0 bg-[#060919] pointer-events-none" />

      {/* 2. Cyber HUD Grid-Linien */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* 3. Sphärische Leuchtkuppeln passend zum Zielfeld */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-[180px] pointer-events-none transition-all duration-1000"
        style={{ backgroundColor: theme.glowBg }}
      />
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-cyan-500/[0.12] rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-emerald-500/[0.1] rounded-full blur-[160px] pointer-events-none" />

      {/* 4. Subtiler Vignette-Filter */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(6,9,25,0.75)_100%)] pointer-events-none" />
    </>
  );

  // =========================================================================
  // PHASE 1: STANDBY / RUHEZUSTAND
  // =========================================================================
  if (liveState.status === 'idle') {
    return (
      <div className="w-screen h-screen min-h-screen text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none font-sans">
        {backgroundLayers}

        {/* Vollbild-Button */}
        <div className="absolute top-8 right-8 z-20">
          <button
            onClick={toggleFullscreen}
            className="p-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            title="Vollbild umschalten"
          >
            {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </button>
        </div>

        {/* Zentrales Lions-Wappen & Standby-Status */}
        <div className="text-center space-y-7 relative z-10 max-w-xl mx-auto flex flex-col items-center">
          <div className="relative w-56 h-56 sm:w-72 sm:h-72 drop-shadow-[0_0_80px_rgba(6,182,212,0.4)] animate-pulse">
            <Image
              src="/logo.png"
              alt="Lions Weyhausen"
              fill
              className="object-contain"
              priority
            />
          </div>

          <div className="space-y-4 pt-2">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 font-mono text-xs font-black tracking-widest shadow-[0_0_25px_rgba(6,182,212,0.3)]">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span>BOARD {boardId} · HUD STANDBY</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              Warte auf Spielbeginn...
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-mono">
              Wähle am Tablet dein Spiel und drücke auf „Spiel starten“
            </p>

            {/* Board-Schnellwahl für den TV-Monitor */}
            <div className="flex items-center justify-center gap-2 pt-3">
              <span className="text-[11px] font-mono text-slate-500 mr-1">Monitor-Kanal:</span>
              {['1', '2', '3', '4', '5'].map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setBoardId(b);
                    setLiveState({ status: 'idle', boardId: b });
                    if (typeof window !== 'undefined') {
                      window.history.replaceState(null, '', `?board=${b}`);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-black transition-all cursor-pointer ${
                    b === boardId
                      ? 'bg-cyan-500/30 text-cyan-300 border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-105'
                      : 'bg-white/[0.04] text-slate-400 border border-white/10 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  Board {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PHASE 3: NÜCHTERNES FEEDBACK BEI SPIELENDE
  // =========================================================================
  if (liveState.status === 'completed') {
    return (
      <div className="w-screen h-screen min-h-screen text-white flex flex-col justify-between p-5 sm:p-8 relative overflow-hidden select-none font-sans">
        {backgroundLayers}

        {/* Schlanker Header */}
        <div className="flex items-center justify-between border-b border-white/[0.1] pb-4 relative z-20">
          <div className="flex items-center gap-3.5">
            <div className="relative w-9 h-9 drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">
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

          <div className="flex items-center gap-3.5">
            <div className="px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-mono text-xs font-bold">
              BOARD {boardId}
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              {currentTime}
            </span>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-2xl"
              title="Vollbild"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Haupt-Feedback-Bereich */}
        <main className="my-auto max-w-7xl mx-auto w-full relative z-10 py-4">
          {is1vs1 ? (
            /* 1VS1 VERGLEICH */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SPIELER 1 */}
              <div className="rounded-3xl p-7 sm:p-8 bg-slate-900/40 backdrop-blur-3xl border border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_25px_60px_rgba(0,0,0,0.8)] space-y-5">
                <div className="flex items-center justify-between border-b border-white/[0.1] pb-3">
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                    {p1Name}
                  </h2>
                  <span className="text-xs font-mono text-slate-400 uppercase">Spieler 1</span>
                </div>

                <div className="flex items-baseline gap-4">
                  <div className="text-5xl sm:text-6xl font-black font-mono text-emerald-400 tracking-tight drop-shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                    {p1Quote.toFixed(1)}%
                  </div>
                  <div className="text-sm font-mono text-slate-300 font-semibold">
                    {p1Hits} Treffer / {p1Thrown} Darts
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/[0.1]">
                  <span className="text-[11px] font-mono uppercase text-slate-400 font-bold block">
                    Aufschlüsselung nach Doppeln
                  </span>
                  <div className="grid grid-cols-5 gap-2 text-center font-mono text-xs">
                    {p1TargetStats.map((st) => (
                      <div key={st.target} className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                        <span className="font-black text-white block text-sm">{st.target}</span>
                        <span className="text-emerald-400 font-black block mt-1">{st.quote.toFixed(0)}%</span>
                        <span className="text-[10px] text-slate-500 block">{st.hits}/30</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SPIELER 2 */}
              <div className="rounded-3xl p-7 sm:p-8 bg-slate-900/40 backdrop-blur-3xl border border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_25px_60px_rgba(0,0,0,0.8)] space-y-5">
                <div className="flex items-center justify-between border-b border-white/[0.1] pb-3">
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                    {p2Name}
                  </h2>
                  <span className="text-xs font-mono text-slate-400 uppercase">Spieler 2</span>
                </div>

                <div className="flex items-baseline gap-4">
                  <div className="text-5xl sm:text-6xl font-black font-mono text-emerald-400 tracking-tight drop-shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                    {p2Quote.toFixed(1)}%
                  </div>
                  <div className="text-sm font-mono text-slate-300 font-semibold">
                    {p2Hits} Treffer / {p2Thrown} Darts
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/[0.1]">
                  <span className="text-[11px] font-mono uppercase text-slate-400 font-bold block">
                    Aufschlüsselung nach Doppeln
                  </span>
                  <div className="grid grid-cols-5 gap-2 text-center font-mono text-xs">
                    {p2TargetStats.map((st) => (
                      <div key={st.target} className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                        <span className="font-black text-white block text-sm">{st.target}</span>
                        <span className="text-emerald-400 font-black block mt-1">{st.quote.toFixed(0)}%</span>
                        <span className="text-[10px] text-slate-500 block">{st.hits}/30</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* SOLO-TRAINING */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-5 rounded-3xl p-7 sm:p-9 bg-slate-900/40 backdrop-blur-3xl border border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_25px_60px_rgba(0,0,0,0.8)] flex flex-col justify-between space-y-6">
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
                  <div className="text-6xl sm:text-7xl font-black font-mono text-emerald-400 mt-1 tracking-tight drop-shadow-[0_0_35px_rgba(16,185,129,0.5)]">
                    {p1Quote.toFixed(1)}%
                  </div>
                  <div className="text-base font-mono text-slate-300 font-semibold mt-2">
                    {p1Hits} Treffer / {p1Thrown} Darts
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/[0.1] text-xs font-mono">
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Stärkstes Feld</span>
                    <span className="text-emerald-300 font-black text-lg mt-0.5 block">
                      {bestP1Target ? `${bestP1Target.target} (${bestP1Target.quote.toFixed(0)}%)` : '–'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Fokusbereich</span>
                    <span className="text-amber-300 font-black text-lg mt-0.5 block">
                      {weakestP1Target ? `${weakestP1Target.target} (${weakestP1Target.quote.toFixed(0)}%)` : '–'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 rounded-3xl p-7 sm:p-9 bg-slate-900/40 backdrop-blur-3xl border border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_25px_60px_rgba(0,0,0,0.8)] flex flex-col justify-between space-y-4">
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
                            ? 'bg-emerald-500/[0.12] border-emerald-400/60 shadow-[0_0_25px_rgba(16,185,129,0.25)]'
                            : 'bg-white/[0.03] border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span className="text-xl sm:text-2xl font-black text-white w-12">{st.target}</span>
                          <div className="text-xs text-slate-400">
                            <span>{st.hits} von 30 Darts</span>
                            {isBest && (
                              <span className="ml-2 text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 font-bold uppercase">
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

        {/* Footer */}
        <footer className="flex items-center justify-between text-xs text-slate-500 border-t border-white/[0.08] pt-3 relative z-20 font-mono">
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
  // PHASE 2: LIVE MATCH – FUTURISTIC GLASS COCKPIT (BILD 4 ULTRA-DETAIL)
  // =========================================================================
  return (
    <div className="w-screen h-screen min-h-screen text-white flex flex-col justify-between p-4 sm:p-7 relative overflow-hidden select-none font-sans">
      {backgroundLayers}

      {/* 1. TOP HEADER: SCHWEBENDE CYBER-GLAS-LEISTE */}
      <header className="flex items-center justify-between gap-4 px-6 py-3.5 rounded-3xl bg-slate-900/40 backdrop-blur-3xl border border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_20px_40px_rgba(0,0,0,0.7)] relative z-20">
        {/* Links: Lions Branding */}
        <div className="flex items-center gap-3.5">
          <div className="relative w-9 h-9 drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]">
            <Image src="/logo.png" alt="Lions" fill className="object-contain" priority />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black tracking-widest text-white uppercase font-mono">
                Lions Weyhausen
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 font-black uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                Live
              </span>
            </div>
            <p className="text-[11px] text-cyan-300/80 font-mono">
              Checkout Battle · 150 Darts
            </p>
          </div>
        </div>

        {/* Mitte: Aufnahme-Fortschritt mit Kristall-Dots */}
        <div className="flex flex-col items-center">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest text-amber-300 font-mono drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]">
            Aufnahme {currentRound} von 10
          </div>
          <div className="flex items-center gap-2 mt-2">
            {Array.from({ length: 10 }).map((_, idx) => (
              <span
                key={idx}
                className={`h-2 rounded-full transition-all duration-500 ${
                  idx + 1 === currentRound
                    ? 'w-7 bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,1)] scale-110'
                    : idx + 1 < currentRound
                    ? 'w-2.5 bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.6)]'
                    : 'w-2.5 bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Rechts: Board-Badge, Uhrzeit & Vollbild */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-mono text-xs font-black shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>BOARD {boardId}</span>
          </div>

          <span className="text-sm font-mono font-bold text-slate-300 hidden md:inline">
            {currentTime}
          </span>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.15] border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-2xl"
            title="Vollbild"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2. MAIN COCKPIT: HOLOGRAPHISCHES ZENTRUM & FROSTED-GLASS PANELS */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-auto items-center relative z-10 max-w-7xl mx-auto w-full">
        
        {/* =================================================================== */}
        {/* SPIELER 1 (LINKS: FROSTED GLASS MIT GLAS-LICHTKANTE) */}
        {/* =================================================================== */}
        <div
          className={`lg:col-span-4 rounded-3xl p-7 sm:p-8 backdrop-blur-3xl transition-all duration-700 relative overflow-hidden ${
            activePlayer === 1
              ? 'bg-gradient-to-br from-emerald-500/[0.15] via-slate-900/60 to-slate-950/80 border-2 border-emerald-400/80 shadow-[0_0_60px_rgba(16,185,129,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] scale-[1.02]'
              : 'bg-slate-900/40 border border-white/15 opacity-60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_20px_50px_rgba(0,0,0,0.8)]'
          }`}
        >
          {/* Obere Glanzkante */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-black uppercase tracking-widest text-cyan-300 font-mono">
              {is1vs1 ? 'Spieler 1 (Heim)' : 'Spieler am Oche'}
            </span>

            {activePlayer === 1 ? (
              <span className="px-3.5 py-1 rounded-full bg-emerald-500/25 border border-emerald-400 text-emerald-300 text-xs font-black uppercase flex items-center gap-1.5 animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.6)]">
                <span>🎯</span>
                <span>Am Wurf</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 font-mono font-medium">Wartet</span>
            )}
          </div>

          {/* Vollständiger Name – kein Abschneiden! */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight min-h-[2.5rem] flex items-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            {p1Name}
          </h2>

          {/* Riesige Smaragdgrün-Quote */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Doppelquote
            </span>
            <div className="text-6xl sm:text-7xl lg:text-8xl font-black font-mono text-emerald-400 mt-1 tracking-tight drop-shadow-[0_0_40px_rgba(16,185,129,0.6)]">
              {p1Quote.toFixed(1)}%
            </div>
            <div className="text-sm font-mono font-semibold text-slate-300 mt-2 flex items-center gap-3">
              <span className="text-amber-300 font-black text-base">{p1Hits} Treffer</span>
              <span className="text-slate-500">/</span>
              <span>{p1Thrown} Darts</span>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* ZENTRUM: HOLOGRAFISCHES SCI-FI HUD TARGET (D20 HERO AUS BILD 4) */}
        {/* =================================================================== */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center text-center space-y-4">
          <span className="text-xs font-black uppercase tracking-widest text-cyan-300 font-mono drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]">
            [ AKTUELLES ZIELFELD · {currentTargetIdx + 1}/5 ]
          </span>

          {/* Der holografische HUD-Container */}
          <div className="relative group">
            {/* 1. Äußerer rotierender Dash-Ring */}
            <div className={`absolute -inset-4 rounded-full border-2 border-dashed ${theme.ringColor} opacity-50 animate-[spin_20s_linear_infinite] pointer-events-none`} />

            {/* 2. Mittlerer Leucht-Glow-Ring */}
            <div className={`absolute -inset-1 rounded-full ${theme.hudGlow} opacity-80 blur-md pointer-events-none`} />

            {/* 3. Zentraler Glass-Ring */}
            <div
              className={`relative w-52 h-52 sm:w-64 sm:h-64 rounded-full border-4 ${theme.hudBorder} ${theme.hudGlow} bg-slate-900/60 backdrop-blur-3xl flex flex-col items-center justify-center transition-all duration-700 overflow-hidden shadow-[inset_0_0_40px_rgba(255,255,255,0.15)]`}
            >
              {/* Sci-Fi Eck-Fadenkreuze */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-white/40" />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-white/40" />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-[2px] bg-white/40" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-[2px] bg-white/40" />

              {/* RIESIGE ZIEL-BEZEICHNUNG */}
              <span className={`text-7xl sm:text-8xl lg:text-9xl font-black font-mono tracking-tighter ${theme.neonText}`}>
                {curTarget}
              </span>
              <span className="text-[11px] sm:text-xs uppercase font-black text-white/90 mt-1 tracking-widest font-mono">
                10 RUNDEN
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-300 font-mono bg-slate-900/60 backdrop-blur-2xl px-5 py-2 rounded-full border border-white/15 shadow-[0_0_20px_rgba(0,0,0,0.6)]">
            {theme.subLabel}
          </div>
        </div>

        {/* =================================================================== */}
        {/* RECHTS: SPIELER 2 (1VS1) ODER SCI-FI MATRIX ALLER 5 DOPPEL (SOLO) */}
        {/* =================================================================== */}
        <div className="lg:col-span-4">
          {is1vs1 ? (
            /* SPIELER 2 BEI 1VS1 */
            <div
              className={`rounded-3xl p-7 sm:p-8 backdrop-blur-3xl transition-all duration-700 relative overflow-hidden ${
                activePlayer === 2
                  ? 'bg-gradient-to-br from-emerald-500/[0.15] via-slate-900/60 to-slate-950/80 border-2 border-emerald-400/80 shadow-[0_0_60px_rgba(16,185,129,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] scale-[1.02]'
                  : 'bg-slate-900/40 border border-white/15 opacity-60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_20px_50px_rgba(0,0,0,0.8)]'
              }`}
            >
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-black uppercase tracking-widest text-cyan-300 font-mono">
                  Spieler 2 (Gast)
                </span>

                {activePlayer === 2 ? (
                  <span className="px-3.5 py-1 rounded-full bg-emerald-500/25 border border-emerald-400 text-emerald-300 text-xs font-black uppercase flex items-center gap-1.5 animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.6)]">
                    <span>🎯</span>
                    <span>Am Wurf</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 font-mono font-medium">Wartet</span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight min-h-[2.5rem] flex items-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                {p2Name}
              </h2>

              <div className="mt-6 pt-5 border-t border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block font-mono">
                  Doppelquote
                </span>
                <div className="text-6xl sm:text-7xl lg:text-8xl font-black font-mono text-emerald-400 mt-1 tracking-tight drop-shadow-[0_0_40px_rgba(16,185,129,0.6)]">
                  {p2Quote.toFixed(1)}%
                </div>
                <div className="text-sm font-mono font-semibold text-slate-300 mt-2 flex items-center gap-3">
                  <span className="text-amber-300 font-black text-base">{p2Hits} Treffer</span>
                  <span className="text-slate-500">/</span>
                  <span>{p2Thrown} Darts</span>
                </div>
              </div>
            </div>
          ) : (
            /* SOLO: 5 SCHWEBENDE SCI-FI GLASS-STREIFEN */
            <div className="rounded-3xl p-6 sm:p-7 bg-slate-900/40 backdrop-blur-3xl border border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_20px_50px_rgba(0,0,0,0.8)] space-y-3">
              <span className="text-xs font-black uppercase tracking-widest text-cyan-300 block font-mono">
                [ TRAININGS-FORTSCHRITT · 5 DOPPEL ]
              </span>

              <div className="space-y-2.5">
                {TARGETS.map((t) => {
                  const isCur = t === curTarget;
                  const scores = liveState.scoresP1?.[t] || [];
                  const hitsOnT = scores.filter((s) => s !== null).reduce((a, b) => (a ?? 0) + (b ?? 0), 0) ?? 0;
                  const thrownOnT = scores.filter((s) => s !== null).length * 3;
                  const qOnT = thrownOnT > 0 ? (hitsOnT / thrownOnT) * 100 : 0;

                  return (
                    <div
                      key={t}
                      className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border text-xs sm:text-sm font-mono transition-all duration-500 ${
                        isCur
                          ? 'bg-gradient-to-r from-emerald-500/25 via-emerald-500/10 to-transparent border-emerald-400/80 text-white font-black shadow-[0_0_30px_rgba(16,185,129,0.35),inset_0_1px_0_0_rgba(255,255,255,0.3)] scale-[1.03]'
                          : thrownOnT > 0
                          ? 'bg-white/[0.04] border-white/15 text-slate-200'
                          : 'bg-white/[0.02] border-white/5 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-black text-base w-10">{t}</span>
                        {isCur && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 font-black uppercase tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                            Aktiv
                          </span>
                        )}
                      </div>
                      <div>
                        {thrownOnT > 0 ? (
                          <span className="font-black">
                            {hitsOnT}/30 <span className="text-emerald-400 font-mono ml-1">({qOnT.toFixed(0)}%)</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-600 font-medium">Offen</span>
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
      <footer className="flex items-center justify-between text-xs text-slate-500 border-t border-white/10 pt-3 relative z-20 font-mono">
        <span>Lions Weyhausen · SCW Dartsport 2.0</span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-cyan-300/80 font-bold">Futuristic Glass Cockpit HUD</span>
        </span>
      </footer>
    </div>
  );
}
