'use client';

import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import HolographicDartboard from '@/components/HolographicDartboard';
import {
  DartHitValue,
  Darts99LivePlayerStats,
  MAX_POINTS_99,
  TOTAL_DARTS_99,
  TOTAL_ROUNDS_99,
} from '@/app/training/99-darts/types';

export interface HolographicDarts99Props {
  boardId: string;
  p1Name?: string;
  p2Name?: string;
  activeName: string;
  is1vs1?: boolean;
  activePlayer?: 1 | 2;
  targetNumber: number; // 20 | 19 | 18
  p1Stats: Darts99LivePlayerStats;
  p2Stats?: Darts99LivePlayerStats;
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

function formatDartChip(val: DartHitValue, targetNum: number) {
  if (val === 3) {
    return {
      label: `T${targetNum}`,
      pts: '+3',
      cls: 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.35)]',
    };
  }
  if (val === 2) {
    return {
      label: `D${targetNum}`,
      pts: '+2',
      cls: 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.35)]',
    };
  }
  if (val === 1) {
    return {
      label: `S${targetNum}`,
      pts: '+1',
      cls: 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.35)]',
    };
  }
  return {
    label: 'MISS',
    pts: '0',
    cls: 'bg-red-950/70 border-red-500/70 text-red-300',
  };
}

function CurrentTurnDartsRow({
  darts,
  targetNumber,
  isActive,
}: {
  darts: DartHitValue[];
  targetNumber: number;
  isActive: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {[0, 1, 2].map((idx) => {
        const val = darts[idx];
        if (val !== undefined) {
          const chip = formatDartChip(val, targetNumber);
          return (
            <div
              key={idx}
              className={`py-2 px-1.5 rounded-xl border-2 text-center font-mono transition-all ${chip.cls}`}
            >
              <div className="text-sm sm:text-base font-black leading-none">{chip.label}</div>
              <div className="text-[10px] font-bold opacity-90 mt-0.5">{chip.pts} Pkt</div>
            </div>
          );
        }
        return (
          <div
            key={idx}
            className={`py-2 px-1.5 rounded-xl border border-dashed text-center font-mono flex flex-col items-center justify-center ${
              isActive && idx === darts.length
                ? 'bg-cyan-500/10 border-cyan-400/70 text-cyan-300 animate-pulse'
                : 'bg-slate-950/60 border-white/15 text-slate-500'
            }`}
          >
            <div className="text-xs font-black">Dart {idx + 1}</div>
            <div className="text-[10px]">?</div>
          </div>
        );
      })}
    </div>
  );
}

function DualDarts99Wing({
  name,
  playerNum,
  isActive,
  targetNumber,
  stats,
}: {
  name: string;
  playerNum: 1 | 2;
  isActive: boolean;
  targetNumber: number;
  stats: Darts99LivePlayerStats;
}) {
  const { firstName, lastName, sizeClass } = getNameSizing(name);
  const pct = Math.min(100, Math.round((stats.dartsThrown / TOTAL_DARTS_99) * 100));
  const quotePct = (stats.hitQuote * 100).toFixed(1);

  return (
    <div
      className={`relative z-10 w-[290px] sm:w-[340px] lg:w-[380px] min-h-[340px] sm:min-h-[390px] rounded-[2.5rem] backdrop-blur-3xl border-2 p-5 sm:p-6 flex flex-col items-center justify-between text-center overflow-hidden transition-all duration-500 ${
        isActive && !stats.finished
          ? 'bg-slate-900/75 border-cyan-300/80 shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.35),0_0_45px_rgba(6,182,212,0.4)]'
          : 'bg-slate-900/45 border-white/15 opacity-80 shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
      }`}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />

      {/* Spielername & Status */}
      <div className="flex flex-col items-center max-w-full space-y-2 w-full">
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
          {stats.finished ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-[#00ff88] font-mono text-xs font-black tracking-widest">
              ✓ 99 DARTS BEENDET
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

      {/* Haupt-Score & Darts */}
      <div className="w-full py-2 flex items-center justify-between border-y border-white/10 my-2">
        <div className="text-left">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
            Punkte
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-black font-mono text-[#00ff88] leading-none drop-shadow-[0_0_22px_rgba(0,255,136,0.75)]">
              {stats.totalPoints}
            </span>
            <span className="text-sm font-bold font-mono text-slate-400">/{MAX_POINTS_99}</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
            Darts / Aufn.
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300 leading-none">
            {stats.dartsThrown}
            <span className="text-xs text-slate-400">/99</span>
          </div>
          <span className="text-[10px] font-mono text-amber-300 font-bold">
            Aufn. {stats.currentRound}/{TOTAL_ROUNDS_99}
          </span>
        </div>
      </div>

      {/* Aktuelle Aufnahme wenn aktiv */}
      {isActive && !stats.finished && (
        <div className="w-full pb-2">
          <CurrentTurnDartsRow
            darts={stats.currentTurnDarts}
            targetNumber={targetNumber}
            isActive={true}
          />
        </div>
      )}

      {/* Trefferstatistik direkt unter dem jeweiligen Spieler */}
      <div className="w-full space-y-2">
        <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-xs">
          <div className="p-1.5 rounded-xl bg-amber-500/15 border border-amber-400/40">
            <div className="text-[9px] text-amber-300 font-bold">TRIPLE</div>
            <div className="text-sm font-black text-white">{stats.triples}</div>
          </div>
          <div className="p-1.5 rounded-xl bg-cyan-500/15 border border-cyan-400/40">
            <div className="text-[9px] text-cyan-300 font-bold">DOUBLE</div>
            <div className="text-sm font-black text-white">{stats.doubles}</div>
          </div>
          <div className="p-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40">
            <div className="text-[9px] text-emerald-300 font-bold">SINGLE</div>
            <div className="text-sm font-black text-white">{stats.singles}</div>
          </div>
          <div className="p-1.5 rounded-xl bg-red-950/60 border border-red-500/40">
            <div className="text-[9px] text-red-300 font-bold">MISS</div>
            <div className="text-sm font-black text-red-200">{stats.misses}</div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
            <span>Quote: <strong className="text-emerald-300">{quotePct}%</strong></span>
            <span>Schnitt: <strong className="text-cyan-300">{stats.pointsPerDart.toFixed(2)} P/D</strong></span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HolographicDarts99Cockpit({
  boardId,
  p1Name = 'Spieler 1',
  p2Name = 'Spieler 2',
  activeName,
  is1vs1 = false,
  activePlayer = 1,
  targetNumber,
  p1Stats,
  p2Stats,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicDarts99Props) {
  const soloName = getNameSizing(activeName);
  const soloQuotePct = (p1Stats.hitQuote * 100).toFixed(1);
  const soloProgressPct = Math.min(100, Math.round((p1Stats.dartsThrown / TOTAL_DARTS_99) * 100));

  const tPct = p1Stats.dartsThrown > 0 ? Math.round((p1Stats.triples / p1Stats.dartsThrown) * 100) : 0;
  const dPct = p1Stats.dartsThrown > 0 ? Math.round((p1Stats.doubles / p1Stats.dartsThrown) * 100) : 0;
  const sPct = p1Stats.dartsThrown > 0 ? Math.round((p1Stats.singles / p1Stats.dartsThrown) * 100) : 0;
  const mPct = p1Stats.dartsThrown > 0 ? Math.round((p1Stats.misses / p1Stats.dartsThrown) * 100) : 0;

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
              'radial-gradient(circle, rgba(0, 229, 255, 0.22) 0%, rgba(16, 185, 129, 0.12) 35%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:48px_48px] opacity-35" />
      </div>

      {/* 2. TOP HEADER */}
      <header className="relative z-30 pt-2 flex items-center justify-center">
        <div className="px-6 sm:px-12 py-2.5 rounded-full bg-slate-900/60 backdrop-blur-3xl border-2 border-cyan-300/70 shadow-[0_0_35px_rgba(6,182,212,0.45),inset_0_1px_2px_rgba(255,255,255,0.6)] flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-black font-mono tracking-widest text-cyan-200 uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          <span>BOARD {boardId}</span>
          <span className="text-cyan-400/60">•</span>
          <span>LIONS WEYHAUSEN</span>
          <span className="text-cyan-400/60">•</span>
          <span>99 DARTS CHALLENGE</span>
          <span className="text-cyan-400/60">•</span>
          <span className="text-amber-300">ZIEL {targetNumber}</span>
          <span className="text-cyan-400/60">•</span>
          <span className="text-emerald-300">
            {is1vs1 ? '1 VS 1 DUELL' : `AUFNAHME ${p1Stats.currentRound}/${TOTAL_ROUNDS_99}`}
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
            <DualDarts99Wing
              name={p1Name}
              playerNum={1}
              isActive={activePlayer === 1}
              targetNumber={targetNumber}
              stats={p1Stats}
            />
          ) : (
            <div className="relative z-10 w-[290px] sm:w-[340px] lg:w-[380px] min-h-[300px] sm:min-h-[340px] rounded-[2.5rem] bg-slate-900/65 backdrop-blur-3xl border-2 border-cyan-400/40 shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.3),0_0_35px_rgba(6,182,212,0.25)] p-6 sm:p-7 flex flex-col items-center justify-between text-center overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />

              <div className="flex flex-col items-center justify-center max-w-full space-y-2.5">
                <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-slate-950/80 border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.5)] text-cyan-300 font-mono text-xs font-black tracking-widest">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#ff3366] animate-pulse" />
                  <span>🎯 AM WURF</span>
                </span>

                <div className="flex flex-col items-center max-w-full pt-1">
                  <span
                    className={`${soloName.sizeClass} font-black text-white tracking-tight leading-none drop-shadow-[0_4px_25px_rgba(0,0,0,0.95)] truncate max-w-full`}
                  >
                    {soloName.firstName}
                  </span>
                  {soloName.lastName && (
                    <span
                      className={`${soloName.sizeClass} font-black text-slate-200 tracking-tight leading-none drop-shadow-[0_4px_25px_rgba(0,0,0,0.95)] mt-1 truncate max-w-full`}
                    >
                      {soloName.lastName}
                    </span>
                  )}
                </div>
              </div>

              {/* Aktuelle 3 Darts der Aufnahme */}
              <div className="w-full space-y-1.5 my-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                  Aufnahme {p1Stats.currentRound} / {TOTAL_ROUNDS_99}
                </div>
                <CurrentTurnDartsRow
                  darts={p1Stats.currentTurnDarts}
                  targetNumber={targetNumber}
                  isActive={!p1Stats.finished}
                />
              </div>

              {/* Trefferquote & Pkt/Dart */}
              <div className="w-full grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10">
                <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-white/10">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Trefferquote</div>
                  <div className="text-xl font-black font-mono text-[#00ff88]">{soloQuotePct}%</div>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-white/10">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Pkt / Dart</div>
                  <div className="text-xl font-black font-mono text-cyan-300">
                    {p1Stats.pointsPerDart.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ZENTRUM: HOLOGRAFISCHE DARTSCHEIBE + ZIELZAHL-LEGENDE */}
          <div className="relative z-20 flex flex-col items-center justify-center shrink-0">
            <HolographicDartboard
              target={String(targetNumber)}
              badgeLabel="ZIELZAHL"
              className="relative z-20 w-[300px] h-[300px] sm:w-[370px] sm:h-[370px] lg:w-[430px] lg:h-[430px] shrink-0"
            />
            <div className="mt-2 px-5 py-2 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-cyan-400/40 shadow-[0_0_25px_rgba(6,182,212,0.25)] flex items-center gap-3 text-xs font-mono font-black">
              <span className="text-emerald-300">S{targetNumber}: 1P</span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-300">D{targetNumber}: 2P</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-300">T{targetNumber}: 3P</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300">99 DARTS</span>
            </div>
          </div>

          {/* RECHTER FLÜGEL */}
          {is1vs1 ? (
            <DualDarts99Wing
              name={p2Name}
              playerNum={2}
              isActive={activePlayer === 2}
              targetNumber={targetNumber}
              stats={
                p2Stats || {
                  totalPoints: 0,
                  dartsThrown: 0,
                  currentRound: 1,
                  currentTurnDarts: [],
                  singles: 0,
                  doubles: 0,
                  triples: 0,
                  misses: 0,
                  hitQuote: 0,
                  pointsPerDart: 0,
                  finished: false,
                }
              }
            />
          ) : (
            <div className="relative z-10 w-[290px] sm:w-[340px] lg:w-[380px] min-h-[300px] sm:min-h-[340px] rounded-[2.5rem] bg-slate-900/65 backdrop-blur-3xl border-2 border-cyan-400/40 shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.3),0_0_35px_rgba(6,182,212,0.25)] p-6 sm:p-7 flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />

              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black uppercase tracking-widest text-slate-400">
                  PUNKTESTAND
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-mono text-xs font-bold">
                  Dart {p1Stats.dartsThrown} / {TOTAL_DARTS_99}
                </span>
              </div>

              {/* Großer Punktestand */}
              <div className="flex items-baseline justify-center gap-2 my-3">
                <span className="text-6xl sm:text-7xl font-black font-mono text-[#00ff88] leading-none drop-shadow-[0_0_35px_rgba(0,255,136,0.8)]">
                  {p1Stats.totalPoints}
                </span>
                <span className="text-2xl font-black font-mono text-slate-400">
                  / {MAX_POINTS_99}
                </span>
              </div>

              {/* Treffer-Aufschlüsselung mit Balken */}
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-amber-300 font-bold">Triple (T{targetNumber})</span>
                    <span className="font-black text-white">
                      {p1Stats.triples}× ({p1Stats.triples * 3} Pkt)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${tPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-cyan-300 font-bold">Double (D{targetNumber})</span>
                    <span className="font-black text-white">
                      {p1Stats.doubles}× ({p1Stats.doubles * 2} Pkt)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${dPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-emerald-300 font-bold">Single (S{targetNumber})</span>
                    <span className="font-black text-white">
                      {p1Stats.singles}× ({p1Stats.singles} Pkt)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${sPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-red-300 font-bold">Miss (0 Pkt)</span>
                    <span className="font-black text-red-200">{p1Stats.misses}×</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${mPct}%` }} />
                  </div>
                </div>
              </div>

              {/* 99-Darts-Fortschritt */}
              <div className="pt-3 mt-2 border-t border-white/10">
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Fortschritt (99 Darts)</span>
                  <span className="text-white font-bold">{soloProgressPct}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                    style={{ width: `${soloProgressPct}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="relative z-20 h-4" />
    </div>
  );
}
