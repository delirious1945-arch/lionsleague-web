'use client';

import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
  RudolphDartEvent,
  RudolphFinalTarget,
  RudolphLastActionBanner,
  RudolphPlayerState,
  getRudolphCheckpoints,
} from '@/app/special/rudolph/types';

export interface HolographicRudolphProps {
  boardId: string;
  p1Name: string;
  p2Name?: string;
  activeName: string;
  is1vs1: boolean;
  activePlayer: 1 | 2;
  roundNumber: number;
  finalTarget: RudolphFinalTarget;
  p1: RudolphPlayerState;
  p2?: RudolphPlayerState;
  lastAction?: RudolphLastActionBanner | null;
  winnerPlayer?: 1 | 2 | null;
  winnerName?: string | null;
  currentTime?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const SNOWFLAKES = [
  { left: '4%', size: 12, duration: '11s', delay: '-2s', opacity: 0.45 },
  { left: '10%', size: 16, duration: '14s', delay: '-7s', opacity: 0.35 },
  { left: '16%', size: 10, duration: '9.5s', delay: '-4s', opacity: 0.5 },
  { left: '22%', size: 18, duration: '16s', delay: '-11s', opacity: 0.3 },
  { left: '28%', size: 13, duration: '12s', delay: '-1s', opacity: 0.45 },
  { left: '34%', size: 11, duration: '10.5s', delay: '-6s', opacity: 0.4 },
  { left: '40%', size: 15, duration: '15s', delay: '-9s', opacity: 0.32 },
  { left: '46%', size: 12, duration: '11.5s', delay: '-3s', opacity: 0.45 },
  { left: '52%', size: 17, duration: '13.5s', delay: '-8s', opacity: 0.35 },
  { left: '58%', size: 10, duration: '10s', delay: '-5s', opacity: 0.5 },
  { left: '64%', size: 14, duration: '12.5s', delay: '-10s', opacity: 0.38 },
  { left: '70%', size: 16, duration: '14.5s', delay: '-2.5s', opacity: 0.35 },
  { left: '76%', size: 11, duration: '9.8s', delay: '-7.5s', opacity: 0.45 },
  { left: '82%', size: 18, duration: '15.5s', delay: '-4.5s', opacity: 0.3 },
  { left: '88%', size: 12, duration: '11.2s', delay: '-9.5s', opacity: 0.42 },
  { left: '93%', size: 15, duration: '13.2s', delay: '-1.5s', opacity: 0.36 },
  { left: '25%', size: 13, duration: '17s', delay: '-12s', opacity: 0.25 },
  { left: '74%', size: 14, duration: '16.5s', delay: '-13s', opacity: 0.28 },
];

function getNameSizing(name: string) {
  const parts = name.trim().split(' ');
  const firstName = parts[0] || 'Spieler';
  const lastName = parts.slice(1).join(' ') || '';
  const maxNameLen = Math.max(firstName.length, lastName.length);
  const sizeClass =
    maxNameLen > 14
      ? 'text-xl sm:text-2xl lg:text-3xl'
      : maxNameLen > 10
      ? 'text-2xl sm:text-3xl'
      : 'text-2xl sm:text-3xl lg:text-4xl';
  return { firstName, lastName, sizeClass };
}

function CurrentTurnRow({
  darts,
  isActive,
  accentColor = 'red',
}: {
  darts: RudolphDartEvent[];
  isActive: boolean;
  accentColor?: 'red' | 'amber';
}) {
  const pulseBorder =
    accentColor === 'amber'
      ? 'bg-amber-500/10 border-amber-400/75 text-amber-300 animate-pulse'
      : 'bg-red-500/10 border-red-400/75 text-red-300 animate-pulse';

  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {[0, 1, 2].map((idx) => {
        const ev = darts[idx];
        if (ev) {
          const cls =
            ev.kind === 'win'
              ? 'bg-amber-500/30 border-amber-300 text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.45)]'
              : ev.kind === 'hit'
              ? 'bg-emerald-500/25 border-emerald-400 text-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.35)]'
              : 'bg-red-950/75 border-red-500/65 text-red-200';
          return (
            <div key={idx} className={`py-2 px-1.5 rounded-xl border-2 text-center font-mono transition-all ${cls}`}>
              <div className="text-xs sm:text-sm font-black leading-tight truncate">{ev.label}</div>
              <div className="text-[10px] font-bold opacity-90 truncate">{ev.subLabel}</div>
            </div>
          );
        }
        return (
          <div
            key={idx}
            className={`py-2 px-1.5 rounded-xl border border-dashed text-center font-mono flex flex-col items-center justify-center ${
              isActive && idx === darts.length
                ? pulseBorder
                : 'bg-slate-950/60 border-white/15 text-slate-500'
            }`}
          >
            <div className="text-xs font-black">Dart {idx + 1}</div>
            <div className="text-[10px]">•</div>
          </div>
        );
      })}
    </div>
  );
}

function ActionBannerBox({ lastAction }: { lastAction?: RudolphLastActionBanner | null }) {
  if (!lastAction) {
    return (
      <div className="rounded-2xl bg-slate-900/70 border border-white/15 px-4 py-3 text-center backdrop-blur-xl">
        <div className="text-xs font-mono uppercase tracking-widest text-amber-300 font-black">
          🦌 Bereit zum Abflug
        </div>
        <div className="text-xs sm:text-sm text-slate-200 mt-0.5">
          Treffer = Sofort weiter zur nächsten Etappe!
        </div>
      </div>
    );
  }

  let boxCls = 'bg-slate-900/80 border-white/20 text-slate-100';
  if (lastAction.tone === 'turbo' || lastAction.tone === 'win') {
    boxCls =
      'bg-amber-950/85 border-amber-400 text-amber-100 shadow-[0_0_35px_rgba(251,191,36,0.45)] animate-pulse';
  } else if (lastAction.tone === 'hit') {
    boxCls =
      'bg-emerald-950/80 border-emerald-400 text-emerald-100 shadow-[0_0_28px_rgba(16,185,129,0.38)]';
  } else if (lastAction.tone === 'miss') {
    boxCls = 'bg-red-950/70 border-red-500/65 text-red-100';
  }

  return (
    <div className={`rounded-2xl border-2 px-4 py-3 text-center backdrop-blur-2xl transition-all ${boxCls}`}>
      <div className="text-sm sm:text-lg font-black tracking-wide uppercase leading-tight flex items-center justify-center gap-2">
        <span>{lastAction.icon}</span>
        <span>{lastAction.headline}</span>
      </div>
      <div className="text-xs sm:text-sm font-semibold opacity-95 mt-1 leading-snug">
        {lastAction.subline}
      </div>
    </div>
  );
}

export default function HolographicRudolphCockpit({
  boardId,
  p1Name,
  p2Name = 'Gastspieler',
  activeName,
  is1vs1,
  activePlayer,
  roundNumber,
  finalTarget,
  p1,
  p2,
  lastAction,
  winnerPlayer,
  winnerName,
  currentTime,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicRudolphProps) {
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
  const safeP2 = p2 || p1;
  const checkpoints = getRudolphCheckpoints(finalTarget);

  const p1Pct = Math.min(96, Math.max(4, Math.round((p1.completedSteps / 5) * 92 + 4)));
  const p2Pct = Math.min(96, Math.max(4, Math.round((safeP2.completedSteps / 5) * 92 + 4)));

  const renderPlayerCard = (playerNum: 1 | 2, name: string, state: RudolphPlayerState) => {
    const isP1 = playerNum === 1;
    const isAct = !winnerPlayer && activePlayer === playerNum;
    const isWin = winnerPlayer === playerNum;
    const { firstName, lastName, sizeClass } = getNameSizing(name);
    const nextCp =
      state.completedSteps >= 5
        ? checkpoints[4]
        : checkpoints[Math.min(4, state.completedSteps)];

    return (
      <div
        className={`relative flex flex-col justify-between rounded-[2rem] backdrop-blur-3xl border-2 p-4 sm:p-5 transition-all duration-500 overflow-hidden h-full ${
          isWin
            ? 'bg-slate-900/85 border-amber-400 shadow-[0_0_55px_rgba(251,191,36,0.5)]'
            : isAct
            ? isP1
              ? 'bg-slate-900/80 border-red-400/90 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_38px_rgba(239,68,68,0.38)]'
              : 'bg-slate-900/80 border-amber-400/90 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_38px_rgba(251,191,36,0.38)]'
            : 'bg-slate-900/45 border-white/15 opacity-80'
        }`}
      >
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
            isP1 ? 'from-red-500 to-rose-400' : 'from-amber-400 to-yellow-300'
          }`}
        />

        <div className="flex items-start justify-between gap-2 pt-1">
          <div className="min-w-0">
            <span
              className={`inline-block text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border mb-1.5 ${
                isP1
                  ? 'bg-red-500/15 border-red-400/50 text-red-300'
                  : 'bg-amber-500/15 border-amber-400/50 text-amber-300'
              }`}
            >
              {is1vs1 ? (isP1 ? 'SCHLITTEN 1 · ROT' : 'SCHLITTEN 2 · GOLD') : 'SOLO-FLUG'}
            </span>
            <div className={`${sizeClass} font-black text-white leading-none truncate`}>
              {firstName}{' '}
              {lastName && <span className="text-lg sm:text-xl font-bold text-slate-300">{lastName}</span>}
            </div>
          </div>

          <div className="text-right shrink-0 font-mono">
            <span className="text-[10px] text-slate-400 uppercase block">Etappe</span>
            <span className={`text-3xl sm:text-4xl font-black ${isP1 ? 'text-[#ff4d6d]' : 'text-[#fbbf24]'}`}>
              {state.completedSteps}
              <span className="text-sm text-slate-400">/5</span>
            </span>
          </div>
        </div>

        {/* Aktuelles Ziel-Feld */}
        <div className="my-2 p-3.5 rounded-2xl bg-slate-950/75 border border-white/15 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-400 block">
              {state.completedSteps >= 5 ? 'ZIEL ERREICHT' : `NÄCHSTES ZIEL (${nextCp.location})`}
            </span>
            <span className="text-lg sm:text-2xl font-black text-white flex items-center gap-2 mt-0.5">
              <span>{nextCp.icon}</span>
              <span className="text-emerald-300 font-mono">{nextCp.targetLabel}</span>
            </span>
            <span className="text-[11px] text-slate-300 block">{nextCp.ruleHint}</span>
          </div>

          <div className="text-right font-mono shrink-0">
            <span className="text-[10px] text-slate-400 block uppercase">Darts</span>
            <span className="text-2xl font-black text-cyan-300">{state.dartsThrown}</span>
          </div>
        </div>

        {/* Status + 3-Dart-Slots */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            {isWin ? (
              <span className="text-xs font-mono font-black text-amber-300">🏆 IN WEYHAUSEN GELANDET!</span>
            ) : isAct ? (
              <span className={`text-xs font-mono font-black flex items-center gap-1.5 ${isP1 ? 'text-red-300' : 'text-amber-300'}`}>
                <span className={`w-2 h-2 rounded-full animate-ping ${isP1 ? 'bg-red-400' : 'bg-amber-400'}`} />
                <span>🎯 AM WURF</span>
              </span>
            ) : (
              <span className="text-xs font-mono font-bold text-slate-400">WARTET</span>
            )}
          </div>

          <CurrentTurnRow
            darts={state.currentTurnDarts || []}
            isActive={isAct}
            accentColor={isP1 ? 'red' : 'amber'}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-[#040711] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 overflow-hidden select-none font-sans">
      {/* God Rays & Schneefall */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-[14%] w-[28vw] h-[130vh] bg-gradient-to-b from-red-500/20 via-rose-600/05 to-transparent rotate-[18deg] blur-2xl opacity-70" />
        <div className="absolute -top-32 right-[14%] w-[28vw] h-[130vh] bg-gradient-to-b from-amber-400/20 via-amber-500/05 to-transparent -rotate-[18deg] blur-2xl opacity-70" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] bg-cyan-600/10 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:48px_48px] opacity-30" />

        {SNOWFLAKES.map((flake, i) => (
          <span
            key={i}
            className="animate-lions-snow absolute -top-6 text-slate-100 select-none"
            style={{
              left: flake.left,
              fontSize: `${flake.size}px`,
              animationDuration: flake.duration,
              animationDelay: flake.delay,
              opacity: flake.opacity,
            }}
          >
            ❄
          </span>
        ))}
      </div>

      {/* Top Header */}
      <div className="relative z-20 flex items-center justify-between w-full px-2 shrink-0">
        <div className="w-36 hidden sm:block">
          <span className="text-xs font-mono font-bold tracking-widest text-amber-400">
            LIONS SPECIAL
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-5 py-2 rounded-full bg-slate-900/75 backdrop-blur-2xl border border-amber-400/40 shadow-[0_0_25px_rgba(251,191,36,0.28)]">
          <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-cyan-300">
            BOARD {boardId}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-xs sm:text-sm font-black tracking-wider text-amber-300 uppercase">
            🦌 RUDOLPHS FLUG NACH WEYHAUSEN
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-emerald-300">
            RUNDE {roundNumber}
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
      <div className="relative z-10 flex-1 flex flex-col justify-between gap-4 min-h-0 py-3 max-w-[1540px] w-full mx-auto">
        {/* Obere Zone: Horizontales 5-Etappen-Flug-Radar & Schlitten-Spuren */}
        <div className="rounded-[2rem] bg-slate-900/65 backdrop-blur-3xl border border-white/15 p-4 sm:p-6 shadow-2xl space-y-5">
          {/* 5 Checkpoints */}
          <div className="relative grid grid-cols-5 gap-2 sm:gap-4 items-stretch">
            {/* Verbindungslinie im Hintergrund */}
            <div className="pointer-events-none hidden sm:block absolute top-1/2 left-[10%] right-[10%] h-1 -translate-y-1/2 bg-gradient-to-r from-cyan-500/30 via-emerald-400/40 to-amber-400/50 rounded-full" />

            {checkpoints.map((cp) => {
              const p1Passed = p1.completedSteps >= cp.step;
              const p2Passed = is1vs1 && safeP2.completedSteps >= cp.step;
              const p1AtThis = !winnerPlayer && p1.completedSteps === cp.step - 1;
              const p2AtThis = is1vs1 && !winnerPlayer && safeP2.completedSteps === cp.step - 1;

              return (
                <div
                  key={cp.step}
                  className={`relative z-10 rounded-2xl p-2.5 sm:p-3.5 border-2 text-center flex flex-col items-center justify-between transition-all ${
                    p1AtThis || p2AtThis
                      ? 'bg-slate-950/90 border-cyan-400/70 shadow-[0_0_22px_rgba(6,182,212,0.28)]'
                      : p1Passed || p2Passed
                      ? 'bg-slate-950/85 border-emerald-400/50'
                      : 'bg-slate-950/65 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between w-full text-[10px] font-mono font-black">
                    <span className="text-slate-400">#{cp.step}</span>
                    <div className="flex items-center gap-1">
                      <span
                        className={`w-2.5 h-2.5 rounded-full border ${
                          p1Passed
                            ? 'bg-red-500 border-red-300 shadow-[0_0_8px_#ef4444]'
                            : 'bg-slate-800 border-white/20'
                        }`}
                      />
                      {is1vs1 && (
                        <span
                          className={`w-2.5 h-2.5 rounded-full border ${
                            p2Passed
                              ? 'bg-amber-400 border-amber-200 shadow-[0_0_8px_#fbbf24]'
                              : 'bg-slate-800 border-white/20'
                          }`}
                        />
                      )}
                    </div>
                  </div>

                  <div className="text-2xl sm:text-3xl my-1">{cp.icon}</div>
                  <div className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider leading-tight">
                    {cp.location}
                  </div>
                  <div className="mt-1 px-2 py-0.5 rounded-lg bg-white/5 border border-white/15 font-mono text-xs sm:text-sm font-black text-emerald-300">
                    {cp.targetLabel}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Parallele Schlitten-Flugspuren */}
          <div className="space-y-3">
            {/* Spur Spieler 1 */}
            <div className="flex items-center gap-3">
              <div className="w-32 sm:w-44 shrink-0 flex items-center justify-between text-xs font-mono font-black text-red-300 truncate">
                <span className="truncate">{p1Name}</span>
                <span>{p1.completedSteps}/5</span>
              </div>
              <div className="relative flex-1 h-7 rounded-full bg-slate-950/90 border border-red-400/40 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600/80 via-rose-500/80 to-red-400 transition-all duration-700"
                  style={{ width: `${(p1.completedSteps / 5) * 100}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-lg sm:text-xl transition-all duration-700 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]"
                  style={{ left: `${p1Pct}%` }}
                >
                  🦌🛷
                </div>
              </div>
            </div>

            {/* Spur Spieler 2 */}
            {is1vs1 && (
              <div className="flex items-center gap-3">
                <div className="w-32 sm:w-44 shrink-0 flex items-center justify-between text-xs font-mono font-black text-amber-300 truncate">
                  <span className="truncate">{p2Name}</span>
                  <span>{safeP2.completedSteps}/5</span>
                </div>
                <div className="relative flex-1 h-7 rounded-full bg-slate-950/90 border border-amber-400/40 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600/80 via-amber-500/80 to-yellow-300 transition-all duration-700"
                    style={{ width: `${(safeP2.completedSteps / 5) * 100}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-lg sm:text-xl transition-all duration-700 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                    style={{ left: `${p2Pct}%` }}
                  >
                    🦌🛷
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Untere Zone */}
        {is1vs1 ? (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_0.95fr_1fr] gap-4 flex-1 min-h-0 items-stretch">
            <div>{renderPlayerCard(1, p1Name, p1)}</div>

            <div className="flex flex-col items-center justify-center gap-3 px-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/25 to-amber-500/25 border-2 border-amber-400/50 flex items-center justify-center shadow-lg">
                <span className="text-xl font-black font-mono text-amber-300">VS</span>
              </div>
              <div className="w-full">
                <ActionBannerBox lastAction={lastAction} />
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-slate-900/70 border border-white/10 text-center font-mono text-[11px] text-cyan-200 font-bold">
                🚀 Treffer = Sofort weiter zur nächsten Etappe!
              </div>
            </div>

            <div>{renderPlayerCard(2, p2Name, safeP2)}</div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4 flex-1 min-h-0 items-stretch">
            <div className="col-span-6">{renderPlayerCard(1, p1Name, p1)}</div>
            <div className="col-span-6 flex flex-col justify-center gap-4">
              <ActionBannerBox lastAction={lastAction} />
              <div className="rounded-2xl bg-slate-900/65 border border-white/10 p-4 text-center font-mono text-xs text-slate-300">
                🚀 <strong>Multi-Pass-Regel:</strong> Schaffst du eine Station mit Dart 1, fliegst du direkt
                mit Dart 2 auf den nächsten Checkpoint! Beste Aufnahme: <strong className="text-amber-300">{p1.bestTurnSteps} Etappen</strong>.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sieger-Overlay */}
      {winnerName && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm">
          <div className="max-w-xl w-full rounded-[2.5rem] bg-slate-950/92 border-2 border-amber-400 shadow-[0_0_80px_rgba(251,191,36,0.45)] p-7 sm:p-10 text-center space-y-5">
            <div className="text-6xl">🏆🦌</div>
            <div className="space-y-2">
              <span className="text-xs sm:text-sm font-mono font-black uppercase tracking-[0.25em] text-amber-300">
                LANDUNG IN WEYHAUSEN!
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                SIEG FÜR {winnerName.toUpperCase()}!
              </h2>
              <p className="text-sm sm:text-base text-emerald-300 font-semibold">
                🏟️ Rudolph ist sicher auf der Lions-Landebahn gelandet!
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10 font-mono">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase">Runden</div>
                <div className="text-xl font-black text-white">{roundNumber}</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase">Darts</div>
                <div className="text-xl font-black text-cyan-300">
                  {winnerPlayer === 2 ? safeP2.dartsThrown : p1.dartsThrown}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase">Turbo (Max)</div>
                <div className="text-xl font-black text-amber-300">
                  {winnerPlayer === 2 ? safeP2.bestTurnSteps : p1.bestTurnSteps} / Aufn.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-20 h-2 shrink-0" />
    </div>
  );
}
