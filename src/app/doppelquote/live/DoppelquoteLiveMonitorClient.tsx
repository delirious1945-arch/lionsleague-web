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

// Winkel für die 5 Doppel auf einer Standard-Dartscheibe (0° ist oben bei 12 Uhr)
// D20 = 0° (oben)
// D10 = 144° (unten rechts)
// D16 = 234° (unten links)
// D8 = 270° (links)
// D4 = 72° (rechts oben)
const TARGET_ANGLES: Record<string, { angle: number; color: string; label: string }> = {
  D20: { angle: 0, color: '#ff3366', label: 'D20' },
  D10: { angle: 144, color: '#00e5ff', label: 'D10' },
  D16: { angle: 234, color: '#00ff88', label: 'D16' },
  D8: { angle: 270, color: '#ffaa00', label: 'D8' },
  D4: { angle: 72, color: '#cc44ff', label: 'D4' },
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

  // Vollbild
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
      if (raw) setLiveState(JSON.parse(raw));
    } catch (err) {}
    return () => window.removeEventListener('storage', handleStorage);
  }, [boardId]);

  // 3. API Polling alle 1.2s für dieses Board
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
  const targetInfo = TARGET_ANGLES[curTarget] || TARGET_ANGLES.D20;
  const is1vs1 = liveState.gameMode === '1vs1';
  const rawP1Name = (liveState.p1Name || 'Sebastian Kirsch').trim();
  const rawP2Name = (liveState.p2Name || 'Gastspieler').trim();

  // Name in Vorname und Nachname teilen für zweizeiligen Look wie im Entwurf
  const splitName = (fullName: string) => {
    const parts = fullName.split(' ');
    if (parts.length === 1) return { first: parts[0], last: '' };
    return { first: parts[0], last: parts.slice(1).join(' ') };
  };

  const p1Parts = splitName(rawP1Name);
  const p2Parts = splitName(rawP2Name);

  const p1Hits = liveState.p1Stats?.hits ?? 0;
  const p1Thrown = liveState.p1Stats?.thrown ?? 0;
  const p1Quote = liveState.p1Stats?.quote ?? 0;
  const p2Hits = liveState.p2Stats?.hits ?? 0;
  const p2Thrown = liveState.p2Stats?.thrown ?? 0;
  const p2Quote = liveState.p2Stats?.quote ?? 0;
  const activePlayer = liveState.activePlayer || 1;
  const currentRound = liveState.currentRound ?? 1;

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
  // DRAMATISCHE BÜHNE: VOLUMETRISCHE LICHTSTRAHLEN & CYBER-ATMOSPHÄRE
  // =========================================================================
  const stageLighting = (
    <>
      {/* Tiefer Space-Hintergrund */}
      <div className="absolute inset-0 bg-[#050814] pointer-events-none" />

      {/* Volumetrischer Lichtstrahl von links oben auf das Cockpit */}
      <div
        className="absolute -top-20 left-[15%] w-[420px] h-[750px] pointer-events-none opacity-40 mix-blend-screen"
        style={{
          background: 'linear-gradient(145deg, rgba(6, 182, 212, 0.45) 0%, rgba(6, 182, 212, 0.12) 45%, transparent 75%)',
          clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)',
          filter: 'blur(30px)',
          transform: 'rotate(-8deg)',
        }}
      />

      {/* Volumetrischer Lichtstrahl von rechts oben auf das Cockpit */}
      <div
        className="absolute -top-20 right-[15%] w-[420px] h-[750px] pointer-events-none opacity-40 mix-blend-screen"
        style={{
          background: 'linear-gradient(215deg, rgba(6, 182, 212, 0.45) 0%, rgba(6, 182, 212, 0.12) 45%, transparent 75%)',
          clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)',
          filter: 'blur(30px)',
          transform: 'rotate(8deg)',
        }}
      />

      {/* Zentraler Leuchtkegel hinter dem holografischen Rad */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full pointer-events-none transition-all duration-1000 opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(0, 229, 255, 0.18) 0%, rgba(255, 51, 102, 0.12) 40%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Subtile Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(5,8,20,0.85)_100%)] pointer-events-none" />
    </>
  );

  // =========================================================================
  // PHASE 1: STANDBY / RUHEZUSTAND
  // =========================================================================
  if (liveState.status === 'idle') {
    return (
      <div className="w-screen h-screen min-h-screen text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none font-sans">
        {stageLighting}

        <div className="absolute top-8 right-8 z-20">
          <button
            onClick={toggleFullscreen}
            className="p-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            title="Vollbild"
          >
            {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </button>
        </div>

        <div className="text-center space-y-7 relative z-10 max-w-xl mx-auto flex flex-col items-center">
          <div className="relative w-56 h-56 sm:w-72 sm:h-72 drop-shadow-[0_0_80px_rgba(6,182,212,0.5)] animate-pulse">
            <Image src="/logo.png" alt="Lions Weyhausen" fill className="object-contain" priority />
          </div>

          <div className="space-y-4 pt-2">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 font-mono text-xs font-black tracking-widest shadow-[0_0_30px_rgba(6,182,212,0.4)]">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span>BOARD {boardId} · COCKPIT STANDBY</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">
              Warte auf Spielbeginn...
            </h1>
            <p className="text-xs sm:text-sm text-cyan-300/80 font-mono">
              Wähle am Tablet dein Spiel und drücke auf „Spiel starten“
            </p>

            {/* Kanal-Wechsler */}
            <div className="flex items-center justify-center gap-2 pt-3">
              <span className="text-[11px] font-mono text-slate-400 mr-1">Monitor-Kanal:</span>
              {['1', '2', '3', '4', '5'].map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setBoardId(b);
                    setLiveState({ status: 'idle', boardId: b });
                    if (typeof window !== 'undefined') window.history.replaceState(null, '', `?board=${b}`);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-black transition-all cursor-pointer ${
                    b === boardId
                      ? 'bg-cyan-500/30 text-cyan-300 border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.6)] scale-105'
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
        {stageLighting}

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
              <p className="text-[11px] text-cyan-300/80 font-mono">
                150 Darts · 5 Doppel (D20, D10, D16, D8, D4)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="px-3.5 py-1 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 font-mono text-xs font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              BOARD {boardId}
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">{currentTime}</span>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SPIELER 1 */}
              <div className="rounded-3xl p-7 sm:p-8 bg-slate-900/50 backdrop-blur-3xl border border-cyan-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_25px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(6,182,212,0.15)] space-y-5">
                <div className="flex items-center justify-between border-b border-white/[0.1] pb-3">
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                    {rawP1Name}
                  </h2>
                  <span className="text-xs font-mono text-cyan-300 uppercase font-bold">Spieler 1</span>
                </div>
                <div className="flex items-baseline gap-4">
                  <div className="text-5xl sm:text-6xl font-black font-mono text-[#00ff88] tracking-tight drop-shadow-[0_0_25px_rgba(0,255,136,0.6)]">
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
                        <span className="text-[#00ff88] font-black block mt-1">{st.quote.toFixed(0)}%</span>
                        <span className="text-[10px] text-slate-400 block">{st.hits}/30</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SPIELER 2 */}
              <div className="rounded-3xl p-7 sm:p-8 bg-slate-900/50 backdrop-blur-3xl border border-cyan-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_25px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(6,182,212,0.15)] space-y-5">
                <div className="flex items-center justify-between border-b border-white/[0.1] pb-3">
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                    {rawP2Name}
                  </h2>
                  <span className="text-xs font-mono text-cyan-300 uppercase font-bold">Spieler 2</span>
                </div>
                <div className="flex items-baseline gap-4">
                  <div className="text-5xl sm:text-6xl font-black font-mono text-[#00ff88] tracking-tight drop-shadow-[0_0_25px_rgba(0,255,136,0.6)]">
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
                        <span className="text-[#00ff88] font-black block mt-1">{st.quote.toFixed(0)}%</span>
                        <span className="text-[10px] text-slate-400 block">{st.hits}/30</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-5 rounded-3xl p-7 sm:p-9 bg-slate-900/50 backdrop-blur-3xl border border-cyan-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(6,182,212,0.2)] flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase text-cyan-300 font-bold block">
                    Werfer am Oche
                  </span>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mt-1">
                    {rawP1Name}
                  </h2>
                </div>

                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block">
                    Gesamt-Doppelquote
                  </span>
                  <div className="text-6xl sm:text-7xl font-black font-mono text-[#00ff88] mt-1 tracking-tight drop-shadow-[0_0_40px_rgba(0,255,136,0.6)]">
                    {p1Quote.toFixed(1)}%
                  </div>
                  <div className="text-base font-mono text-slate-300 font-semibold mt-2">
                    {p1Hits} Treffer / {p1Thrown} Darts
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/[0.1] text-xs font-mono">
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Stärkstes Feld</span>
                    <span className="text-[#00ff88] font-black text-lg mt-0.5 block">
                      {bestP1Target ? `${bestP1Target.target} (${bestP1Target.quote.toFixed(0)}%)` : '–'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Fokusbereich</span>
                    <span className="text-amber-300 font-black text-lg mt-0.5 block">
                      {weakestP1Target ? `${weakestP1Target.target} (${weakestP1Target.quote.toFixed(0)}%)` : '–'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 rounded-3xl p-7 sm:p-9 bg-slate-900/50 backdrop-blur-3xl border border-cyan-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(6,182,212,0.2)] flex flex-col justify-between space-y-4">
                <span className="text-xs font-mono uppercase text-cyan-300 font-bold block">
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
                            ? 'bg-emerald-500/[0.15] border-emerald-400/60 shadow-[0_0_25px_rgba(0,255,136,0.25)]'
                            : 'bg-white/[0.03] border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span className="text-xl sm:text-2xl font-black text-white w-12">{st.target}</span>
                          <div className="text-xs text-slate-300">
                            <span>{st.hits} von 30 Darts</span>
                            {isBest && (
                              <span className="ml-2 text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-[#00ff88] border border-emerald-400/40 font-bold uppercase">
                                Bestwert
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-2xl sm:text-3xl font-black text-[#00ff88]">
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
  // PHASE 2: LIVE MATCH – FUTURISTIC GLASS COCKPIT (1:1 PARITÄT ZU BILD 4 SOLL)
  // =========================================================================
  return (
    <div className="w-screen h-screen min-h-screen text-white flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden select-none font-sans">
      {stageLighting}

      {/* =================================================================== */}
      {/* 1. TOP HEADER: ZENTRIERTE, SCHWEBENDE CYBER-GLAS-KAPSEL (WIE IM SOLL) */}
      {/* =================================================================== */}
      <header className="relative z-30 pt-2 flex items-center justify-center">
        <div className="px-8 sm:px-12 py-3 rounded-2xl bg-slate-900/60 backdrop-blur-3xl border border-cyan-400/50 shadow-[0_0_35px_rgba(6,182,212,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] flex items-center justify-center gap-3 text-xs sm:text-sm font-black font-mono tracking-widest text-cyan-200 uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          <span>BOARD {boardId}</span>
          <span className="text-cyan-400/60">•</span>
          <span>LIONS WEYHAUSEN</span>
          <span className="text-cyan-400/60">•</span>
          <span className="text-amber-300">AUFNAHME {currentRound}/10</span>
        </div>

        {/* Vollbild-Button dezent oben rechts in der Ecke */}
        <button
          onClick={toggleFullscreen}
          className="absolute right-4 top-4 p-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.15] border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-2xl"
          title="Vollbild"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </header>

      {/* =================================================================== */}
      {/* 2. DAS COCKPIT-HERZ: 3 ELEMENTE HORIZONTAL AUF EINER LINIE (WIE IM SOLL) */}
      {/* =================================================================== */}
      <main className="my-auto w-full max-w-6xl mx-auto flex items-center justify-center gap-4 sm:gap-8 lg:gap-12 relative z-20 px-4">
        
        {/* ----------------------------------------------------------------- */}
        {/* LINKER FLÜGEL: SPIELERNAME (FROSTED GLASS MIT SCHWUNG ZUM KREIS) */}
        {/* ----------------------------------------------------------------- */}
        <div
          className={`w-64 sm:w-80 lg:w-96 h-64 sm:h-80 rounded-[2.5rem] backdrop-blur-3xl transition-all duration-700 relative overflow-hidden flex flex-col items-center justify-center p-6 text-center shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.35)] ${
            activePlayer === 1
              ? 'bg-slate-900/65 border-2 border-cyan-400/70 shadow-[0_0_60px_rgba(6,182,212,0.35)] scale-[1.02]'
              : 'bg-slate-900/40 border border-white/15 opacity-60'
          }`}
          style={{
            // Organische Lichtkante wie im Entwurf
            borderRightWidth: '3px',
            borderRightColor: 'rgba(0, 229, 255, 0.6)',
          }}
        >
          {/* Subtiler oberer Glanzstreifen */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />

          {/* Spieler Vorname & Nachname in monumentaler zweizeiliger Typografie */}
          <div className="flex flex-col items-center justify-center space-y-1">
            <span className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
              {p1Parts.first}
            </span>
            {p1Parts.last && (
              <span className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
                {p1Parts.last}
              </span>
            )}
          </div>

          {/* Dezent am Oche Status */}
          {activePlayer === 1 && (
            <div className="mt-4 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-mono text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              AM OCHE
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* ZENTRUM: HOLOGRAFISCHES DARTBOARD-RAD MIT RADIALEN SEGMENTEN */}
        {/* ----------------------------------------------------------------- */}
        <div className="relative shrink-0 flex items-center justify-center">
          {/* Äußerer Leuchtring */}
          <div className="absolute -inset-6 rounded-full bg-cyan-500/15 blur-2xl pointer-events-none animate-pulse" />

          {/* SVG HOLOGRAPHIC RADAR DARTBOARD (EXAKT WIE IM SOLL-BILD) */}
          <div className="relative w-72 h-72 sm:w-96 sm:h-96 lg:w-[420px] lg:h-[420px] flex items-center justify-center">
            <svg
              viewBox="0 0 400 400"
              className="w-full h-full drop-shadow-[0_0_50px_rgba(0,229,255,0.5)] select-none pointer-events-none"
            >
              {/* Definitionen für Verläufe und Glow-Filter */}
              <defs>
                <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="coralGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <linearGradient id="glassSweep" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.15" />
                </linearGradient>
              </defs>

              {/* 1. Äußerer Haupt-Ring in leuchtendem Cyan */}
              <circle
                cx="200"
                cy="200"
                r="185"
                fill="none"
                stroke="#00e5ff"
                strokeWidth="5"
                filter="url(#cyanGlow)"
              />
              <circle
                cx="200"
                cy="200"
                r="180"
                fill="rgba(5, 12, 28, 0.7)"
                stroke="#00e5ff"
                strokeWidth="1.5"
                strokeOpacity="0.5"
              />

              {/* 2. Konzentrische Ringe (wie eine echte Dartscheibe) */}
              <circle cx="200" cy="200" r="150" fill="none" stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.4" />
              <circle cx="200" cy="200" r="135" fill="none" stroke="#00e5ff" strokeWidth="1" strokeOpacity="0.3" />
              <circle cx="200" cy="200" r="100" fill="none" stroke="#00e5ff" strokeWidth="1" strokeOpacity="0.35" />
              <circle cx="200" cy="200" r="85" fill="none" stroke="#00e5ff" strokeWidth="1" strokeOpacity="0.25" />

              {/* 3. Radiale Segment-Linien (20 Speichen im 18°-Abstand) */}
              {Array.from({ length: 20 }).map((_, i) => {
                const angle = (i * 18 * Math.PI) / 180;
                const x1 = 200 + 85 * Math.sin(angle);
                const y1 = 200 - 85 * Math.cos(angle);
                const x2 = 200 + 180 * Math.sin(angle);
                const y2 = 200 - 180 * Math.cos(angle);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#00e5ff"
                    strokeWidth="1"
                    strokeOpacity="0.25"
                  />
                );
              })}

              {/* 4. Das AKTIVE DOPPEL-SEGMENT (Oben bei 12 Uhr für D20 rot hervorgehoben wie im Soll-Bild!) */}
              {/* Ein trapezförmiger Ring-Ausschnitt bei 0° (D20) */}
              <path
                d="M 186 21 A 180 180 0 0 1 214 21 L 211 50 A 150 150 0 0 0 189 50 Z"
                fill="#ff3366"
                filter="url(#coralGlow)"
              />
              <path
                d="M 186 21 A 180 180 0 0 1 214 21 L 211 50 A 150 150 0 0 0 189 50 Z"
                fill="none"
                stroke="#ff6699"
                strokeWidth="2"
              />

              {/* Rote/Koralle Akzent-Ticks auf dem Ring */}
              <line x1="200" y1="20" x2="200" y2="50" stroke="#ffffff" strokeWidth="2" />
              <line x1="160" y1="200" x2="150" y2="200" stroke="#ff3366" strokeWidth="2" filter="url(#coralGlow)" />
              <line x1="240" y1="200" x2="250" y2="200" stroke="#ff3366" strokeWidth="2" filter="url(#coralGlow)" />

              {/* 5. Gläserne Licht-Reflexion (Diagonaler weißer Bogen oben rechts) */}
              <path
                d="M 80 80 A 170 170 0 0 1 320 80"
                fill="none"
                stroke="url(#glassSweep)"
                strokeWidth="6"
                strokeLinecap="round"
                opacity="0.6"
              />

              {/* 6. Zentraler Kreis für die Typografie */}
              <circle
                cx="200"
                cy="200"
                r="70"
                fill="rgba(4, 9, 22, 0.85)"
                stroke="#00e5ff"
                strokeWidth="2"
                strokeOpacity="0.8"
                filter="url(#cyanGlow)"
              />
            </svg>

            {/* ZENTRALE TYPOGRAFIE "D20" (EXAKT ZWEIFARBIG WIE IM SOLL-BILD) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span
                className="text-6xl sm:text-7xl lg:text-8xl font-black font-mono tracking-tight"
                style={{
                  color: '#ffffff',
                  WebkitTextStroke: '2.5px #00e5ff',
                  textShadow: '0 0 30px rgba(0, 229, 255, 0.9), 0 0 60px rgba(255, 51, 102, 0.6)',
                }}
              >
                {curTarget}
              </span>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* RECHTER FLÜGEL: DOPPELQUOTE 0.0% (FROSTED GLASS MIT GOLD-LEISTE) */}
        {/* ----------------------------------------------------------------- */}
        <div
          className="w-64 sm:w-80 lg:w-96 h-64 sm:h-80 rounded-[2.5rem] bg-slate-900/65 backdrop-blur-3xl border border-cyan-400/40 shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.35),0_0_50px_rgba(0,255,136,0.2)] relative overflow-hidden flex flex-col items-center justify-center p-6 text-center"
          style={{
            // Organische Lichtkante links wie im Entwurf
            borderLeftWidth: '3px',
            borderLeftColor: 'rgba(0, 229, 255, 0.6)',
          }}
        >
          {/* Subtiler oberer Glanzstreifen */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />

          {/* RIESIGE NEON-GRÜNE QUOTE (EXAKT WIE IM SOLL-BILD) */}
          <div className="flex flex-col items-center justify-center">
            <span
              className="text-6xl sm:text-7xl lg:text-8xl font-black font-mono tracking-tighter"
              style={{
                color: '#00ff88',
                textShadow: '0 0 40px rgba(0, 255, 136, 0.9), 0 0 80px rgba(0, 255, 136, 0.4)',
              }}
            >
              {p1Quote.toFixed(1)}%
            </span>
          </div>

          {/* Goldener Akzentstreifen am unteren Rand (wie im Soll-Bild!) */}
          <div className="absolute bottom-4 left-1/4 right-1/4 h-1.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.9)]" />
        </div>

      </main>

      {/* =================================================================== */}
      {/* 3. FOOTER: MINIMALISTISCHE STATUSLEISTE */}
      {/* =================================================================== */}
      <footer className="relative z-20 flex items-center justify-between text-xs font-mono text-cyan-300/60 border-t border-white/[0.08] pt-3 px-4">
        <span>LIONS WEYHAUSEN · CHECKOUT BATTLE</span>
        <span>{currentTime}</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          <span>FUTURISTIC HUD LIVE</span>
        </span>
      </footer>
    </div>
  );
}
