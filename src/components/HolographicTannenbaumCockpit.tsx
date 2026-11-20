'use client';

import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
  TANNENBAUM_BALL_NUMBERS,
  TannenbaumBallNumber,
  TannenbaumDartEvent,
  TannenbaumLastActionBanner,
  TannenbaumNodeId,
  TannenbaumPlayerState,
  TannenbaumStarTarget,
  TannenbaumTreeState,
  countTotalLit,
  isStarUnlocked,
} from '@/app/special/tannenbaum/types';

export interface HolographicTannenbaumProps {
  boardId: string;
  p1Name: string;
  p2Name?: string;
  activeName: string;
  is1vs1: boolean;
  activePlayer: 1 | 2;
  roundNumber: number;
  tripleExtinguishEnabled: boolean;
  starTarget: TannenbaumStarTarget;
  p1: TannenbaumPlayerState;
  p2?: TannenbaumPlayerState;
  lastAction?: TannenbaumLastActionBanner | null;
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

const BALL_POSITIONS: { num: TannenbaumBallNumber; cx: number; cy: number; r: number }[] = [
  // Reihe 1 (oben)
  { num: 20, cx: 145, cy: 142, r: 24 },
  { num: 19, cx: 215, cy: 142, r: 24 },
  // Reihe 2 (Mitte)
  { num: 18, cx: 112, cy: 214, r: 24 },
  { num: 17, cx: 180, cy: 214, r: 24 },
  { num: 16, cx: 248, cy: 214, r: 24 },
  // Reihe 3 (unten)
  { num: 15, cx: 84, cy: 290, r: 24 },
  { num: 14, cx: 148, cy: 290, r: 24 },
  { num: 13, cx: 212, cy: 290, r: 24 },
  { num: 12, cx: 276, cy: 290, r: 24 },
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

function formatDartSlot(ev: TannenbaumDartEvent) {
  if (ev.kind === 'triple_extinguish') {
    return {
      title: ev.label,
      sub: '💨 AUS!',
      cls: 'bg-red-500/25 border-red-400 text-red-100 shadow-[0_0_16px_rgba(239,68,68,0.45)]',
    };
  }
  if (ev.kind === 'star_win') {
    return {
      title: ev.label,
      sub: '🏆 SIEG!',
      cls: 'bg-amber-500/30 border-amber-300 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.5)]',
    };
  }
  if (ev.kind === 'ball_lit' || ev.kind === 'trunk_lit' || ev.kind === 'triple_double_hit') {
    return {
      title: ev.label,
      sub: '✨ AN!',
      cls: 'bg-emerald-500/25 border-emerald-400 text-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.4)]',
    };
  }
  if (ev.kind === 'ball_already_lit' || ev.kind === 'trunk_already_lit') {
    return {
      title: ev.label,
      sub: 'Schon an',
      cls: 'bg-amber-500/15 border-amber-400/50 text-amber-200',
    };
  }
  return {
    title: 'MISS',
    sub: 'Daneben',
    cls: 'bg-red-950/75 border-red-500/60 text-red-300',
  };
}

function CurrentTurnRow({
  darts,
  isActive,
}: {
  darts: TannenbaumDartEvent[];
  isActive: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {[0, 1, 2].map((idx) => {
        const ev = darts[idx];
        if (ev) {
          const chip = formatDartSlot(ev);
          return (
            <div
              key={idx}
              className={`py-1.5 px-2 rounded-xl border-2 text-center font-mono transition-all ${chip.cls}`}
            >
              <div className="text-xs sm:text-sm font-black leading-tight truncate">{chip.title}</div>
              <div className="text-[10px] font-bold opacity-90">{chip.sub}</div>
            </div>
          );
        }
        return (
          <div
            key={idx}
            className={`py-1.5 px-2 rounded-xl border border-dashed text-center font-mono flex flex-col items-center justify-center ${
              isActive && idx === darts.length
                ? 'bg-emerald-500/10 border-emerald-400/70 text-emerald-300 animate-pulse'
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

function FestiveSvgTree({
  treeIdPrefix,
  tree,
  starTarget,
  recentlyExtinguishedNode,
  recentlyLitNode,
  className = '',
}: {
  treeIdPrefix: string;
  tree: TannenbaumTreeState;
  starTarget: TannenbaumStarTarget;
  recentlyExtinguishedNode?: TannenbaumNodeId;
  recentlyLitNode?: TannenbaumNodeId;
  className?: string;
}) {
  const starReady = isStarUnlocked(tree);
  const starLit = tree.star;

  return (
    <svg
      viewBox="0 0 360 440"
      className={`w-full h-auto drop-shadow-[0_12px_30px_rgba(0,0,0,0.75)] ${className}`}
      role="img"
      aria-label="Lions Tannenbaum"
    >
      <defs>
        <linearGradient id={`${treeIdPrefix}-foliage`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#065f46" />
          <stop offset="55%" stopColor="#064e3b" />
          <stop offset="100%" stopColor="#022c22" />
        </linearGradient>

        <radialGradient id={`${treeIdPrefix}-ball-lit`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="38%" stopColor="#34d399" />
          <stop offset="85%" stopColor="#059669" />
          <stop offset="100%" stopColor="#065f46" />
        </radialGradient>

        <radialGradient id={`${treeIdPrefix}-ball-off`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="70%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>

        <radialGradient id={`${treeIdPrefix}-ball-ext`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="55%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>

        <linearGradient id={`${treeIdPrefix}-trunk-lit`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>

        <linearGradient id={`${treeIdPrefix}-trunk-off`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#451a03" />
          <stop offset="100%" stopColor="#1c0d04" />
        </linearGradient>

        <radialGradient id={`${treeIdPrefix}-star-gold`} cx="45%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="45%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#d97706" />
        </radialGradient>

        <filter id={`${treeIdPrefix}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Hintergrund-Tannenbaum-Silhouette (3 übereinander liegende Stufen) */}
      <g>
        {/* Untere Stufe */}
        <polygon
          points="180,175 26,342 334,342"
          fill={`url(#${treeIdPrefix}-foliage)`}
          stroke="#10b981"
          strokeOpacity="0.45"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Mittlere Stufe */}
        <polygon
          points="180,118 52,258 308,258"
          fill={`url(#${treeIdPrefix}-foliage)`}
          stroke="#10b981"
          strokeOpacity="0.5"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Obere Stufe */}
        <polygon
          points="180,74 88,176 272,176"
          fill={`url(#${treeIdPrefix}-foliage)`}
          stroke="#34d399"
          strokeOpacity="0.6"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </g>

      {/* Dekorative Lichterketten zwischen den Kugeln */}
      <path
        d="M 145 142 Q 180 158 215 142 M 112 214 Q 146 232 180 214 Q 214 232 248 214 M 84 290 Q 116 310 148 290 Q 180 310 212 290 Q 244 310 276 290"
        fill="none"
        stroke="#fbbf24"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeDasharray="4 5"
      />

      {/* Baumstamm (TRUNK = Beliebiges Doppel) */}
      <g>
        {tree.trunk && (
          <rect
            x="110"
            y="347"
            width="140"
            height="58"
            rx="14"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="3"
            opacity="0.7"
            filter={`url(#${treeIdPrefix}-glow)`}
          />
        )}
        <rect
          x="116"
          y="352"
          width="128"
          height="48"
          rx="11"
          fill={tree.trunk ? `url(#${treeIdPrefix}-trunk-lit)` : `url(#${treeIdPrefix}-trunk-off)`}
          stroke={tree.trunk ? '#fde047' : '#92400e'}
          strokeWidth={tree.trunk ? 2.5 : 2}
        />
        <text
          x="180"
          y="372"
          textAnchor="middle"
          fill={tree.trunk ? '#022c22' : '#fed7aa'}
          fontSize="11"
          fontWeight="900"
          fontFamily="monospace"
          letterSpacing="1.2"
        >
          STAMM
        </text>
        <text
          x="180"
          y="390"
          textAnchor="middle"
          fill={tree.trunk ? '#022c22' : '#ffffff'}
          fontSize="15"
          fontWeight="900"
          fontFamily="monospace"
        >
          {tree.trunk ? '✓ DOPPEL AN' : 'DOPPEL'}
        </text>
      </g>

      {/* 9 Christbaumkugeln (20 bis 12) */}
      {BALL_POSITIONS.map(({ num, cx, cy, r }) => {
        const isLit = tree.balls[num];
        const isExtinguished = recentlyExtinguishedNode === String(num);
        const isFreshLit = recentlyLitNode === String(num);

        return (
          <g key={num}>
            {/* Kleiner goldener Kugel-Aufhänger oben */}
            <rect
              x={cx - 5}
              y={cy - r - 6}
              width={10}
              height={7}
              rx={2}
              fill={isLit ? '#fbbf24' : '#64748b'}
            />

            {/* Äußerer Glow oder Warn-Halo */}
            {isExtinguished && (
              <circle
                cx={cx}
                cy={cy}
                r={r + 8}
                fill="none"
                stroke="#ff3366"
                strokeWidth="3.5"
                className="animate-ping"
              />
            )}
            {(isLit || isFreshLit) && !isExtinguished && (
              <circle
                cx={cx}
                cy={cy}
                r={r + 5}
                fill="none"
                stroke={isFreshLit ? '#fde047' : '#34d399'}
                strokeWidth={isFreshLit ? '3.5' : '2'}
                opacity="0.75"
                filter={`url(#${treeIdPrefix}-glow)`}
              />
            )}

            {/* Kugel */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={
                isExtinguished
                  ? `url(#${treeIdPrefix}-ball-ext)`
                  : isLit
                  ? `url(#${treeIdPrefix}-ball-lit)`
                  : `url(#${treeIdPrefix}-ball-off)`
              }
              stroke={
                isExtinguished ? '#ff3366' : isLit ? '#fde047' : '#475569'
              }
              strokeWidth={isLit || isExtinguished ? 2.8 : 1.8}
            />

            {/* Lichtreflex oben links auf der Kugel */}
            <ellipse
              cx={cx - 7}
              cy={cy - 9}
              rx={5}
              ry={3}
              fill="#ffffff"
              opacity={isLit ? 0.55 : 0.16}
            />

            {/* Kugel-Zahl */}
            <text
              x={cx}
              y={cy + 6}
              textAnchor="middle"
              fill={isLit && !isExtinguished ? '#022c22' : '#f8fafc'}
              fontSize="19"
              fontWeight="900"
              fontFamily="monospace"
            >
              {num}
            </text>
          </g>
        );
      })}

      {/* Spitzen-Stern (STAR = BULL oder D20) */}
      <g transform="translate(180, 46)">
        {(starReady || starLit) && (
          <circle
            cx="0"
            cy="0"
            r={starLit ? 44 : 38}
            fill="none"
            stroke="#facc15"
            strokeWidth={starLit ? '3.5' : '2.5'}
            strokeDasharray={starLit ? undefined : '6 4'}
            opacity={starLit ? 0.9 : 0.8}
            className={!starLit ? 'animate-pulse' : undefined}
            filter={`url(#${treeIdPrefix}-glow)`}
          />
        )}

        {/* 5-zackiger Stern */}
        <polygon
          points="0,-32 9,-10 32,-10 14,5 20,28 0,14 -20,28 -14,5 -32,-10 -9,-10"
          fill={
            starLit || starReady
              ? `url(#${treeIdPrefix}-star-gold)`
              : '#1e293b'
          }
          stroke={starLit ? '#fef08a' : starReady ? '#fde047' : '#64748b'}
          strokeWidth={starLit || starReady ? 2.5 : 1.8}
          strokeLinejoin="round"
          filter={starLit || starReady ? `url(#${treeIdPrefix}-glow)` : undefined}
        />

        <text
          x="0"
          y="4"
          textAnchor="middle"
          fill={starLit || starReady ? '#451a03' : '#cbd5e1'}
          fontSize="11"
          fontWeight="900"
          fontFamily="monospace"
        >
          {starTarget}
        </text>

        {starReady && !starLit && (
          <g transform="translate(0, -40)">
            <rect x="-34" y="-11" width="68" height="17" rx="8" fill="#fbbf24" />
            <text
              x="0"
              y="1"
              textAnchor="middle"
              fill="#020617"
              fontSize="10"
              fontWeight="900"
              fontFamily="monospace"
            >
              FINALE!
            </text>
          </g>
        )}
      </g>
    </svg>
  );
}

function ActionBannerBox({ lastAction }: { lastAction?: TannenbaumLastActionBanner | null }) {
  if (!lastAction) {
    return (
      <div className="rounded-2xl bg-slate-900/60 border border-white/10 px-4 py-3 text-center backdrop-blur-xl">
        <div className="text-xs font-mono uppercase tracking-widest text-emerald-300 font-black">
          🎄 Spiel läuft
        </div>
        <div className="text-xs text-slate-300 mt-1">
          Alle 9 Kugeln + Stamm aufleuchten lassen, dann Stern treffen!
        </div>
      </div>
    );
  }

  let boxCls = 'bg-slate-900/75 border-white/15 text-slate-100';
  if (lastAction.type === 'extinguish') {
    boxCls =
      'bg-red-950/85 border-red-400 text-red-100 shadow-[0_0_35px_rgba(239,68,68,0.45)] animate-pulse';
  } else if (lastAction.type === 'win' || lastAction.type === 'star_unlocked') {
    boxCls =
      'bg-amber-950/80 border-amber-400 text-amber-100 shadow-[0_0_35px_rgba(251,191,36,0.45)]';
  } else if (lastAction.type === 'lit' || lastAction.type === 'trunk') {
    boxCls =
      'bg-emerald-950/75 border-emerald-400 text-emerald-100 shadow-[0_0_25px_rgba(16,185,129,0.35)]';
  } else if (lastAction.type === 'miss') {
    boxCls = 'bg-red-950/60 border-red-500/60 text-red-200';
  }

  return (
    <div className={`rounded-2xl border-2 px-4 py-3 text-center backdrop-blur-2xl transition-all ${boxCls}`}>
      <div className="text-sm sm:text-base font-black tracking-wide uppercase leading-tight">
        {lastAction.headline}
      </div>
      <div className="text-xs sm:text-sm font-semibold opacity-95 mt-1 leading-snug">
        {lastAction.subline}
      </div>
    </div>
  );
}

export default function HolographicTannenbaumCockpit({
  boardId,
  p1Name,
  p2Name = 'Gastspieler',
  activeName,
  is1vs1,
  activePlayer,
  roundNumber,
  tripleExtinguishEnabled,
  starTarget,
  p1,
  p2,
  lastAction,
  winnerPlayer,
  winnerName,
  currentTime,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicTannenbaumProps) {
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

  const p1Lit = countTotalLit(p1.tree);
  const p2Lit = countTotalLit(safeP2.tree);

  const p1RecentlyExtinguished =
    lastAction?.type === 'extinguish' && lastAction.actorPlayer === 2
      ? lastAction.affectedNode
      : undefined;
  const p2RecentlyExtinguished =
    lastAction?.type === 'extinguish' && lastAction.actorPlayer === 1
      ? lastAction.affectedNode
      : undefined;

  const p1RecentlyLit =
    (lastAction?.type === 'lit' || lastAction?.type === 'trunk' || lastAction?.type === 'star_unlocked') &&
    lastAction.actorPlayer === 1
      ? lastAction.affectedNode
      : undefined;
  const p2RecentlyLit =
    (lastAction?.type === 'lit' || lastAction?.type === 'trunk' || lastAction?.type === 'star_unlocked') &&
    lastAction.actorPlayer === 2
      ? lastAction.affectedNode
      : undefined;

  const renderPlayerColumn = (
    playerNum: 1 | 2,
    name: string,
    state: TannenbaumPlayerState,
    litCount: number,
    recExtinguished?: TannenbaumNodeId,
    recLit?: TannenbaumNodeId
  ) => {
    const isAct = !winnerName && activePlayer === playerNum;
    const isWinner = winnerPlayer === playerNum;
    const { firstName, lastName, sizeClass } = getNameSizing(name);

    return (
      <div
        className={`relative flex flex-col justify-between rounded-[2rem] backdrop-blur-3xl border-2 p-4 sm:p-5 transition-all duration-500 h-full max-h-[82vh] ${
          isWinner
            ? 'bg-slate-900/80 border-amber-400 shadow-[0_0_55px_rgba(251,191,36,0.45)]'
            : isAct
            ? 'bg-slate-900/75 border-emerald-400/85 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_40px_rgba(16,185,129,0.35)]'
            : 'bg-slate-900/45 border-white/15 opacity-85 shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
        }`}
      >
        {/* Spieler-Kopfzeile */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className={`${sizeClass} font-black text-white tracking-tight leading-none truncate`}>
                {firstName}
              </span>
              {lastName && (
                <span className="text-lg sm:text-xl font-extrabold text-slate-300 leading-none truncate">
                  {lastName}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {isWinner ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/25 border border-amber-400 text-amber-200 font-mono text-[11px] font-black">
                  🏆 WEIHNACHTSSIEGER
                </span>
              ) : isAct ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-200 font-mono text-[11px] font-black">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>🎯 AM WURF</span>
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-0.5 rounded-full bg-slate-950/60 border border-white/15 text-slate-400 font-mono text-[11px] font-bold">
                  SPIELER {playerNum} · WARTET
                </span>
              )}

              {tripleExtinguishEnabled && state.extinguishedCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-400/50 text-red-200 font-mono text-[11px] font-black">
                  💨 {state.extinguishedCount}
                </span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Lichter
            </span>
            <div className="flex items-baseline justify-end gap-0.5">
              <span className="text-3xl sm:text-4xl font-black font-mono text-[#00ff88] leading-none drop-shadow-[0_0_20px_rgba(0,255,136,0.7)]">
                {litCount}
              </span>
              <span className="text-sm font-mono font-bold text-slate-400">/11</span>
            </div>
          </div>
        </div>

        {/* SVG-Tannenbaum */}
        <div className="flex-1 flex items-center justify-center min-h-0 py-1">
          <FestiveSvgTree
            treeIdPrefix={`p${playerNum}`}
            tree={state.tree}
            starTarget={starTarget}
            recentlyExtinguishedNode={recExtinguished}
            recentlyLitNode={recLit}
            className="max-h-[46vh] w-auto max-w-full"
          />
        </div>

        {/* Aktuelle 3-Dart-Slots */}
        <div className="pt-2 border-t border-white/10">
          <CurrentTurnRow darts={state.currentTurnDarts || []} isActive={isAct} />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-[#040711] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 overflow-hidden select-none font-sans">
      {/* Festliche God Rays & subtiler Schneefall */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-[14%] w-[28vw] h-[130vh] bg-gradient-to-b from-emerald-500/20 via-emerald-600/05 to-transparent rotate-[18deg] blur-2xl opacity-70" />
        <div className="absolute -top-32 right-[14%] w-[28vw] h-[130vh] bg-gradient-to-b from-amber-400/20 via-amber-500/05 to-transparent -rotate-[18deg] blur-2xl opacity-70" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-600/12 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:48px_48px] opacity-30" />

        {/* 18 leichte Schneeflocken */}
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
          <span className="text-xs font-mono font-bold tracking-widest text-emerald-400">
            LIONS SPECIAL
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 px-5 py-2 rounded-full bg-slate-900/70 backdrop-blur-2xl border border-emerald-400/40 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
          <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-cyan-300">
            BOARD {boardId}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-xs sm:text-sm font-black tracking-wider text-amber-300 uppercase">
            🎄 LIONS TANNENBAUM
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
          <div className="grid grid-cols-12 gap-4 lg:gap-6 items-center w-full max-w-[1520px] h-full">
            {/* Links: Spieler 1 */}
            <div className="col-span-5 h-full flex flex-col justify-center">
              {renderPlayerColumn(1, p1Name, p1, p1Lit, p1RecentlyExtinguished, p1RecentlyLit)}
            </div>

            {/* Mitte: VS, Live-Event & Regeln */}
            <div className="col-span-2 flex flex-col items-center justify-center gap-4 px-1">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-amber-500/25 border-2 border-amber-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.3)]">
                <span className="text-2xl font-black font-mono text-amber-300">VS</span>
              </div>

              <div className="w-full">
                <ActionBannerBox lastAction={lastAction} />
              </div>

              <div className="w-full space-y-2 text-center font-mono text-[11px]">
                {tripleExtinguishEnabled && (
                  <div className="px-3 py-2 rounded-xl bg-red-950/60 border border-red-400/40 text-red-200 font-bold">
                    🔥 Triple löscht Gegner-Kugel
                  </div>
                )}
                <div className="px-3 py-2 rounded-xl bg-amber-950/60 border border-amber-400/40 text-amber-200 font-bold">
                  ⭐ Spitze: {starTarget}
                </div>
                <div className="px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-400/40 text-emerald-200 font-bold">
                  🪵 Stamm: Beliebiges Doppel
                </div>
              </div>
            </div>

            {/* Rechts: Spieler 2 */}
            <div className="col-span-5 h-full flex flex-col justify-center">
              {renderPlayerColumn(2, p2Name, safeP2, p2Lit, p2RecentlyExtinguished, p2RecentlyLit)}
            </div>
          </div>
        ) : (
          /* Solo-Modus */
          <div className="grid grid-cols-12 gap-6 items-center w-full max-w-6xl h-full">
            {/* Linker Flügel */}
            <div className="col-span-4 rounded-[2rem] bg-slate-900/65 backdrop-blur-3xl border-2 border-emerald-400/50 p-6 flex flex-col justify-between h-[360px] shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
              <div>
                <span className="text-xs font-mono font-black uppercase tracking-widest text-emerald-400">
                  🎄 SOLO-MODUS · AM OCHE
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-white mt-2 leading-tight">
                  {activeName}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 border-y border-white/10 py-4">
                <div>
                  <span className="text-[11px] font-mono uppercase text-slate-400 block">
                    Lichterstand
                  </span>
                  <div className="text-4xl font-black font-mono text-[#00ff88]">
                    {p1Lit}
                    <span className="text-base text-slate-400">/11</span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase text-slate-400 block">
                    Darts / Runde
                  </span>
                  <div className="text-3xl font-black font-mono text-cyan-300">
                    {p1.dartsThrown}
                    <span className="text-xs text-amber-300 block">Runde {roundNumber}</span>
                  </div>
                </div>
              </div>

              <div className="text-xs font-mono text-amber-200 flex items-center justify-between">
                <span>🪵 Stamm: Doppel</span>
                <span>⭐ Spitze: {starTarget}</span>
              </div>
            </div>

            {/* Zentraler Tannenbaum */}
            <div className="col-span-4 flex items-center justify-center">
              <FestiveSvgTree
                treeIdPrefix="solo"
                tree={p1.tree}
                starTarget={starTarget}
                recentlyLitNode={p1RecentlyLit}
                className="max-h-[68vh] w-auto max-w-full"
              />
            </div>

            {/* Rechter Flügel */}
            <div className="col-span-4 rounded-[2rem] bg-slate-900/65 backdrop-blur-3xl border border-white/15 p-6 flex flex-col justify-between h-[360px] shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
              <div className="space-y-3">
                <span className="text-xs font-mono font-black uppercase tracking-widest text-amber-300 block">
                  Aktuelle Aufnahme
                </span>
                <CurrentTurnRow darts={p1.currentTurnDarts || []} isActive={!winnerName} />
              </div>

              <ActionBannerBox lastAction={lastAction} />

              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Offene Kugeln
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TANNENBAUM_BALL_NUMBERS.map((num) => (
                    <span
                      key={num}
                      className={`px-2 py-0.5 rounded-md font-mono text-xs font-black border ${
                        p1.tree.balls[num]
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                          : 'bg-slate-950/70 border-white/15 text-slate-400'
                      }`}
                    >
                      {num}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sieger-Overlay */}
      {winnerName && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="max-w-xl w-full rounded-[2.5rem] bg-slate-950/90 border-2 border-amber-400 shadow-[0_0_80px_rgba(251,191,36,0.45)] p-7 sm:p-10 text-center space-y-5">
            <div className="text-6xl">🏆</div>
            <div className="space-y-2">
              <span className="text-xs sm:text-sm font-mono font-black uppercase tracking-[0.25em] text-amber-300">
                FROHE WEIHNACHTEN
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                SIEG FÜR {winnerName.toUpperCase()}!
              </h2>
              <p className="text-sm sm:text-base text-emerald-300 font-semibold">
                🎄 Der Lions-Tannenbaum erstrahlt in vollem Glanz!
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
                <div className="text-[10px] text-slate-400 uppercase">Ausgepustet</div>
                <div className="text-xl font-black text-red-300">
                  {winnerPlayer === 2 ? safeP2.extinguishedCount : p1.extinguishedCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dezenter Abstand unten */}
      <div className="relative z-20 h-2 shrink-0" />
    </div>
  );
}
