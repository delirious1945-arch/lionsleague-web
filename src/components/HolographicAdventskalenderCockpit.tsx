'use client';

import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
  AdventsCurseType,
  AdventsDartEvent,
  AdventsDoorState,
  AdventsLastActionBanner,
  AdventsPlayerState,
  countOpenDoors,
  getDoorTargetLabel,
} from '@/app/special/adventskalender/types';

export interface HolographicAdventskalenderProps {
  boardId: string;
  p1Name: string;
  p2Name?: string;
  activeName: string;
  is1vs1: boolean;
  activePlayer: 1 | 2;
  roundNumber: number;
  maxRounds: number | null;
  isSuddenDeath: boolean;
  doors: AdventsDoorState[];
  p1: AdventsPlayerState;
  p2?: AdventsPlayerState;
  lastAction?: AdventsLastActionBanner | null;
  winnerPlayer?: 1 | 2 | 'draw' | null;
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
      ? 'text-2xl sm:text-3xl lg:text-3xl'
      : 'text-2xl sm:text-3xl lg:text-4xl';
  return { firstName, lastName, sizeClass };
}

function getDartChipStyle(ev: AdventsDartEvent) {
  if (ev.tone === 'jackpot') {
    return 'bg-amber-500/25 border-amber-300 text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.4)]';
  }
  if (ev.tone === 'good') {
    return 'bg-emerald-500/25 border-emerald-400 text-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.35)]';
  }
  if (ev.tone === 'grinch') {
    return 'bg-purple-500/25 border-rose-400 text-purple-100 shadow-[0_0_16px_rgba(192,132,252,0.4)]';
  }
  if (ev.tone === 'curse') {
    return 'bg-sky-500/25 border-sky-400 text-sky-100 shadow-[0_0_16px_rgba(56,189,248,0.4)]';
  }
  return 'bg-red-950/75 border-red-500/65 text-red-200';
}

const CURSE_BADGE_META: Record<
  AdventsCurseType,
  { icon: string; badge: string; short: string; cls: string }
> = {
  one_dart: {
    icon: '🎯',
    badge: 'NUR 1 DART',
    short: 'Nur 1 Dart',
    cls: 'bg-rose-600/35 border-rose-400 text-rose-100',
  },
  two_darts: {
    icon: '❄️',
    badge: 'NUR 2 DARTS',
    short: 'Nur 2 Darts',
    cls: 'bg-sky-600/30 border-sky-400 text-sky-100',
  },
  sitting: {
    icon: '🪑',
    badge: 'IM SITZEN',
    short: 'Im Sitzen',
    cls: 'bg-amber-600/30 border-amber-400 text-amber-100',
  },
  skip_round: {
    icon: '⛄',
    badge: 'RUNDE AUSSETZEN',
    short: 'Aussetzen',
    cls: 'bg-cyan-600/35 border-cyan-300 text-cyan-50',
  },
  spin_360: {
    icon: '🌪️',
    badge: '360° DREHWURM',
    short: '360° Drehwurm',
    cls: 'bg-purple-600/35 border-purple-400 text-purple-100',
  },
  wrong_hand: {
    icon: '🧦',
    badge: 'FALSCHE HAND',
    short: 'Falsche Hand',
    cls: 'bg-red-600/30 border-red-400 text-red-100',
  },
};

function CurrentTurnRow({
  darts,
  isActive,
  activeCurses = [],
  accentColor = 'red',
}: {
  darts: AdventsDartEvent[];
  isActive: boolean;
  activeCurses?: AdventsCurseType[];
  accentColor?: 'red' | 'amber';
}) {
  if (activeCurses.includes('skip_round')) {
    return (
      <div className="relative overflow-hidden rounded-xl border-2 border-cyan-300/85 bg-gradient-to-r from-sky-950/95 via-cyan-900/85 to-sky-950/95 px-3 py-2.5 text-center font-mono shadow-[0_0_24px_rgba(56,189,248,0.45)] animate-pulse">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.22),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(186,230,253,0.25),transparent_45%)]" />
        <div className="relative z-10 flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-cyan-100">
          <span className="animate-bounce">⛄</span>
          <span>SCHNEEWEHE · RUNDE AUSSETZEN</span>
          <span className="animate-bounce">❄️</span>
        </div>
        <div className="relative z-10 text-[10px] font-bold text-cyan-200/90 mt-0.5">
          0 Darts · Eingeschneit!
        </div>
      </div>
    );
  }

  const hasOneDartCurse = activeCurses.includes('one_dart');
  const hasTwoDartsCurse = activeCurses.includes('two_darts');
  const pulseBorder =
    accentColor === 'amber'
      ? 'bg-amber-500/10 border-amber-400/75 text-amber-300 animate-pulse'
      : 'bg-red-500/10 border-red-400/75 text-red-300 animate-pulse';

  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {[0, 1, 2].map((idx) => {
        if ((hasOneDartCurse && idx >= 1) || (hasTwoDartsCurse && idx === 2)) {
          return (
            <div
              key={idx}
              className="py-2 px-1.5 rounded-xl border-2 border-sky-400/70 bg-sky-950/75 text-center font-mono text-sky-200 flex flex-col items-center justify-center"
            >
              <div className="text-xs font-black leading-tight">
                {hasOneDartCurse ? '🎯' : '❄️'}
              </div>
              <div className="text-[10px] font-black uppercase leading-tight">
                {hasOneDartCurse ? 'GESPERRT' : 'EINGEFROREN'}
              </div>
            </div>
          );
        }

        const ev = darts[idx];
        if (ev) {
          return (
            <div
              key={idx}
              className={`py-2 px-1.5 rounded-xl border-2 text-center font-mono transition-all ${getDartChipStyle(ev)}`}
            >
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

function ActionBannerBox({ lastAction }: { lastAction?: AdventsLastActionBanner | null }) {
  if (!lastAction) {
    return (
      <div className="rounded-2xl bg-slate-900/70 border border-amber-400/30 px-4 py-2.5 text-center backdrop-blur-xl">
        <div className="text-xs font-mono uppercase tracking-widest text-amber-300 font-black">
          🚪 24-Türchen Kalender bereit
        </div>
        <div className="text-xs sm:text-sm text-slate-200 mt-0.5">
          Wirf die Zahlen 1–20, Doppel (21), Triple (22) oder Bull (23/24), um die Türchen zu öffnen!
        </div>
      </div>
    );
  }

  let boxCls = 'bg-slate-900/85 border-white/25 text-slate-100';
  if (lastAction.tone === 'grinch') {
    boxCls =
      'bg-gradient-to-r from-purple-950/90 via-rose-950/85 to-purple-950/90 border-purple-400 text-purple-100 shadow-[0_0_38px_rgba(192,132,252,0.5)] animate-pulse';
  } else if (lastAction.tone === 'curse') {
    boxCls =
      'bg-gradient-to-r from-sky-950/90 via-cyan-950/85 to-sky-950/90 border-sky-400 text-sky-100 shadow-[0_0_35px_rgba(56,189,248,0.45)] animate-pulse';
  } else if (lastAction.tone === 'jackpot' || lastAction.tone === 'win') {
    boxCls =
      'bg-gradient-to-r from-amber-950/90 via-yellow-950/80 to-amber-950/90 border-amber-400 text-amber-100 shadow-[0_0_35px_rgba(251,191,36,0.45)]';
  } else if (lastAction.tone === 'good') {
    boxCls =
      'bg-gradient-to-r from-emerald-950/85 via-teal-950/80 to-emerald-950/85 border-emerald-400 text-emerald-100 shadow-[0_0_28px_rgba(16,185,129,0.38)]';
  } else if (lastAction.tone === 'niete' || lastAction.tone === 'miss') {
    boxCls = 'bg-red-950/75 border-red-500/70 text-red-100';
  }

  return (
    <div className={`rounded-2xl border-2 px-4 py-2.5 text-center backdrop-blur-2xl transition-all ${boxCls}`}>
      <div className="text-sm sm:text-base lg:text-lg font-black tracking-wide uppercase leading-tight flex items-center justify-center gap-2 flex-wrap">
        <span className="text-lg sm:text-xl">{lastAction.icon}</span>
        {lastAction.doorNumber && (
          <span className="px-2 py-0.5 rounded-md bg-black/35 border border-white/20 font-mono text-xs">
            TÜR #{lastAction.doorNumber}
          </span>
        )}
        <span>{lastAction.headline}</span>
      </div>
      <div className="text-xs sm:text-sm font-semibold opacity-95 mt-0.5 leading-snug">
        {lastAction.subline}
      </div>
    </div>
  );
}

function CalendarGrid({
  doors,
  highlightedDoor,
  is1vs1,
}: {
  doors: AdventsDoorState[];
  highlightedDoor?: number | null;
  is1vs1: boolean;
}) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-2.5 w-full">
      {doors.map((door) => {
        const isHighlighted = highlightedDoor === door.number;
        const target = getDoorTargetLabel(door.number);

        if (!door.isOpen) {
          return (
            <div
              key={door.number}
              className={`relative min-h-[68px] sm:min-h-[78px] lg:min-h-[86px] rounded-xl sm:rounded-2xl flex flex-col items-center justify-center p-1.5 sm:p-2 overflow-hidden border-2 ${
                target.isSpecial
                  ? 'bg-gradient-to-br from-[#1f1238] via-[#120d26] to-[#0b0914] border-cyan-300/70 shadow-[0_8px_24px_rgba(0,0,0,0.65),inset_0_0_16px_rgba(34,211,238,0.18)]'
                  : 'bg-gradient-to-br from-[#3b0d14] via-[#1c0910] to-[#0b0914] border-amber-400/55 shadow-[0_8px_24px_rgba(0,0,0,0.65),inset_0_0_16px_rgba(251,191,36,0.16)]'
              }`}
            >
              {/* Goldener / Cyan Innenrahmen (Kalendertür-Optik) */}
              <div
                className={`pointer-events-none absolute inset-1 rounded-lg sm:rounded-xl border border-dashed ${
                  target.isSpecial ? 'border-cyan-300/40' : 'border-amber-300/35'
                }`}
              />
              {/* Kerzenschimmer oben */}
              <div
                className={`pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-6 blur-lg rounded-full ${
                  target.isSpecial ? 'bg-cyan-400/25' : 'bg-amber-400/20'
                }`}
              />
              {/* Kleiner Türgriff rechts */}
              <div
                className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
                  target.isSpecial
                    ? 'bg-cyan-300 shadow-[0_0_8px_#22d3ee]'
                    : 'bg-amber-300 shadow-[0_0_8px_#fbbf24]'
                }`}
              />

              {target.isSpecial ? (
                <>
                  <span className="relative z-10 text-[10px] font-mono font-black text-cyan-300/90 leading-none">
                    #{door.number}
                  </span>
                  <span className="relative z-10 text-xs sm:text-sm lg:text-base font-black font-mono text-white tracking-tight leading-tight mt-0.5 drop-shadow-[0_2px_10px_rgba(34,211,238,0.45)]">
                    {target.label}
                  </span>
                  <span className="relative z-10 text-[9px] font-mono font-bold text-cyan-200/80 leading-tight truncate max-w-full">
                    {target.subLabel}
                  </span>
                </>
              ) : (
                <>
                  <span className="relative z-10 text-2xl sm:text-3xl lg:text-[2rem] font-black font-mono text-amber-200 leading-none drop-shadow-[0_2px_12px_rgba(251,191,36,0.5)]">
                    {door.number}
                  </span>
                  <span className="relative z-10 text-[8px] sm:text-[9px] font-mono uppercase tracking-wider text-amber-400/80 font-bold mt-0.5">
                    {target.subLabel}
                  </span>
                </>
              )}
            </div>
          );
        }

        const ownerBorder = !is1vs1
          ? 'border-red-400/80 shadow-[0_0_18px_rgba(239,68,68,0.28)]'
          : door.openedBy === 1
          ? 'border-red-400/85 shadow-[0_0_18px_rgba(239,68,68,0.3)]'
          : 'border-amber-400/85 shadow-[0_0_18px_rgba(251,191,36,0.3)]';

        const ownerPillCls =
          !is1vs1 || door.openedBy === 1
            ? 'bg-red-500/25 text-red-200 border-red-400/50'
            : 'bg-amber-500/25 text-amber-200 border-amber-400/50';

        const toneBadgeCls =
          door.reward.tone === 'jackpot'
            ? 'text-amber-300'
            : door.reward.tone === 'good'
            ? 'text-emerald-300'
            : door.reward.tone === 'grinch'
            ? 'text-purple-300'
            : door.reward.tone === 'curse'
            ? 'text-sky-300'
            : 'text-red-300';

        return (
          <div
            key={door.number}
            className={`relative min-h-[68px] sm:min-h-[78px] lg:min-h-[86px] rounded-xl sm:rounded-2xl bg-slate-950/90 border-2 ${ownerBorder} ${
              isHighlighted ? 'ring-2 ring-amber-300 scale-[1.03] animate-pulse' : ''
            } flex flex-col items-center justify-between p-1.5 sm:p-2 text-center transition-all`}
          >
            <div className="flex items-center justify-between w-full text-[9px] sm:text-[10px] font-mono font-black gap-1">
              <span className="text-slate-400 truncate">
                #{door.number}
                {target.isSpecial ? `·${target.label}` : ''}
              </span>
              {is1vs1 && door.openedBy && (
                <span className={`px-1 rounded border text-[9px] shrink-0 ${ownerPillCls}`}>
                  P{door.openedBy}
                </span>
              )}
            </div>

            <div className="text-xl sm:text-2xl leading-none my-auto">
              {door.reward.icon}
            </div>

            <div className={`text-[9px] sm:text-[10px] font-mono font-black uppercase leading-tight truncate max-w-full ${toneBadgeCls}`}>
              {door.reward.shortBadge}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function HolographicAdventskalenderCockpit({
  boardId,
  p1Name,
  p2Name = 'Gastspieler',
  activeName,
  is1vs1,
  activePlayer,
  roundNumber,
  maxRounds,
  isSuddenDeath,
  doors,
  p1,
  p2,
  lastAction,
  winnerPlayer,
  winnerName,
  currentTime,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicAdventskalenderProps) {
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
  const openCount = countOpenDoors(doors);

  const totalDoors = doors.length || 24;

  const renderCurseBadges = (state: AdventsPlayerState) => {
    const active = state.activeCurses || [];
    const pending = state.pendingCurses || [];
    const shields = state.shieldsCount ?? 0;

    if (active.length === 0 && pending.length === 0 && shields <= 0) return null;

    return (
      <div className="space-y-1.5 pt-1">
        {shields > 0 && (
          <div className="px-3 py-1 rounded-xl bg-emerald-500/25 border-2 border-emerald-300 text-emerald-100 font-mono text-[11px] font-black text-center shadow-[0_0_16px_rgba(16,185,129,0.35)]">
            🛡️ SCHUTZSCHILD ×{shields}
          </div>
        )}
        {active.map((curse) => {
          const meta = CURSE_BADGE_META[curse];
          if (!meta) return null;
          return (
            <div
              key={`act-${curse}`}
              className={`px-3 py-1.5 rounded-xl border-2 font-mono text-[11px] font-black text-center animate-pulse ${meta.cls}`}
            >
              {meta.icon} AKTIVER FLUCH: {meta.badge}!
            </div>
          );
        })}
        {pending.length > 0 && (
          <div className="px-2.5 py-1 rounded-lg bg-slate-950/75 border border-sky-400/40 text-sky-200 font-mono text-[10px] font-bold text-center">
            ⏳ Nächste Aufn.:{' '}
            {pending
              .map((c) => {
                const meta = CURSE_BADGE_META[c];
                return meta ? `${meta.icon} ${meta.short}` : c;
              })
              .join(' + ')}
          </div>
        )}
      </div>
    );
  };

  const renderPlayerWing = (
    playerNum: 1 | 2,
    name: string,
    state: AdventsPlayerState
  ) => {
    const isP1 = playerNum === 1;
    const isAct = !winnerPlayer && activePlayer === playerNum;
    const isWinner = winnerPlayer === playerNum;
    const { firstName, lastName, sizeClass } = getNameSizing(name);

    return (
      <div
        className={`relative flex flex-col justify-between rounded-[2rem] backdrop-blur-3xl border-2 p-5 sm:p-6 transition-all duration-500 overflow-hidden h-full max-h-[80vh] ${
          isWinner
            ? 'bg-slate-900/85 border-amber-400 shadow-[0_0_55px_rgba(251,191,36,0.5)]'
            : isAct
            ? isP1
              ? 'bg-slate-900/80 border-red-400/90 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_45px_rgba(239,68,68,0.4)]'
              : 'bg-slate-900/80 border-amber-400/90 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_45px_rgba(251,191,36,0.38)]'
            : 'bg-slate-900/45 border-white/15 opacity-80 shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
        }`}
      >
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
            isP1 ? 'from-red-500 to-rose-400' : 'from-amber-400 to-yellow-300'
          }`}
        />

        {/* Name & Status */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-black tracking-wider border ${
                isP1
                  ? 'bg-red-500/15 border-red-400/50 text-red-300'
                  : 'bg-amber-500/15 border-amber-400/50 text-amber-300'
              }`}
            >
              {isP1 ? 'SPIELER 1 · ROT' : 'SPIELER 2 · GOLD'}
            </span>
          </div>

          <div className="flex flex-col">
            <span className={`${sizeClass} font-black text-white tracking-tight leading-none truncate`}>
              {firstName}
            </span>
            {lastName && (
              <span className="text-xl sm:text-2xl font-extrabold text-slate-300 leading-none mt-1 truncate">
                {lastName}
              </span>
            )}
          </div>

          <div>
            {isWinner ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/25 border-2 border-amber-400 text-amber-200 font-mono text-xs font-black">
                🏆 KALENDERSIEGER
              </span>
            ) : isAct ? (
              <span
                className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border-2 font-mono text-xs font-black ${
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
              <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-slate-950/60 border border-white/15 text-slate-400 font-mono text-xs font-bold">
                WARTET
              </span>
            )}
          </div>

          {renderCurseBadges(state)}
        </div>

        {/* Riesen-Punktestand & Stats */}
        <div className="my-auto py-4 border-y border-white/10 space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
              Punkte
            </span>
            <span
              className={`text-5xl sm:text-6xl font-black font-mono leading-none ${
                isP1
                  ? 'text-[#ff4d6d] drop-shadow-[0_0_25px_rgba(239,68,68,0.8)]'
                  : 'text-[#fbbf24] drop-shadow-[0_0_25px_rgba(251,191,36,0.75)]'
              }`}
            >
              {state.score}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-center">
              <div className="text-[10px] text-slate-400 uppercase">🚪 Türchen</div>
              <div className="text-lg font-black text-white">{state.doorsOpened}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-center">
              <div className="text-[10px] text-slate-400 uppercase">🎯 Darts</div>
              <div className="text-lg font-black text-cyan-300">{state.dartsThrown}</div>
            </div>
          </div>
        </div>

        {/* Aktuelle 3-Dart-Aufnahme */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
            Aufnahme
          </span>
          <CurrentTurnRow
            darts={state.currentTurnDarts || []}
            isActive={isAct}
            activeCurses={state.activeCurses || []}
            accentColor={isP1 ? 'red' : 'amber'}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-[#040711] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 overflow-hidden select-none font-sans">
      {/* Festliche God Rays & Schneefall */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-[14%] w-[28vw] h-[130vh] bg-gradient-to-b from-red-500/20 via-rose-600/05 to-transparent rotate-[18deg] blur-2xl opacity-70" />
        <div className="absolute -top-32 right-[14%] w-[28vw] h-[130vh] bg-gradient-to-b from-amber-400/20 via-amber-500/05 to-transparent -rotate-[18deg] blur-2xl opacity-70" />
        <div className="absolute top-[42%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] bg-purple-600/10 rounded-full blur-[150px]" />
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

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-5 py-2 rounded-full bg-slate-900/75 backdrop-blur-2xl border border-amber-400/45 shadow-[0_0_25px_rgba(251,191,36,0.28)]">
          <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-cyan-300">
            BOARD {boardId}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-xs sm:text-sm font-black tracking-wider text-amber-300 uppercase">
            🚪 VERHEXTER ADVENTSKALENDER
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-rose-300">
            {isSuddenDeath
              ? '🔥 SUDDEN DEATH'
              : maxRounds
              ? `RUNDE ${roundNumber}/${maxRounds}`
              : `RUNDE ${roundNumber}`}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-emerald-300">
            {openCount}/{totalDoors} OFFEN
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
          <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,1fr)_minmax(420px,1.65fr)_minmax(220px,1fr)] gap-4 lg:gap-6 items-center w-full max-w-[1540px] h-full">
            <div className="h-full flex flex-col justify-center">
              {renderPlayerWing(1, p1Name, p1)}
            </div>

            <div className="flex flex-col items-center justify-center gap-3.5 h-full max-h-[82vh]">
              <CalendarGrid
                doors={doors}
                highlightedDoor={lastAction?.doorNumber}
                is1vs1={true}
              />
              <div className="w-full">
                <ActionBannerBox lastAction={lastAction} />
              </div>
            </div>

            <div className="h-full flex flex-col justify-center">
              {renderPlayerWing(2, p2Name, safeP2)}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6 items-center w-full max-w-6xl h-full">
            <div className="col-span-4 rounded-[2rem] bg-slate-900/70 backdrop-blur-3xl border-2 border-red-400/60 p-6 flex flex-col justify-between min-h-[380px] shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
              <div>
                <span className="text-xs font-mono font-black uppercase tracking-widest text-red-400">
                  🚪 SOLO-MODUS · AM OCHE
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-white mt-2 leading-tight">
                  {activeName}
                </h2>
                {renderCurseBadges(p1)}
              </div>

              <div className="grid grid-cols-2 gap-3 border-y border-white/10 py-4 my-3">
                <div>
                  <span className="text-[11px] font-mono uppercase text-slate-400 block">
                    Punkte
                  </span>
                  <div className="text-5xl font-black font-mono text-[#ff4d6d]">
                    {p1.score}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase text-slate-400 block">
                    Türchen / Darts
                  </span>
                  <div className="text-2xl font-black font-mono text-cyan-300">
                    {openCount}/{totalDoors}
                    <span className="text-xs text-amber-300 block">{p1.dartsThrown} Darts</span>
                  </div>
                </div>
              </div>

              <CurrentTurnRow
                darts={p1.currentTurnDarts || []}
                isActive={!winnerPlayer}
                activeCurses={p1.activeCurses || []}
                accentColor="red"
              />
            </div>

            <div className="col-span-8 flex flex-col justify-center gap-4">
              <CalendarGrid
                doors={doors}
                highlightedDoor={lastAction?.doorNumber}
                is1vs1={false}
              />
              <ActionBannerBox lastAction={lastAction} />
            </div>
          </div>
        )}
      </div>

      {/* Sieger- & Unentschieden-Overlay */}
      {winnerPlayer && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm">
          <div className="max-w-xl w-full rounded-[2.5rem] bg-slate-950/92 border-2 border-amber-400 shadow-[0_0_80px_rgba(251,191,36,0.45)] p-7 sm:p-10 text-center space-y-5">
            <div className="text-6xl">{winnerPlayer === 'draw' ? '🤝' : '🏆'}</div>
            <div className="space-y-2">
              <span className="text-xs sm:text-sm font-mono font-black uppercase tracking-[0.25em] text-amber-300">
                DER VERHEXTE ADVENTSKALENDER
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {winnerPlayer === 'draw'
                  ? 'UNENTSCHIEDEN!'
                  : `SIEG FÜR ${(winnerName || activeName).toUpperCase()}!`}
              </h2>
            </div>

            {is1vs1 ? (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 font-mono">
                <div className="p-4 rounded-2xl bg-red-950/45 border border-red-400/50">
                  <div className="text-xs font-bold text-red-200 truncate">{p1Name}</div>
                  <div className="text-3xl font-black text-[#ff4d6d] mt-1">{p1.score} Pkt</div>
                  <div className="text-[11px] text-slate-300 mt-1">{p1.doorsOpened} Türchen</div>
                </div>
                <div className="p-4 rounded-2xl bg-amber-950/45 border border-amber-400/50">
                  <div className="text-xs font-bold text-amber-200 truncate">{p2Name}</div>
                  <div className="text-3xl font-black text-[#fbbf24] mt-1">{safeP2.score} Pkt</div>
                  <div className="text-[11px] text-slate-300 mt-1">{safeP2.doorsOpened} Türchen</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10 font-mono">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase">Punkte</div>
                  <div className="text-xl font-black text-[#ff4d6d]">{p1.score}</div>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase">Türchen</div>
                  <div className="text-xl font-black text-amber-300">{openCount}/{totalDoors}</div>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase">Runden</div>
                  <div className="text-xl font-black text-white">{roundNumber}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="relative z-20 h-2 shrink-0" />
    </div>
  );
}
