'use client';

import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
  GOLF_BOT_CONFIGS,
  GolfBotDifficulty,
  GolfDartShot,
  GolfHoleDefinition,
  GolfHolesCount,
  GolfLastActionBanner,
  GolfPlayerState,
  MAX_STROKES_PER_HOLE,
  formatToPar,
  getGolfTermForScore,
} from '@/app/special/dartsgolf/types';

export interface HolographicDartsGolfProps {
  boardId: string;
  p1Name: string;
  p2Name: string;
  activePlayer: 1 | 2;
  holesCount: GolfHolesCount;
  currentHoleIndex: number;
  coursePar: number;
  holes: GolfHoleDefinition[];
  isComputer: boolean;
  computerLevel?: GolfBotDifficulty;
  p1: GolfPlayerState;
  p2: GolfPlayerState;
  lastAction?: GolfLastActionBanner | null;
  winnerPlayer?: 1 | 2 | 'draw' | null;
  winnerName?: string | null;
  currentTime?: string;
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
      ? 'text-lg sm:text-xl lg:text-2xl'
      : maxNameLen > 10
      ? 'text-xl sm:text-2xl lg:text-3xl'
      : 'text-2xl sm:text-3xl';
  return { firstName, lastName, sizeClass };
}

function TurnShotSlots({
  shots,
  isActive,
  isHoledOut,
  accent = 'emerald',
}: {
  shots: GolfDartShot[];
  isActive: boolean;
  isHoledOut: boolean;
  accent?: 'emerald' | 'amber';
}) {
  const activeBorder =
    accent === 'amber'
      ? 'bg-amber-500/10 border-amber-400/80 text-amber-300 animate-pulse'
      : 'bg-emerald-500/10 border-emerald-400/80 text-emerald-300 animate-pulse';

  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {[0, 1, 2].map((idx) => {
        const sh = shots[idx];
        if (sh) {
          let cls = 'bg-slate-900/90 border-cyan-400/60 text-cyan-100';
          if (sh.holedOut) {
            cls =
              'bg-emerald-500/30 border-emerald-300 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.5)]';
          } else if (sh.overshot) {
            cls =
              'bg-amber-950/85 border-amber-400 text-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.35)]';
          } else if (sh.value === 0) {
            cls = 'bg-red-950/75 border-red-500/65 text-red-200';
          }

          return (
            <div
              key={idx}
              className={`py-1.5 px-1.5 rounded-xl border-2 text-center font-mono transition-all ${cls}`}
            >
              <div className="text-[10px] font-bold opacity-80">
                Schlag {sh.strokeNumber}
              </div>
              <div className="text-xs sm:text-sm font-black leading-tight truncate">
                {sh.holedOut
                  ? `⛳ ${sh.value} m`
                  : sh.overshot
                  ? `💨 ${sh.value} m`
                  : `${sh.value} m`}
              </div>
              <div className="text-[10px] font-bold opacity-90 truncate">
                {sh.holedOut
                  ? 'EINGELOCHT!'
                  : sh.overshot
                  ? `Überflug → ${sh.distanceAfter}m`
                  : `→ ${sh.distanceAfter} m`}
              </div>
            </div>
          );
        }

        return (
          <div
            key={idx}
            className={`py-2 px-1.5 rounded-xl border border-dashed text-center font-mono flex flex-col items-center justify-center ${
              isHoledOut
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400/70'
                : isActive && idx === shots.length
                ? activeBorder
                : 'bg-slate-950/60 border-white/15 text-slate-500'
            }`}
          >
            <div className="text-[11px] font-black">
              {isHoledOut ? '⛳ Im Loch' : `Aufn. ${idx + 1}`}
            </div>
            <div className="text-[10px]">•</div>
          </div>
        );
      })}
    </div>
  );
}

function ActionBanner({ lastAction }: { lastAction?: GolfLastActionBanner | null }) {
  if (!lastAction) {
    return (
      <div className="rounded-2xl bg-slate-900/75 border border-emerald-400/30 px-4 py-2.5 text-center backdrop-blur-xl">
        <div className="text-xs font-mono uppercase tracking-widest text-emerald-300 font-black">
          ⛳ Abschlag frei!
        </div>
        <div className="text-xs sm:text-sm text-slate-200 mt-0.5">
          Checke die Distanz auf 0 m – Überwürfe fliegen übers Loch hinaus!
        </div>
      </div>
    );
  }

  let cls = 'bg-slate-900/80 border-white/20 text-slate-100';
  if (lastAction.tone === 'eagle') {
    cls =
      'bg-amber-950/90 border-amber-300 text-amber-100 shadow-[0_0_35px_rgba(251,191,36,0.5)] animate-pulse';
  } else if (lastAction.tone === 'hole_out') {
    cls =
      'bg-emerald-950/85 border-emerald-400 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.45)]';
  } else if (lastAction.tone === 'overshoot') {
    cls =
      'bg-orange-950/85 border-amber-400 text-amber-100 shadow-[0_0_28px_rgba(249,115,22,0.4)]';
  } else if (lastAction.tone === 'drive') {
    cls = 'bg-cyan-950/80 border-cyan-400/70 text-cyan-100';
  } else if (lastAction.tone === 'miss') {
    cls = 'bg-red-950/75 border-red-500/65 text-red-100';
  }

  return (
    <div className={`rounded-2xl border-2 px-4 py-2.5 text-center backdrop-blur-2xl transition-all ${cls}`}>
      <div className="text-sm sm:text-base font-black tracking-wide uppercase leading-tight flex items-center justify-center gap-2">
        <span>{lastAction.icon}</span>
        <span>{lastAction.headline}</span>
      </div>
      <div className="text-xs sm:text-sm font-semibold opacity-95 mt-0.5 leading-snug">
        {lastAction.subline}
      </div>
    </div>
  );
}

export default function HolographicDartsGolfCockpit({
  boardId,
  p1Name,
  p2Name,
  activePlayer,
  holesCount,
  currentHoleIndex,
  coursePar,
  holes,
  isComputer,
  computerLevel = 'clubmeister',
  p1,
  p2,
  lastAction,
  winnerPlayer,
  winnerName,
  currentTime,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicDartsGolfProps) {
  const [fallbackTime, setFallbackTime] = useState<string>('');

  useEffect(() => {
    if (currentTime) return;
    const update = () => {
      setFallbackTime(
        new Date().toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [currentTime]);

  const displayTime = currentTime || fallbackTime;
  const currentHole: GolfHoleDefinition =
    holes[Math.min(holes.length - 1, Math.max(0, currentHoleIndex))] || {
      holeNumber: currentHoleIndex + 1,
      par: 4,
      startDistance: 150,
      name: 'Fairway Weyhausen',
      hazardHint: 'Spiele den Ball exakt auf 0 Meter',
    };

  const botCfg = GOLF_BOT_CONFIGS[computerLevel] || GOLF_BOT_CONFIGS.clubmeister;

  // Berechne Ball-Positionen auf der Fairway-Grafik:
  // Abschlag links = 6%, Fahne rechts = 80%, Hinterland (Überflug) = 83%..95%
  const computeBallLeftPct = (st: GolfPlayerState) => {
    if (st.currentHoleHoledOut || st.currentDistance === 0) return 80;
    const lastShot =
      st.currentHoleAllShots && st.currentHoleAllShots.length > 0
        ? st.currentHoleAllShots[st.currentHoleAllShots.length - 1]
        : null;
    if (lastShot?.overshot) {
      const overshootRatio = Math.min(1, st.currentDistance / 90);
      return Math.round(83 + overshootRatio * 12);
    }
    const maxDist = Math.max(currentHole.startDistance, st.currentDistance, 1);
    const progress = 1 - Math.min(1, st.currentDistance / maxDist);
    return Math.round(6 + progress * 72);
  };

  const p1BallLeft = computeBallLeftPct(p1);
  const p2BallLeft = computeBallLeftPct(p2);

  const renderPlayerCard = (playerNum: 1 | 2, name: string, st: GolfPlayerState) => {
    const isP1 = playerNum === 1;
    const isAct = !winnerPlayer && activePlayer === playerNum;
    const isWin = winnerPlayer === playerNum;
    const { firstName, lastName, sizeClass } = getNameSizing(name);
    const recentShots =
      st.currentHoleAllShots && st.currentHoleAllShots.length > 0
        ? st.currentHoleAllShots.slice(-3)
        : st.currentTurnShots || [];
    const lastShot =
      st.currentHoleAllShots && st.currentHoleAllShots.length > 0
        ? st.currentHoleAllShots[st.currentHoleAllShots.length - 1]
        : null;

    return (
      <div
        className={`relative flex flex-col justify-between rounded-[2rem] backdrop-blur-3xl border-2 p-4 sm:p-5 transition-all duration-500 overflow-hidden h-full ${
          isWin
            ? 'bg-slate-900/90 border-amber-400 shadow-[0_0_55px_rgba(251,191,36,0.5)]'
            : isAct
            ? isP1
              ? 'bg-slate-900/85 border-emerald-400 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_38px_rgba(16,185,129,0.38)]'
              : 'bg-slate-900/85 border-amber-400 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_38px_rgba(251,191,36,0.38)]'
            : 'bg-slate-900/50 border-white/15 opacity-85'
        }`}
      >
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
            isP1 ? 'from-emerald-400 to-cyan-400' : 'from-amber-400 to-yellow-300'
          }`}
        />

        {/* Spieler Header & To-Par Score */}
        <div className="flex items-start justify-between gap-2 pt-1">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span
                className={`inline-block text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isP1
                    ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
                    : 'bg-amber-500/15 border-amber-400/50 text-amber-300'
                }`}
              >
                {isP1
                  ? 'GOLFER 1 · LIONS'
                  : isComputer
                  ? `BOT · ${botCfg.handicapLabel}`
                  : 'GOLFER 2 · RIVAL'}
              </span>
              {st.currentHoleHoledOut && (
                <span className="inline-block text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400 text-emerald-200">
                  ⛳ IM LOCH ({st.currentHoleStrokes} Schl.)
                </span>
              )}
              {lastShot?.overshot && !st.currentHoleHoledOut && (
                <span className="inline-block text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-400 text-amber-200 animate-pulse">
                  💨 ÜBERFLUG!
                </span>
              )}
            </div>

            <div className={`${sizeClass} font-black text-white leading-none truncate`}>
              {firstName}{' '}
              {lastName && (
                <span className="text-base sm:text-lg font-bold text-slate-300">{lastName}</span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0 font-mono">
            <span className="text-[10px] text-slate-400 uppercase block">Gesamt (To Par)</span>
            <div className="flex items-baseline justify-end gap-1.5">
              <span
                className={`text-2xl sm:text-3xl font-black ${
                  st.scoreToPar < 0
                    ? 'text-emerald-400'
                    : st.scoreToPar === 0
                    ? 'text-white'
                    : 'text-rose-400'
                }`}
              >
                {formatToPar(st.scoreToPar)}
              </span>
              <span className="text-xs text-slate-400">({st.totalStrokes} Schl.)</span>
            </div>
          </div>
        </div>

        {/* Aktuelle Distanz zum Loch (ohne Kopfrechen-Spoiler!) */}
        <div className="my-2 p-3 rounded-2xl bg-slate-950/80 border border-white/15 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-400 block">
              {st.currentHoleHoledOut
                ? 'LOCH BEENDET'
                : lastShot?.overshot
                ? 'NEUE DISTANZ NACH ÜBERFLUG'
                : 'RESTDISTANZ ZUR FAHNE'}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span
                className={`text-3xl sm:text-4xl font-black font-mono ${
                  st.currentHoleHoledOut
                    ? 'text-emerald-400'
                    : st.currentDistance <= 170
                    ? 'text-emerald-300 drop-shadow-[0_0_15px_rgba(16,185,129,0.45)]'
                    : 'text-white'
                }`}
              >
                {st.currentDistance} m
              </span>
            </div>
          </div>

          <div className="text-right font-mono shrink-0">
            <span className="text-[10px] text-slate-400 block uppercase">Loch-Schläge</span>
            <span className="text-2xl font-black text-cyan-300">
              {st.currentHoleStrokes}
              <span className="text-xs text-slate-500">/{MAX_STROKES_PER_HOLE}</span>
            </span>
          </div>
        </div>

        {/* Mini-Golf-Bilanz + Letzte 3 Schläge */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            {isWin ? (
              <span className="font-black text-amber-300">🏆 TURNIERSIEGER!</span>
            ) : isAct ? (
              <span
                className={`font-black flex items-center gap-1.5 ${
                  isP1 ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full animate-ping ${
                    isP1 ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span>🏌️‍♂️ AM SCHLAG</span>
              </span>
            ) : (
              <span className="text-slate-400 font-bold">
                {st.currentHoleHoledOut ? '✓ Eingelocht' : 'Wartet im Flight'}
              </span>
            )}

            <div className="flex items-center gap-2 text-slate-300">
              <span title="Eagles & Birdies" className="text-emerald-300 font-bold">
                🐦 {st.eaglesOrBetter + st.birdies}
              </span>
              <span>•</span>
              <span title="Pars">⛳ {st.pars}</span>
              <span>•</span>
              <span title="Überflüge" className="text-amber-300">
                💨 {st.totalOvershoots}
              </span>
            </div>
          </div>

          <TurnShotSlots
            shots={recentShots}
            isActive={isAct}
            isHoledOut={st.currentHoleHoledOut}
            accent={isP1 ? 'emerald' : 'amber'}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-[#040a0e] text-white flex flex-col justify-between p-4 sm:p-5 lg:p-6 overflow-hidden select-none font-sans">
      {/* Volumetrische Fairway-God-Rays */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-[14%] w-[28vw] h-[130vh] bg-gradient-to-b from-emerald-500/20 via-teal-600/05 to-transparent rotate-[18deg] blur-2xl opacity-75" />
        <div className="absolute -top-32 right-[14%] w-[28vw] h-[130vh] bg-gradient-to-b from-amber-400/18 via-emerald-500/05 to-transparent -rotate-[18deg] blur-2xl opacity-70" />
        <div className="absolute top-[42%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[780px] h-[540px] bg-emerald-600/10 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:44px_44px] opacity-30" />
      </div>

      {/* Top Header */}
      <div className="relative z-20 flex items-center justify-between w-full px-2 shrink-0">
        <div className="w-40 hidden sm:block">
          <span className="text-xs font-mono font-bold tracking-widest text-emerald-400">
            LIONS GOLF CLUB
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-2xl border border-emerald-400/40 shadow-[0_0_25px_rgba(16,185,129,0.28)]">
          <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-cyan-300">
            BOARD {boardId}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-xs sm:text-sm font-black tracking-wider text-emerald-300 uppercase">
            ⛳ LIONS DARTS-GOLF ({holesCount} HOLES)
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-amber-300">
            LOCH {currentHole.holeNumber}/{holesCount} · PAR {currentHole.par} ({currentHole.startDistance} m)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm font-mono text-slate-400 tracking-widest">
            {displayTime}
          </span>
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              aria-label="Vollbild umschalten"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Haupt-Cockpit */}
      <div className="relative z-10 flex-1 flex flex-col justify-between gap-3 min-h-0 py-2 max-w-[1600px] w-full mx-auto">
        {/* 1. Obere Zone: Interaktives Fairway-Radar */}
        <div className="rounded-[1.75rem] bg-slate-900/70 backdrop-blur-3xl border border-emerald-400/25 p-3.5 sm:p-4 shadow-2xl space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono text-xs font-black">
                LOCH #{currentHole.holeNumber}
              </span>
              <div>
                <div className="text-sm sm:text-base font-black text-white">
                  {currentHole.name}{' '}
                  <span className="text-amber-300 font-mono text-xs sm:text-sm">
                    • Par {currentHole.par} • {currentHole.startDistance} m
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">{currentHole.hazardHint}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-white/10 text-slate-300">
                Platz-Par: <strong className="text-white">{coursePar}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-white/10 text-amber-300">
                Lochsiege: <strong>{p1.holesWon}</strong> : <strong>{p2.holesWon}</strong>
              </span>
            </div>
          </div>

          {/* Fairway & Putting-Grün Grafik */}
          <div className="relative h-20 sm:h-24 w-full rounded-2xl bg-gradient-to-r from-emerald-950/95 via-emerald-900/75 to-amber-950/75 border border-emerald-400/35 overflow-hidden px-4">
            <div className="absolute inset-y-0 left-0 w-[80%] bg-gradient-to-r from-emerald-950/60 via-emerald-800/35 to-emerald-600/30" />
            <div className="absolute top-1/2 -translate-y-1/2 left-[70%] w-[14%] h-14 sm:h-16 rounded-full bg-emerald-400/25 border-2 border-emerald-300/60 shadow-[0_0_25px_rgba(16,185,129,0.4)]" />
            <div className="absolute inset-y-0 left-[82%] right-0 bg-amber-950/50 border-l-2 border-dashed border-amber-400/60 flex items-center justify-center">
              <span className="text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-wider text-amber-300/80 px-1 text-center">
                💨 Überflug-Rough
              </span>
            </div>

            <div className="absolute left-[4%] top-1/2 -translate-y-1/2 flex flex-col items-center">
              <span className="text-xs font-mono font-black text-slate-300">TEE</span>
              <span className="text-[10px] font-mono text-slate-400">
                {currentHole.startDistance}m
              </span>
            </div>

            <div className="absolute left-[80%] top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center z-10">
              <span className="text-xl sm:text-2xl drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]">
                ⛳
              </span>
              <span className="text-[10px] font-mono font-black text-emerald-200 bg-slate-950/80 px-1.5 rounded border border-emerald-400/50">
                0 m
              </span>
            </div>

            <div
              className="absolute top-[24%] -translate-y-1/2 -translate-x-1/2 transition-all duration-700 z-20 flex items-center gap-1"
              style={{ left: `${p1BallLeft}%` }}
            >
              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-mono text-[10px] font-black shadow-[0_0_12px_#10b981] whitespace-nowrap">
                ⚪ P1: {p1.currentDistance}m
              </span>
            </div>

            <div
              className="absolute top-[74%] -translate-y-1/2 -translate-x-1/2 transition-all duration-700 z-20 flex items-center gap-1"
              style={{ left: `${p2BallLeft}%` }}
            >
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[10px] font-black shadow-[0_0_12px_#fbbf24] whitespace-nowrap">
                🟡 {isComputer ? 'BOT' : 'P2'}: {p2.currentDistance}m
              </span>
            </div>
          </div>

          {/* Kompakte 18-Loch PGA-Scorecard */}
          <div className="overflow-x-auto">
            <table className="w-full text-center font-mono text-[10px] sm:text-[11px] border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-white/10">
                  <th className="py-1 px-2 text-left">LOCH</th>
                  {holes.map((h, idx) => (
                    <th
                      key={h.holeNumber}
                      className={`py-1 px-1 ${
                        idx === currentHoleIndex
                          ? 'text-cyan-300 font-black bg-cyan-500/15 rounded-t'
                          : ''
                      }`}
                    >
                      {h.holeNumber}
                    </th>
                  ))}
                  <th className="py-1 px-2 text-amber-300">SCHL.</th>
                  <th className="py-1 px-2 text-emerald-300">PAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr className="text-slate-400">
                  <td className="py-1 px-2 text-left font-bold">PAR</td>
                  {holes.map((h, idx) => (
                    <td
                      key={h.holeNumber}
                      className={`py-1 px-1 ${idx === currentHoleIndex ? 'bg-cyan-500/10 text-white' : ''}`}
                    >
                      {h.par}
                    </td>
                  ))}
                  <td className="py-1 px-2 font-bold text-slate-300">{coursePar}</td>
                  <td className="py-1 px-2">-</td>
                </tr>

                <tr>
                  <td className="py-1 px-2 text-left font-black text-emerald-300 truncate max-w-[110px]">
                    {p1Name}
                  </td>
                  {holes.map((h, idx) => {
                    const res = p1.completedHoles.find((c) => c.holeNumber === h.holeNumber);
                    const isCur = idx === currentHoleIndex;
                    if (!res) {
                      return (
                        <td
                          key={h.holeNumber}
                          className={`py-1 px-1 ${
                            isCur ? 'bg-cyan-500/15 text-cyan-200 font-black' : 'text-slate-600'
                          }`}
                        >
                          {isCur && p1.currentHoleStrokes > 0 ? p1.currentHoleStrokes : '·'}
                        </td>
                      );
                    }
                    const term = getGolfTermForScore(res.strokes, h.par);
                    return (
                      <td key={h.holeNumber} className="py-1 px-0.5">
                        <span
                          className={`inline-block min-w-[20px] px-1 rounded border text-[10px] font-black ${term.colorClass}`}
                        >
                          {res.strokes}
                        </span>
                      </td>
                    );
                  })}
                  <td className="py-1 px-2 font-black text-white">{p1.totalStrokes}</td>
                  <td
                    className={`py-1 px-2 font-black ${
                      p1.scoreToPar < 0
                        ? 'text-emerald-400'
                        : p1.scoreToPar === 0
                        ? 'text-white'
                        : 'text-rose-400'
                    }`}
                  >
                    {formatToPar(p1.scoreToPar)}
                  </td>
                </tr>

                <tr>
                  <td className="py-1 px-2 text-left font-black text-amber-300 truncate max-w-[110px]">
                    {p2Name}
                  </td>
                  {holes.map((h, idx) => {
                    const res = p2.completedHoles.find((c) => c.holeNumber === h.holeNumber);
                    const isCur = idx === currentHoleIndex;
                    if (!res) {
                      return (
                        <td
                          key={h.holeNumber}
                          className={`py-1 px-1 ${
                            isCur ? 'bg-cyan-500/15 text-cyan-200 font-black' : 'text-slate-600'
                          }`}
                        >
                          {isCur && p2.currentHoleStrokes > 0 ? p2.currentHoleStrokes : '·'}
                        </td>
                      );
                    }
                    const term = getGolfTermForScore(res.strokes, h.par);
                    return (
                      <td key={h.holeNumber} className="py-1 px-0.5">
                        <span
                          className={`inline-block min-w-[20px] px-1 rounded border text-[10px] font-black ${term.colorClass}`}
                        >
                          {res.strokes}
                        </span>
                      </td>
                    );
                  })}
                  <td className="py-1 px-2 font-black text-white">{p2.totalStrokes}</td>
                  <td
                    className={`py-1 px-2 font-black ${
                      p2.scoreToPar < 0
                        ? 'text-emerald-400'
                        : p2.scoreToPar === 0
                        ? 'text-white'
                        : 'text-rose-400'
                    }`}
                  >
                    {formatToPar(p2.scoreToPar)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Untere Zone: Beide Golfer-Karten + Live-Action-Banner */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_0.9fr_1fr] gap-4 flex-1 min-h-0 items-stretch">
          <div>{renderPlayerCard(1, p1Name, p1)}</div>

          <div className="flex flex-col items-center justify-center gap-2.5 px-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-amber-500/25 border-2 border-emerald-400/50 flex items-center justify-center shadow-lg">
              <span className="text-lg font-black font-mono text-emerald-300">VS</span>
            </div>
            <div className="w-full">
              <ActionBanner lastAction={lastAction} />
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-900/75 border border-white/10 text-center font-mono text-[11px] text-cyan-200 font-bold">
              ⛳ 1 Aufnahme = 1 Schlag · 💨 Überwurf = |Rest − Wurf|
            </div>
          </div>

          <div>{renderPlayerCard(2, p2Name, p2)}</div>
        </div>
      </div>

      {/* Sieger-Overlay */}
      {winnerPlayer && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="max-w-xl w-full rounded-[2.5rem] bg-slate-950/95 border-2 border-emerald-400 shadow-[0_0_80px_rgba(16,185,129,0.45)] p-7 sm:p-10 text-center space-y-5">
            <div className="text-6xl">🏆⛳</div>
            <div className="space-y-2">
              <span className="text-xs sm:text-sm font-mono font-black uppercase tracking-[0.25em] text-emerald-300">
                CLUBHAUS WEYHAUSEN · {holesCount} LÖCHER BEENDET
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {winnerPlayer === 'draw'
                  ? 'GETEILTER PLATZ 1!'
                  : `GREEN JACKET FÜR ${(winnerName || '').toUpperCase()}!`}
              </h2>
              <p className="text-sm sm:text-base text-amber-300 font-semibold">
                {p1Name}: {p1.totalStrokes} Schläge ({formatToPar(p1.scoreToPar)}) • {p2Name}:{' '}
                {p2.totalStrokes} Schläge ({formatToPar(p2.scoreToPar)})
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10 font-mono">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase">Gesamtschläge</div>
                <div className="text-xl font-black text-white">
                  {winnerPlayer === 2 ? p2.totalStrokes : p1.totalStrokes}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase">Score (To Par)</div>
                <div className="text-xl font-black text-emerald-300">
                  {formatToPar(winnerPlayer === 2 ? p2.scoreToPar : p1.scoreToPar)}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase">Birdies / Eagles</div>
                <div className="text-xl font-black text-amber-300">
                  {winnerPlayer === 2
                    ? p2.eaglesOrBetter + p2.birdies
                    : p1.eaglesOrBetter + p1.birdies}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-20 h-1 shrink-0" />
    </div>
  );
}
