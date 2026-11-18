'use client';

import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
  SCORING_LEITER_LEVELS,
  MAX_VISITS_PER_LEVEL,
} from '@/app/training/scoring-leiter/types';

export interface HolographicScoringLeiterProps {
  boardId: string;
  activeName: string;
  is1vs1?: boolean;
  activePlayer?: 1 | 2;
  currentLevelIndex: number; // 0..6
  currentNumber: number;     // 41..140
  hitsInLevel: number;       // 0..2
  levelVisits: boolean[];    // bisherige Aufnahmen in dieser Stufe
  currentVisit: number;      // 1..10
  eliminated?: boolean;
  clearedAll?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function HolographicScoringLeiterCockpit({
  boardId,
  activeName,
  is1vs1 = false,
  activePlayer = 1,
  currentLevelIndex,
  currentNumber,
  hitsInLevel,
  levelVisits = [],
  currentVisit,
  eliminated = false,
  clearedAll = false,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicScoringLeiterProps) {
  const nameParts = activeName.trim().split(' ');
  const firstName = nameParts[0] || 'Sebastian';
  const lastName = nameParts.slice(1).join(' ') || '';
  const maxNameLen = Math.max(firstName.length, lastName.length);
  const nameSizeClass =
    maxNameLen > 14
      ? 'text-2xl sm:text-3xl lg:text-4xl'
      : maxNameLen > 10
      ? 'text-3xl sm:text-4xl lg:text-5xl'
      : 'text-3xl sm:text-5xl lg:text-6xl';

  // Sprossen von oben (140, Index 6) nach unten (41, Index 0)
  const rungsTopToBottom = [...SCORING_LEITER_LEVELS]
    .map((val, idx) => ({ val, idx }))
    .reverse();

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-[#040711] text-white flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none font-sans">
      {/* 1. VOLUMETRISCHE GOD RAYS & CYBER-ATMOSPHÄRE (1:1 STELLEN & CHECKEN) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#040711]" />
        <div
          className="absolute -top-24 left-[10%] w-[480px] h-[900px] pointer-events-none opacity-45 mix-blend-screen"
          style={{
            background:
              'linear-gradient(145deg, rgba(6, 182, 212, 0.55) 0%, rgba(6, 182, 212, 0.12) 45%, transparent 75%)',
            clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)',
            filter: 'blur(32px)',
            transform: 'rotate(-8deg)',
          }}
        />
        <div
          className="absolute -top-24 right-[10%] w-[480px] h-[900px] pointer-events-none opacity-45 mix-blend-screen"
          style={{
            background:
              'linear-gradient(215deg, rgba(6, 182, 212, 0.55) 0%, rgba(6, 182, 212, 0.12) 45%, transparent 75%)',
            clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)',
            filter: 'blur(32px)',
            transform: 'rotate(8deg)',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full pointer-events-none opacity-70"
          style={{
            background:
              'radial-gradient(circle, rgba(0, 229, 255, 0.22) 0%, rgba(255, 51, 85, 0.12) 35%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:48px_48px] opacity-35" />
      </div>

      {/* 2. TOP HEADER: ZENTRIERTE, SCHWEBENDE GLASS-KAPSEL */}
      <header className="relative z-30 pt-2 flex items-center justify-center">
        <div className="px-8 sm:px-14 py-2.5 rounded-full bg-slate-900/60 backdrop-blur-3xl border-2 border-cyan-300/70 shadow-[0_0_35px_rgba(6,182,212,0.45),inset_0_1px_2px_rgba(255,255,255,0.6)] flex items-center justify-center gap-3 text-xs sm:text-sm font-black font-mono tracking-widest text-cyan-200 uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          <span>BOARD {boardId}</span>
          <span className="text-cyan-400/60">•</span>
          <span>LIONS WEYHAUSEN</span>
          <span className="text-cyan-400/60">•</span>
          <span>SCORING-LEITER</span>
          <span className="text-cyan-400/60">•</span>
          <span className="text-cyan-300">
            {clearedAll
              ? '140 BEZWUNGEN'
              : eliminated
              ? `AUS BEI ${currentNumber}`
              : `STUFE ${currentLevelIndex + 1}/7`}
          </span>
        </div>

        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="absolute right-4 top-4 p-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.15] border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-2xl"
            title="Vollbild"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
      </header>

      {/* 3. DAS COCKPIT-HERZ: 3 HORIZONTALE ELEMENTE */}
      <main className="my-auto w-full max-w-7xl mx-auto flex items-center justify-center relative z-20 px-2 sm:px-6">
        <div className="relative flex items-center justify-center gap-6 sm:gap-10 lg:gap-12 w-full">
          {/* LINKER FLÜGEL: SPIELER-CARD */}
          <div className="relative z-10 w-[290px] sm:w-[340px] lg:w-[380px] h-[240px] sm:h-[270px] lg:h-[290px] rounded-[2.5rem] bg-slate-900/65 backdrop-blur-3xl border-2 border-cyan-400/40 shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.3),0_0_35px_rgba(6,182,212,0.25)] p-6 sm:p-8 flex flex-col items-center justify-center text-center overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />

            <div className="flex flex-col items-center justify-center max-w-full">
              <span
                className={`${nameSizeClass} font-black text-white tracking-tight leading-none drop-shadow-[0_4px_25px_rgba(0,0,0,0.95)] truncate max-w-full`}
              >
                {firstName}
              </span>
              {lastName && (
                <span
                  className={`${nameSizeClass} font-black text-white tracking-tight leading-none drop-shadow-[0_4px_25px_rgba(0,0,0,0.95)] mt-1 sm:mt-1.5 truncate max-w-full`}
                >
                  {lastName}
                </span>
              )}
            </div>

            <div className="mt-4 sm:mt-5">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950/80 border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.5)] text-cyan-300 font-mono text-xs sm:text-sm font-black tracking-widest">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#ff3366] animate-pulse" />
                <span>{is1vs1 ? `🎯 SPIELER ${activePlayer}` : '🎯 AM WURF'}</span>
              </span>
            </div>
          </div>

          {/* ZENTRUM: SYMBOLISCHE HOLOGRAFISCHE 7-SPROSSEN-LEITER (41 UNTEN ➔ 140 OBEN) */}
          <div className="relative z-20 w-[320px] sm:w-[370px] lg:w-[410px] shrink-0 flex flex-col items-center justify-center select-none">
            {/* Leiter-Container mit zwei vertikalen Neon-Holmen */}
            <div className="relative w-full px-6 py-4">
              {/* Linker vertikaler Leiterholm */}
              <div className="absolute left-4 top-0 bottom-0 w-3 rounded-full bg-gradient-to-b from-cyan-300 via-cyan-500 to-cyan-700 shadow-[0_0_25px_rgba(6,182,212,0.75)] border border-cyan-200/70" />
              {/* Rechter vertikaler Leiterholm */}
              <div className="absolute right-4 top-0 bottom-0 w-3 rounded-full bg-gradient-to-b from-cyan-300 via-cyan-500 to-cyan-700 shadow-[0_0_25px_rgba(6,182,212,0.75)] border border-cyan-200/70" />

              {/* 7 Horizontale Sprossen von 140 (oben) bis 41 (unten) */}
              <div className="relative z-10 flex flex-col gap-3 sm:gap-3.5 py-2">
                {rungsTopToBottom.map(({ val, idx }) => {
                  const isDone = clearedAll || idx < currentLevelIndex;
                  const isCurr = !clearedAll && !eliminated && idx === currentLevelIndex;
                  const isElim = eliminated && idx === currentLevelIndex;

                  return (
                    <div
                      key={val}
                      className={`relative flex items-center justify-between px-5 sm:px-7 rounded-2xl border-2 transition-all duration-500 ${
                        isCurr
                          ? 'h-16 sm:h-20 bg-gradient-to-r from-slate-950 via-cyan-950/90 to-slate-950 border-cyan-300 shadow-[0_0_40px_rgba(0,229,255,0.65),inset_0_0_20px_rgba(0,229,255,0.25)] scale-[1.06] z-20'
                          : isElim
                          ? 'h-14 sm:h-16 bg-red-950/80 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.5)] scale-[1.03] z-20'
                          : isDone
                          ? 'h-11 sm:h-12 bg-emerald-950/85 border-[#00ff88]/80 shadow-[0_0_20px_rgba(0,255,136,0.35)]'
                          : 'h-11 sm:h-12 bg-slate-950/85 border-cyan-500/25 opacity-75'
                      }`}
                    >
                      {/* Linke Stufen-Nummer */}
                      <span
                        className={`text-xs font-mono font-bold uppercase tracking-wider ${
                          isCurr
                            ? 'text-cyan-300'
                            : isElim
                            ? 'text-red-300'
                            : isDone
                            ? 'text-emerald-300'
                            : 'text-slate-500'
                        }`}
                      >
                        Stufe {idx + 1}
                      </span>

                      {/* Sprossen-Zahl */}
                      <span
                        className={`font-mono font-black tracking-tight leading-none ${
                          isCurr
                            ? 'text-4xl sm:text-5xl text-[#00f0ff] drop-shadow-[0_0_20px_rgba(0,240,255,0.9)]'
                            : isElim
                            ? 'text-3xl sm:text-4xl text-red-300'
                            : isDone
                            ? 'text-2xl sm:text-3xl text-[#00ff88]'
                            : 'text-2xl sm:text-3xl text-slate-400'
                        }`}
                      >
                        {val}
                      </span>

                      {/* Rechtes Status-Icon */}
                      <span className="w-16 text-right font-mono text-xs sm:text-sm font-black">
                        {isDone ? (
                          <span className="text-[#00ff88]">✓ OK</span>
                        ) : isCurr ? (
                          <span className="text-amber-300 animate-pulse">◀ ZIEL</span>
                        ) : isElim ? (
                          <span className="text-red-400">✕ AUS</span>
                        ) : (
                          <span className="text-slate-600">2×</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RECHTER FLÜGEL: TREFFER FÜR AUFSTIEG & 10 AUFNAHMEN-KAPSELN */}
          <div className="relative z-10 w-[290px] sm:w-[340px] lg:w-[380px] h-[240px] sm:h-[270px] lg:h-[290px] rounded-[2.5rem] bg-slate-900/65 backdrop-blur-3xl border-2 border-cyan-400/40 shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.3),0_0_35px_rgba(6,182,212,0.25)] p-6 sm:p-8 flex flex-col items-center justify-between text-center overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />

            <div className="flex flex-col items-center justify-center my-auto space-y-1 w-full">
              <div className="flex items-baseline justify-center gap-2.5">
                <span className="text-5xl sm:text-6xl lg:text-7xl font-black font-mono text-[#00ff88] leading-none drop-shadow-[0_0_35px_rgba(0,255,136,0.8)]">
                  {hitsInLevel}
                </span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-bold font-mono text-slate-400 leading-none">
                  / 2
                </span>
              </div>

              <span className="text-[11px] sm:text-xs font-black font-mono uppercase tracking-widest text-emerald-400/90 block pt-1">
                TREFFER FÜR AUFSTIEG
              </span>

              <span className="text-xl sm:text-2xl font-black font-mono text-amber-300 tracking-wider drop-shadow-[0_0_20px_rgba(251,191,36,0.7)] pt-1 block">
                {eliminated
                  ? 'RECHNERISCH AUS'
                  : clearedAll
                  ? 'LEITER BEZWUNGEN'
                  : `AUFNAHME ${currentVisit} / 10`}
              </span>
            </div>

            {/* 10 gleichmäßige Kapseln am Boden */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 w-full pt-2">
              {Array.from({ length: MAX_VISITS_PER_LEVEL }).map((_, i) => {
                const v = levelVisits[i];
                const isCurrent = !eliminated && !clearedAll && i === levelVisits.length;
                return (
                  <div
                    key={i}
                    className={`h-3 sm:h-3.5 flex-1 max-w-[24px] rounded-full transition-all duration-500 ${
                      v === true
                        ? 'bg-[#00ff88] shadow-[0_0_15px_#00ff88,0_0_5px_#ffffff] border border-[#00ff88]'
                        : v === false
                        ? 'bg-red-500/80 border border-red-400'
                        : isCurrent
                        ? 'bg-amber-300 animate-pulse border border-amber-200'
                        : 'bg-slate-800/80 border border-white/10'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <div className="relative z-20 h-4" />
    </div>
  );
}
