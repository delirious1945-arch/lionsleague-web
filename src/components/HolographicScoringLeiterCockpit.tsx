'use client';

import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
  SCORING_LEITER_LEVELS,
  MAX_VISITS_PER_LEVEL,
} from '@/app/training/scoring-leiter/types';

export interface HolographicScoringLeiterProps {
  boardId: string;
  p1Name?: string;
  p2Name?: string;
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
  // 1vs1 Daten pro Spieler
  p1LevelIndex?: number;
  p1HitsInLevel?: number;
  p1LevelVisits?: boolean[];
  p1Eliminated?: boolean;
  p1ClearedAll?: boolean;
  p2LevelIndex?: number;
  p2HitsInLevel?: number;
  p2LevelVisits?: boolean[];
  p2Eliminated?: boolean;
  p2ClearedAll?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function getNameSizing(name: string) {
  const parts = name.trim().split(' ');
  const firstName = parts[0] || 'Spieler';
  const lastName = parts.slice(1).join(' ') || '';
  const maxNameLen = Math.max(firstName.length, lastName.length);
  const sizeClass =
    maxNameLen > 14
      ? 'text-2xl sm:text-3xl lg:text-4xl'
      : maxNameLen > 10
      ? 'text-3xl sm:text-4xl lg:text-4xl'
      : 'text-3xl sm:text-4xl lg:text-5xl';
  return { firstName, lastName, sizeClass };
}

function VisitsCapsules({
  visits,
  eliminated,
  clearedAll,
}: {
  visits: boolean[];
  eliminated: boolean;
  clearedAll: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 w-full pt-1">
      {Array.from({ length: MAX_VISITS_PER_LEVEL }).map((_, i) => {
        const v = visits[i];
        const isCurrent = !eliminated && !clearedAll && i === visits.length;
        return (
          <div
            key={i}
            className={`h-2.5 sm:h-3 flex-1 max-w-[22px] rounded-full transition-all duration-500 ${
              v === true
                ? 'bg-[#00ff88] shadow-[0_0_12px_#00ff88,0_0_4px_#ffffff] border border-[#00ff88]'
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
  );
}

function DualPlayerWing({
  name,
  playerNum,
  isActive,
  levelIndex,
  hitsInLevel,
  visits,
  eliminated,
  clearedAll,
}: {
  name: string;
  playerNum: 1 | 2;
  isActive: boolean;
  levelIndex: number;
  hitsInLevel: number;
  visits: boolean[];
  eliminated: boolean;
  clearedAll: boolean;
}) {
  const { firstName, lastName, sizeClass } = getNameSizing(name);
  const currentTarget = SCORING_LEITER_LEVELS[levelIndex] ?? 140;
  const visitNum = Math.min(MAX_VISITS_PER_LEVEL, visits.length + 1);

  return (
    <div
      className={`relative z-10 w-[290px] sm:w-[340px] lg:w-[380px] min-h-[290px] sm:min-h-[330px] rounded-[2.5rem] backdrop-blur-3xl border-2 p-5 sm:p-7 flex flex-col items-center justify-between text-center overflow-hidden transition-all duration-500 ${
        isActive && !eliminated && !clearedAll
          ? 'bg-slate-900/75 border-cyan-300/80 shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.35),0_0_45px_rgba(6,182,212,0.4)]'
          : 'bg-slate-900/45 border-white/15 opacity-80 shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
      }`}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />

      {/* Spielername & Status-Badge */}
      <div className="flex flex-col items-center justify-center max-w-full space-y-2">
        <div className="flex flex-col items-center max-w-full">
          <span
            className={`${sizeClass} font-black text-white tracking-tight leading-none drop-shadow-[0_4px_25px_rgba(0,0,0,0.95)] truncate max-w-full`}
          >
            {firstName}
          </span>
          {lastName && (
            <span
              className={`${sizeClass} font-black text-slate-200 tracking-tight leading-none drop-shadow-[0_4px_25px_rgba(0,0,0,0.95)] mt-1 truncate max-w-full`}
            >
              {lastName}
            </span>
          )}
        </div>

        <div>
          {clearedAll ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-[#00ff88] font-mono text-xs font-black tracking-widest">
              🏆 140 BEZWUNGEN
            </span>
          ) : eliminated ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-950/80 border-2 border-red-500/80 text-red-300 font-mono text-xs font-black tracking-widest">
              ✕ AUS BEI {currentTarget}
            </span>
          ) : isActive ? (
            <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-slate-950/85 border-2 border-cyan-400/90 shadow-[0_0_20px_rgba(6,182,212,0.5)] text-cyan-300 font-mono text-xs font-black tracking-widest">
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#ff3366] animate-pulse" />
              <span>🎯 SPIELER {playerNum} · AM WURF</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-950/60 border border-white/15 text-slate-400 font-mono text-xs font-bold tracking-widest">
              SPIELER {playerNum} · WARTET
            </span>
          )}
        </div>
      </div>

      {/* Trefferstatistik direkt unter dem jeweiligen Spieler */}
      <div className="w-full pt-3 mt-2 border-t border-white/10 space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="text-left">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Aktuelle Stufe
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-[#00f0ff]">
              {currentTarget}
            </span>
          </div>

          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl sm:text-4xl font-black font-mono text-[#00ff88] leading-none drop-shadow-[0_0_20px_rgba(0,255,136,0.7)]">
                {hitsInLevel}
              </span>
              <span className="text-lg font-bold font-mono text-slate-400">/ 2</span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/90 block">
              Treffer
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Aufnahme
            </span>
            <span className="text-lg sm:text-xl font-black font-mono text-amber-300">
              {eliminated ? 'AUS' : clearedAll ? 'OK' : `${visitNum}/10`}
            </span>
          </div>
        </div>

        <VisitsCapsules visits={visits} eliminated={eliminated} clearedAll={clearedAll} />
      </div>
    </div>
  );
}

export default function HolographicScoringLeiterCockpit({
  boardId,
  p1Name = 'Spieler 1',
  p2Name = 'Spieler 2',
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
  p1LevelIndex = 0,
  p1HitsInLevel = 0,
  p1LevelVisits = [],
  p1Eliminated = false,
  p1ClearedAll = false,
  p2LevelIndex = 0,
  p2HitsInLevel = 0,
  p2LevelVisits = [],
  p2Eliminated = false,
  p2ClearedAll = false,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicScoringLeiterProps) {
  const soloName = getNameSizing(activeName);

  // Sprossen von oben (140, Index 6) nach unten (41, Index 0)
  const rungsTopToBottom = [...SCORING_LEITER_LEVELS]
    .map((val, idx) => ({ val, idx }))
    .reverse();

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-[#040711] text-white flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none font-sans">
      {/* 1. VOLUMETRISCHE GOD RAYS & CYBER-ATMOSPHÄRE */}
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

      {/* 2. TOP HEADER */}
      <header className="relative z-30 pt-2 flex items-center justify-center">
        <div className="px-8 sm:px-14 py-2.5 rounded-full bg-slate-900/60 backdrop-blur-3xl border-2 border-cyan-300/70 shadow-[0_0_35px_rgba(6,182,212,0.45),inset_0_1px_2px_rgba(255,255,255,0.6)] flex items-center justify-center gap-3 text-xs sm:text-sm font-black font-mono tracking-widest text-cyan-200 uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          <span>BOARD {boardId}</span>
          <span className="text-cyan-400/60">•</span>
          <span>LIONS WEYHAUSEN</span>
          <span className="text-cyan-400/60">•</span>
          <span>SCORING-LEITER</span>
          <span className="text-cyan-400/60">•</span>
          <span className="text-cyan-300">
            {is1vs1
              ? '1 VS 1 DUELL'
              : clearedAll
              ? '140 BEZWUNGEN'
              : eliminated
              ? `AUS BEI ${currentNumber}`
              : `STUFE ${currentLevelIndex + 1}/${SCORING_LEITER_LEVELS.length}`}
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

      {/* 3. DAS COCKPIT-HERZ */}
      <main className="my-auto w-full max-w-7xl mx-auto flex items-center justify-center relative z-20 px-2 sm:px-6">
        <div className="relative flex items-center justify-center gap-5 sm:gap-8 lg:gap-10 w-full">
          {/* LINKER FLÜGEL */}
          {is1vs1 ? (
            <DualPlayerWing
              name={p1Name}
              playerNum={1}
              isActive={activePlayer === 1}
              levelIndex={p1LevelIndex}
              hitsInLevel={p1HitsInLevel}
              visits={p1LevelVisits}
              eliminated={p1Eliminated}
              clearedAll={p1ClearedAll}
            />
          ) : (
            <div className="relative z-10 w-[290px] sm:w-[340px] lg:w-[380px] h-[240px] sm:h-[270px] lg:h-[290px] rounded-[2.5rem] bg-slate-900/65 backdrop-blur-3xl border-2 border-cyan-400/40 shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.3),0_0_35px_rgba(6,182,212,0.25)] p-6 sm:p-8 flex flex-col items-center justify-center text-center overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
              <div className="flex flex-col items-center justify-center max-w-full">
                <span
                  className={`${soloName.sizeClass} font-black text-white tracking-tight leading-none drop-shadow-[0_4px_25px_rgba(0,0,0,0.95)] truncate max-w-full`}
                >
                  {soloName.firstName}
                </span>
                {soloName.lastName && (
                  <span
                    className={`${soloName.sizeClass} font-black text-white tracking-tight leading-none drop-shadow-[0_4px_25px_rgba(0,0,0,0.95)] mt-1 sm:mt-1.5 truncate max-w-full`}
                  >
                    {soloName.lastName}
                  </span>
                )}
              </div>
              <div className="mt-4 sm:mt-5">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950/80 border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.5)] text-cyan-300 font-mono text-xs sm:text-sm font-black tracking-widest">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#ff3366] animate-pulse" />
                  <span>🎯 AM WURF</span>
                </span>
              </div>
            </div>
          )}

          {/* ZENTRUM: SYMBOLISCHE 7-SPROSSEN-LEITER (IM 1VS1 IN DER MITTE GETEILT!) */}
          <div className="relative z-20 w-[340px] sm:w-[390px] lg:w-[440px] shrink-0 flex flex-col items-center justify-center select-none">
            {is1vs1 && (
              <div className="w-full px-8 pb-1.5 flex items-center justify-between text-[11px] font-mono font-black uppercase tracking-wider">
                <span className="text-cyan-300 truncate max-w-[120px]">◀ {p1Name.split(' ')[0]}</span>
                <span className="text-slate-400">STUFE</span>
                <span className="text-amber-300 truncate max-w-[120px]">{p2Name.split(' ')[0]} ▶</span>
              </div>
            )}

            <div className="relative w-full px-6 py-3">
              {/* Linker vertikaler Leiterholm */}
              <div className="absolute left-4 top-0 bottom-0 w-3 rounded-full bg-gradient-to-b from-cyan-300 via-cyan-500 to-cyan-700 shadow-[0_0_25px_rgba(6,182,212,0.75)] border border-cyan-200/70" />
              {/* Rechter vertikaler Leiterholm */}
              <div className="absolute right-4 top-0 bottom-0 w-3 rounded-full bg-gradient-to-b from-cyan-300 via-cyan-500 to-cyan-700 shadow-[0_0_25px_rgba(6,182,212,0.75)] border border-cyan-200/70" />

              {/* Im 1vs1: Vertikale Mittel-Teilung hinter den Sprossen */}
              {is1vs1 && (
                <div className="absolute left-1/2 -translate-x-1/2 top-2 bottom-2 w-[2px] bg-gradient-to-b from-cyan-400/50 via-white/25 to-cyan-400/50 z-0 pointer-events-none" />
              )}

              {/* 8 Horizontale Sprossen von 140 (oben) bis 41 (unten) */}
              <div className="relative z-10 flex flex-col gap-2 sm:gap-2.5 py-1">
                {rungsTopToBottom.map(({ val, idx }) => {
                  if (is1vs1) {
                    const p1Done = p1ClearedAll || idx < p1LevelIndex;
                    const p1Curr = !p1ClearedAll && !p1Eliminated && idx === p1LevelIndex;
                    const p1Elim = p1Eliminated && idx === p1LevelIndex;

                    const p2Done = p2ClearedAll || idx < p2LevelIndex;
                    const p2Curr = !p2ClearedAll && !p2Eliminated && idx === p2LevelIndex;
                    const p2Elim = p2Eliminated && idx === p2LevelIndex;

                    const eitherCurr = p1Curr || p2Curr;

                    return (
                      <div
                        key={val}
                        className={`relative grid grid-cols-[1fr_auto_1fr] items-center rounded-2xl border-2 overflow-hidden transition-all duration-500 ${
                          eitherCurr
                            ? 'h-12 sm:h-14 bg-slate-950/95 border-cyan-300 shadow-[0_0_30px_rgba(0,229,255,0.45)] scale-[1.04] z-20'
                            : 'h-9 sm:h-10 bg-slate-950/85 border-cyan-500/25'
                        }`}
                      >
                        {/* Linke Hälfte: Spieler 1 */}
                        <div
                          className={`h-full flex items-center justify-center px-2 font-mono text-xs sm:text-sm font-black border-r border-white/15 ${
                            p1Curr
                              ? 'bg-cyan-500/25 text-cyan-200'
                              : p1Elim
                              ? 'bg-red-950/70 text-red-300'
                              : p1Done
                              ? 'bg-emerald-950/75 text-[#00ff88]'
                              : 'text-slate-600'
                          }`}
                        >
                          {p1Curr ? (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-cyan-300 animate-ping" />
                              <span>{p1HitsInLevel}/2</span>
                            </span>
                          ) : p1Done ? (
                            <span>✓</span>
                          ) : p1Elim ? (
                            <span>✕</span>
                          ) : (
                            <span>·</span>
                          )}
                        </div>

                        {/* Mitte: Stufenzahl */}
                        <div className="px-4 sm:px-5 flex items-center justify-center">
                          <span
                            className={`font-mono font-black tracking-tight leading-none ${
                              eitherCurr
                                ? 'text-2xl sm:text-3xl text-white drop-shadow-[0_0_12px_rgba(0,240,255,0.8)]'
                                : p1Done && p2Done
                                ? 'text-xl sm:text-2xl text-[#00ff88]'
                                : 'text-xl sm:text-2xl text-slate-300'
                            }`}
                          >
                            {val}
                          </span>
                        </div>

                        {/* Rechte Hälfte: Spieler 2 */}
                        <div
                          className={`h-full flex items-center justify-center px-2 font-mono text-xs sm:text-sm font-black border-l border-white/15 ${
                            p2Curr
                              ? 'bg-amber-500/25 text-amber-200'
                              : p2Elim
                              ? 'bg-red-950/70 text-red-300'
                              : p2Done
                              ? 'bg-emerald-950/75 text-[#00ff88]'
                              : 'text-slate-600'
                          }`}
                        >
                          {p2Curr ? (
                            <span className="flex items-center gap-1">
                              <span>{p2HitsInLevel}/2</span>
                              <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
                            </span>
                          ) : p2Done ? (
                            <span>✓</span>
                          ) : p2Elim ? (
                            <span>✕</span>
                          ) : (
                            <span>·</span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Solo-Ansicht (ungeteilte Sprosse)
                  const isDone = clearedAll || idx < currentLevelIndex;
                  const isCurr = !clearedAll && !eliminated && idx === currentLevelIndex;
                  const isElim = eliminated && idx === currentLevelIndex;

                  return (
                    <div
                      key={val}
                      className={`relative flex items-center justify-between px-5 sm:px-7 rounded-2xl border-2 transition-all duration-500 ${
                        isCurr
                          ? 'h-14 sm:h-16 bg-gradient-to-r from-slate-950 via-cyan-950/90 to-slate-950 border-cyan-300 shadow-[0_0_40px_rgba(0,229,255,0.65),inset_0_0_20px_rgba(0,229,255,0.25)] scale-[1.06] z-20'
                          : isElim
                          ? 'h-12 sm:h-14 bg-red-950/80 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.5)] scale-[1.03] z-20'
                          : isDone
                          ? 'h-9 sm:h-11 bg-emerald-950/85 border-[#00ff88]/80 shadow-[0_0_20px_rgba(0,255,136,0.35)]'
                          : 'h-9 sm:h-11 bg-slate-950/85 border-cyan-500/25 opacity-75'
                      }`}
                    >
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

          {/* RECHTER FLÜGEL */}
          {is1vs1 ? (
            <DualPlayerWing
              name={p2Name}
              playerNum={2}
              isActive={activePlayer === 2}
              levelIndex={p2LevelIndex}
              hitsInLevel={p2HitsInLevel}
              visits={p2LevelVisits}
              eliminated={p2Eliminated}
              clearedAll={p2ClearedAll}
            />
          ) : (
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

              <VisitsCapsules visits={levelVisits} eliminated={eliminated} clearedAll={clearedAll} />
            </div>
          )}
        </div>
      </main>

      <div className="relative z-20 h-4" />
    </div>
  );
}
