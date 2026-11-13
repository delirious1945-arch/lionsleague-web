'use client';

import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import HolographicDartboard from '@/components/HolographicDartboard';

export interface HolographicPdcChallengeProps {
  boardId: string;
  activeName: string;
  is1vs1?: boolean;
  activePlayer?: 1 | 2;
  currentPart?: 1 | 2 | 3;
  currentTarget: string;
  currentScore: number;
  currentVisit: number;
  totalVisits?: number;
  currentTime?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function HolographicPdcChallengeCockpit({
  boardId,
  activeName,
  is1vs1 = false,
  activePlayer = 1,
  currentPart,
  currentTarget,
  currentScore,
  currentVisit,
  totalVisits = 26,
  currentTime,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicPdcChallengeProps) {
  const visitPct = Math.min(100, Math.round((currentVisit / Math.max(1, totalVisits)) * 100));

  return (
    <div className="relative w-screen h-screen bg-[#040711] text-white flex flex-col justify-between p-4 sm:p-8 overflow-hidden select-none font-sans">
      {/* Hintergrund-Atmosphäre exakt wie Checkout Battle */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-[18%] w-[26vw] h-[130vh] bg-gradient-to-b from-cyan-400/25 via-cyan-500/05 to-transparent rotate-[18deg] blur-2xl opacity-60" />
        <div className="absolute -top-32 right-[18%] w-[26vw] h-[130vh] bg-gradient-to-b from-cyan-400/25 via-cyan-500/05 to-transparent -rotate-[18deg] blur-2xl opacity-60" />
        <div className="absolute top-[35%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-cyan-600/15 rounded-full blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:48px_48px] opacity-35" />
      </div>

      {/* Top Header */}
      <div className="relative z-20 flex items-center justify-between w-full px-2">
        <div className="w-44 hidden sm:block">
          <span className="text-xs font-mono text-slate-400">
            PDC CHALLENGE{currentPart ? ` · TEIL ${currentPart}` : ''}
          </span>
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
            AUFNAHME {currentVisit}/{totalVisits}
          </span>
        </div>

        <div className="flex items-center gap-3 w-44 justify-end">
          {currentTime && (
            <span className="text-xs sm:text-sm font-mono text-slate-400 tracking-widest">
              {currentTime}
            </span>
          )}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Vollbild"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Zentrales Cockpit: Kacheln weiter außen von der Scheibe weggeschoben */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-2 sm:px-6">
        <div className="relative flex items-center justify-center gap-6 sm:gap-10 lg:gap-14 w-full max-w-7xl">
          {/* Linker Flügel */}
          <div className="relative z-10 w-[280px] sm:w-[320px] md:w-[360px] h-[210px] sm:h-[240px] rounded-3xl bg-slate-900/40 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.2)] p-6 sm:p-7 flex flex-col justify-between">
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

          {/* Zentrum: Identische Turnier-Dartscheibe wie Checkout Battle */}
          <HolographicDartboard
            target={currentTarget}
            badgeLabel="ZIELFELD"
            className="relative z-20 w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] md:w-[450px] md:h-[450px] shrink-0"
          />

          {/* Rechter Flügel: Punktestand für PDC Challenge (100% Unified zu Bild 2) */}
          <div className="relative z-10 w-[280px] sm:w-[320px] md:w-[360px] h-[210px] sm:h-[240px] rounded-3xl bg-slate-900/40 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.2)] p-6 sm:p-7 flex flex-col justify-between">
            <div className="w-full flex justify-end">
              <span className="text-sm sm:text-base font-black uppercase tracking-wider text-emerald-400 font-mono">
                PUNKTESTAND
              </span>
            </div>

            <div className="w-full flex items-baseline justify-center my-auto">
              <span className="text-6xl sm:text-7xl lg:text-8xl font-black font-mono text-[#00ff88] tracking-tight drop-shadow-[0_0_35px_rgba(0,255,136,0.8)]">
                {currentScore}
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-slate-400/80 ml-2">
                / 100
              </span>
            </div>

            <div className="h-1.5 w-full bg-amber-400/40 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative z-20 h-4" />
    </div>
  );
}
