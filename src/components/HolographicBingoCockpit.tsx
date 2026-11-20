'use client';

import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
  BingoLastActionBanner,
  BingoPlayerState,
  findAlmostBingoIndices,
} from '@/app/special/bingo/types';

export interface HolographicBingoProps {
  boardId: string;
  p1Name: string;
  p2Name?: string;
  activeName: string;
  is1vs1: boolean;
  activePlayer: 1 | 2;
  roundNumber: number;
  p1: BingoPlayerState;
  p2?: BingoPlayerState;
  lastAction?: BingoLastActionBanner | null;
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
      ? 'text-xl sm:text-2xl'
      : maxNameLen > 10
      ? 'text-2xl sm:text-3xl'
      : 'text-2xl sm:text-3xl lg:text-4xl';
  return { firstName, lastName, sizeClass };
}

function ActionBannerBox({ lastAction }: { lastAction?: BingoLastActionBanner | null }) {
  if (!lastAction) {
    return (
      <div className="rounded-2xl bg-slate-900/70 border border-white/15 px-3.5 py-3 text-center backdrop-blur-xl">
        <div className="text-xs font-mono uppercase tracking-widest text-amber-300 font-black">
          🎱 Bingo läuft
        </div>
        <div className="text-xs text-slate-300 mt-1">
          3 Stempel in einer Reihe = BINGO!
        </div>
      </div>
    );
  }

  let boxCls = 'bg-slate-900/80 border-white/20 text-slate-100';
  if (lastAction.tone === 'bingo' || lastAction.tone === 'alarm') {
    boxCls =
      'bg-amber-950/85 border-amber-400 text-amber-100 shadow-[0_0_35px_rgba(251,191,36,0.45)] animate-pulse';
  } else if (lastAction.tone === 'stamp') {
    boxCls =
      'bg-emerald-950/80 border-emerald-400 text-emerald-100 shadow-[0_0_25px_rgba(16,185,129,0.35)]';
  } else if (lastAction.tone === 'miss') {
    boxCls = 'bg-red-950/70 border-red-500/65 text-red-100';
  }

  return (
    <div className={`rounded-2xl border-2 px-3.5 py-3 text-center backdrop-blur-2xl transition-all ${boxCls}`}>
      <div className="text-sm sm:text-base font-black tracking-wide uppercase leading-tight flex items-center justify-center gap-1.5">
        <span>{lastAction.icon}</span>
        <span>{lastAction.headline}</span>
      </div>
      <div className="text-xs font-semibold opacity-95 mt-1 leading-snug">
        {lastAction.subline}
      </div>
    </div>
  );
}

function BingoBoardMatrix({
  state,
  playerNum,
}: {
  state: BingoPlayerState;
  playerNum: 1 | 2;
}) {
  const isP1 = playerNum === 1;
  const almostIndices = findAlmostBingoIndices(state.cells);
  const winLine = state.winningLine || [];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full flex-1">
      {state.cells.map((cell, idx) => {
        const isWinCell = winLine.includes(idx);
        const isAlmost = !cell.stamped && almostIndices.includes(idx);

        let cardCls = 'bg-slate-950/70 border-white/15 text-slate-200';
        if (isWinCell) {
          cardCls =
            'bg-gradient-to-br from-amber-500/40 to-yellow-500/25 border-amber-300 text-white shadow-[0_0_26px_rgba(251,191,36,0.6)] ring-2 ring-amber-300';
        } else if (cell.stamped) {
          cardCls = isP1
            ? 'bg-gradient-to-br from-red-600/40 to-rose-700/30 border-red-400 text-white shadow-[0_0_18px_rgba(239,68,68,0.4)]'
            : 'bg-gradient-to-br from-amber-500/35 to-yellow-600/25 border-amber-400 text-white shadow-[0_0_18px_rgba(251,191,36,0.4)]';
        } else if (isAlmost) {
          cardCls =
            'bg-slate-950/90 border-amber-400 text-white shadow-[0_0_20px_rgba(251,191,36,0.35)] animate-pulse';
        }

        return (
          <div
            key={`${cell.id}-${idx}`}
            className={`relative rounded-2xl border-2 p-2 sm:p-2.5 flex flex-col items-center justify-between text-center min-h-[82px] sm:min-h-[98px] transition-all ${cardCls}`}
          >
            {/* Status-Badge oben rechts */}
            <div className="w-full flex items-center justify-between text-[10px] font-mono font-black">
              <span className="text-base leading-none">{cell.icon}</span>
              {cell.stamped ? (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                    isWinCell
                      ? 'bg-amber-300 text-slate-950'
                      : isP1
                      ? 'bg-red-400 text-slate-950'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  ★
                </span>
              ) : isAlmost ? (
                <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-black">
                  🔥 FEHLT!
                </span>
              ) : (
                <span className="text-slate-500 text-[9px]">○</span>
              )}
            </div>

            <div className="text-xs sm:text-sm font-black leading-tight my-auto px-0.5">
              {cell.label}
            </div>

            <div className="text-[9px] sm:text-[10px] font-mono text-slate-300/85 truncate max-w-full">
              {cell.shortHint}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function HolographicBingoCockpit({
  boardId,
  p1Name,
  p2Name = 'Gastspieler',
  activeName,
  is1vs1,
  activePlayer,
  roundNumber,
  p1,
  p2,
  lastAction,
  winnerPlayer,
  winnerName,
  currentTime,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicBingoProps) {
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

  const renderPlayerCard = (playerNum: 1 | 2, name: string, state: BingoPlayerState) => {
    const isP1 = playerNum === 1;
    const isAct = !winnerPlayer && activePlayer === playerNum;
    const isWinner = winnerPlayer === playerNum || state.hasBingo;
    const almostCount = findAlmostBingoIndices(state.cells).length;
    const { firstName, lastName, sizeClass } = getNameSizing(name);

    return (
      <div
        className={`relative flex flex-col justify-between rounded-[2rem] backdrop-blur-3xl border-2 p-4 sm:p-5 transition-all duration-500 overflow-hidden h-full max-h-[82vh] gap-3 ${
          isWinner
            ? 'bg-slate-900/85 border-amber-400 shadow-[0_0_55px_rgba(251,191,36,0.5)]'
            : isAct
            ? isP1
              ? 'bg-slate-900/80 border-red-400/90 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_45px_rgba(239,68,68,0.4)]'
              : 'bg-slate-900/80 border-amber-400/90 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_45px_rgba(251,191,36,0.38)]'
            : 'bg-slate-900/45 border-white/15 opacity-85'
        }`}
      >
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
            isP1 ? 'from-red-500 to-rose-400' : 'from-amber-400 to-yellow-300'
          }`}
        />

        {/* Kopfzeile */}
        <div className="flex items-start justify-between gap-2 pt-1 border-b border-white/10 pb-2.5">
          <div className="min-w-0">
            <div className={`${sizeClass} font-black text-white tracking-tight leading-none truncate`}>
              {firstName}{' '}
              {lastName && <span className="text-lg sm:text-xl font-bold text-slate-300">{lastName}</span>}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {isWinner ? (
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-amber-500/25 border border-amber-400 text-amber-200 font-mono text-[11px] font-black">
                  🎉 BINGO!
                </span>
              ) : isAct ? (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border font-mono text-[11px] font-black ${
                    isP1
                      ? 'bg-red-500/20 border-red-400 text-red-200'
                      : 'bg-amber-500/20 border-amber-400 text-amber-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full animate-ping ${
                      isP1 ? 'bg-red-400' : 'bg-amber-400'
                    }`}
                  />
                  <span>🎯 AM WURF</span>
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-950/60 border border-white/15 text-slate-400 font-mono text-[11px] font-bold">
                  WARTET
                </span>
              )}

              {almostCount > 0 && !isWinner && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-red-600/85 border border-amber-300 text-white font-mono text-[10px] font-black animate-pulse">
                  🔥 BINGO-ALARM!
                </span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0 font-mono">
            <span className="text-[10px] text-slate-400 uppercase block">Stempel</span>
            <span className={`text-3xl sm:text-4xl font-black ${isP1 ? 'text-[#ff4d6d]' : 'text-[#fbbf24]'}`}>
              {state.stampsCount}
              <span className="text-sm text-slate-400">/9</span>
            </span>
          </div>
        </div>

        {/* 3x3 Bingo-Matrix */}
        <BingoBoardMatrix state={state} playerNum={playerNum} />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-[#040711] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 overflow-hidden select-none font-sans">
      {/* God Rays & Schneefall */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-[14%] w-[28vw] h-[130vh] bg-gradient-to-b from-red-500/20 via-rose-600/05 to-transparent rotate-[18deg] blur-2xl opacity-70" />
        <div className="absolute -top-32 right-[14%] w-[28vw] h-[130vh] bg-gradient-to-b from-amber-400/20 via-amber-500/05 to-transparent -rotate-[18deg] blur-2xl opacity-70" />
        <div className="absolute top-[42%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] bg-emerald-600/10 rounded-full blur-[150px]" />
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
            🎱 WEIHNACHTS-BINGO
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

      {/* Haupt-Arena */}
      <div className="relative z-10 flex-1 flex items-center justify-center min-h-0 py-2">
        {is1vs1 ? (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(210px,0.52fr)_1fr] gap-4 lg:gap-5 items-center w-full max-w-[1540px] h-full">
            <div className="h-full flex flex-col justify-center">
              {renderPlayerCard(1, p1Name, p1)}
            </div>

            <div className="flex flex-col items-center justify-center gap-4 px-1">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/25 to-amber-500/25 border-2 border-amber-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.3)]">
                <span className="text-2xl font-black font-mono text-amber-300">VS</span>
              </div>

              <div className="w-full">
                <ActionBannerBox lastAction={lastAction} />
              </div>

              <div className="w-full px-3 py-2.5 rounded-xl bg-slate-900/75 border border-white/15 text-center font-mono text-[11px] text-amber-200 font-bold">
                ★ 3 Stempel in einer Reihe (waagerecht, senkrecht oder diagonal) = BINGO!
              </div>
            </div>

            <div className="h-full flex flex-col justify-center">
              {renderPlayerCard(2, p2Name, safeP2)}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-5 items-center w-full max-w-6xl h-full">
            <div className="col-span-4 rounded-[2rem] bg-slate-900/70 backdrop-blur-3xl border-2 border-red-400/60 p-6 flex flex-col justify-between h-[380px] shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
              <div>
                <span className="text-xs font-mono font-black uppercase tracking-widest text-red-400">
                  🎱 SOLO-BINGO · AM OCHE
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-white mt-2 leading-tight">
                  {activeName}
                </h2>
                {findAlmostBingoIndices(p1.cells).length > 0 && !winnerPlayer && (
                  <span className="inline-block mt-2 px-3 py-1 rounded-full bg-red-600 text-white font-mono text-xs font-black animate-pulse">
                    🔥 BINGO-ALARM! NUR NOCH 1 FELD!
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 border-y border-white/10 py-4">
                <div>
                  <span className="text-[11px] font-mono uppercase text-slate-400 block">
                    Stempel
                  </span>
                  <div className="text-4xl font-black font-mono text-[#ff4d6d]">
                    {p1.stampsCount}
                    <span className="text-base text-slate-400">/9</span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase text-slate-400 block">
                    Runde
                  </span>
                  <div className="text-4xl font-black font-mono text-cyan-300">
                    {roundNumber}
                  </div>
                </div>
              </div>

              <div className="text-xs font-mono text-amber-200">
                ★ 3 in einer Reihe = BINGO!
              </div>
            </div>

            <div className="col-span-5 flex flex-col justify-center h-[460px]">
              <BingoBoardMatrix state={p1} playerNum={1} />
            </div>

            <div className="col-span-3 flex flex-col justify-center gap-3">
              <ActionBannerBox lastAction={lastAction} />
            </div>
          </div>
        )}
      </div>

      {/* BINGO Sieger-Overlay */}
      {winnerName && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm">
          <div className="max-w-xl w-full rounded-[2.5rem] bg-slate-950/92 border-2 border-amber-400 shadow-[0_0_80px_rgba(251,191,36,0.5)] p-7 sm:p-10 text-center space-y-5">
            <div className="text-6xl">🎉🎱🏆</div>
            <div className="space-y-2">
              <span className="text-xs sm:text-sm font-mono font-black uppercase tracking-[0.25em] text-amber-300">
                WEIHNACHTS-BINGO!
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                BINGO!! SIEG FÜR {winnerName.toUpperCase()}!
              </h2>
              <p className="text-sm sm:text-base text-emerald-300 font-semibold">
                ★ 3 goldene Lions-Stempel in einer Reihe komplettiert!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 font-mono">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase">Runden</div>
                <div className="text-xl font-black text-white">{roundNumber}</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase">Stempel</div>
                <div className="text-xl font-black text-amber-300">
                  {winnerPlayer === 2 ? safeP2.stampsCount : p1.stampsCount} / 9
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
