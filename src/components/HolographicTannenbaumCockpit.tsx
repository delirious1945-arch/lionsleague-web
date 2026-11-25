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
  TannenbaumWinCondition,
  countTotalLit,
  getRequiredLitToWin,
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
  winCondition?: TannenbaumWinCondition;
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

// Positionen passend zu viewBox="0 0 420 500"
const BALL_POSITIONS: { num: TannenbaumBallNumber; cx: number; cy: number; r: number }[] = [
  // Reihe 1 (oben)
  { num: 20, cx: 168, cy: 158, r: 28 },
  { num: 19, cx: 252, cy: 158, r: 28 },
  // Reihe 2 (Mitte)
  { num: 18, cx: 130, cy: 242, r: 28 },
  { num: 17, cx: 210, cy: 242, r: 28 },
  { num: 16, cx: 290, cy: 242, r: 28 },
  // Reihe 3 (unten)
  { num: 15, cx: 96, cy: 330, r: 28 },
  { num: 14, cx: 172, cy: 330, r: 28 },
  { num: 13, cx: 248, cy: 330, r: 28 },
  { num: 12, cx: 324, cy: 330, r: 28 },
];

function getNameSizing(name: string) {
  const parts = name.trim().split(' ');
  const firstName = parts[0] || 'Spieler';
  const lastName = parts.slice(1).join(' ') || '';
  const maxNameLen = Math.max(firstName.length, lastName.length);
  const sizeClass =
    maxNameLen > 14
      ? 'text-3xl sm:text-4xl lg:text-5xl'
      : maxNameLen > 10
      ? 'text-4xl sm:text-5xl lg:text-5xl'
      : 'text-4xl sm:text-5xl lg:text-6xl';
  return { firstName, lastName, sizeClass };
}

function formatDartSlot(ev: TannenbaumDartEvent) {
  if (ev.kind === 'ball_stolen' || ev.kind === 'trunk_stolen' || ev.kind === 'star_stolen') {
    return {
      title: ev.label,
      sub: '🔥 GEKLAUT!',
      cls: 'bg-gradient-to-br from-orange-500/35 via-red-500/25 to-amber-500/25 border-orange-300 text-amber-50 shadow-[0_0_18px_rgba(249,115,22,0.55)]',
    };
  }
  if (ev.kind === 'triple_extinguish') {
    return {
      title: ev.label,
      sub: '🔥 GEKLAUT!',
      cls: 'bg-gradient-to-br from-orange-500/35 via-red-500/25 to-amber-500/25 border-orange-300 text-amber-50 shadow-[0_0_18px_rgba(249,115,22,0.55)]',
    };
  }
  if (ev.kind === 'ball_blocked_single') {
    return {
      title: ev.label,
      sub: '🛡️ PRALLT AB',
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
  if (ev.kind === 'star_lit') {
    return {
      title: ev.label,
      sub: '⭐ AN!',
      cls: 'bg-emerald-500/25 border-emerald-400 text-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.4)]',
    };
  }
  if (ev.kind === 'ball_lit' || ev.kind === 'trunk_lit' || ev.kind === 'triple_double_hit') {
    return {
      title: ev.label,
      sub: '✨ AN!',
      cls: 'bg-emerald-500/25 border-emerald-400 text-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.4)]',
    };
  }
  if (
    ev.kind === 'ball_already_lit' ||
    ev.kind === 'trunk_already_lit' ||
    ev.kind === 'star_already_lit'
  ) {
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
  accentColor = 'red',
}: {
  darts: TannenbaumDartEvent[];
  isActive: boolean;
  accentColor?: 'red' | 'amber';
}) {
  const pulseBorder =
    accentColor === 'amber'
      ? 'bg-amber-500/10 border-amber-400/75 text-amber-300 animate-pulse'
      : 'bg-red-500/10 border-red-400/75 text-red-300 animate-pulse';

  return (
    <div className="grid grid-cols-3 gap-2.5 w-full">
      {[0, 1, 2].map((idx) => {
        const ev = darts[idx];
        if (ev) {
          const chip = formatDartSlot(ev);
          return (
            <div
              key={idx}
              className={`py-3 px-1.5 rounded-2xl border-2 text-center font-mono transition-all duration-300 backdrop-blur-md ${chip.cls}`}
            >
              <div className="text-sm sm:text-base lg:text-lg font-black leading-tight truncate">{chip.title}</div>
              <div className="text-[11px] sm:text-xs font-bold opacity-95 mt-0.5 tracking-wide">{chip.sub}</div>
            </div>
          );
        }
        return (
          <div
            key={idx}
            className={`py-3 px-1.5 rounded-2xl border-2 border-dashed text-center font-mono flex flex-col items-center justify-center ${
              isActive && idx === darts.length
                ? pulseBorder
                : 'bg-slate-950/50 border-white/10 text-slate-500'
            }`}
          >
            <div className="text-sm lg:text-base font-black">Dart {idx + 1}</div>
            <div className="text-xs">•</div>
          </div>
        );
      })}
    </div>
  );
}

function FestiveSvgTree({
  treeIdPrefix,
  is1vs1,
  p1Tree,
  p2Tree,
  p1Name,
  p2Name = 'Spieler 2',
  starTarget,
  p1RecentlyExtinguished,
  p2RecentlyExtinguished,
  p1RecentlyLit,
  p2RecentlyLit,
  className = '',
}: {
  treeIdPrefix: string;
  is1vs1: boolean;
  p1Tree: TannenbaumTreeState;
  p2Tree?: TannenbaumTreeState;
  p1Name: string;
  p2Name?: string;
  starTarget: TannenbaumStarTarget;
  p1RecentlyExtinguished?: TannenbaumNodeId;
  p2RecentlyExtinguished?: TannenbaumNodeId;
  p1RecentlyLit?: TannenbaumNodeId;
  p2RecentlyLit?: TannenbaumNodeId;
  className?: string;
}) {
  const safeP2Tree = p2Tree || p1Tree;
  const p1First = p1Name.trim().split(' ')[0] || 'P1';
  const p2First = p2Name.trim().split(' ')[0] || 'P2';

  // Exklusiver Besitzer des Baumstamms & Sterns
  const trunkOwner: 1 | 2 | null = p1Tree.trunk ? 1 : is1vs1 && safeP2Tree.trunk ? 2 : null;
  const trunkExt = p1RecentlyExtinguished === 'TRUNK' || (is1vs1 && p2RecentlyExtinguished === 'TRUNK');
  const trunkFresh = p1RecentlyLit === 'TRUNK' || (is1vs1 && p2RecentlyLit === 'TRUNK');

  const starOwner: 1 | 2 | null = p1Tree.star ? 1 : is1vs1 && safeP2Tree.star ? 2 : null;
  const starExt = p1RecentlyExtinguished === 'STAR' || (is1vs1 && p2RecentlyExtinguished === 'STAR');
  const starFresh = p1RecentlyLit === 'STAR' || (is1vs1 && p2RecentlyLit === 'STAR');

  let starBadgeText: string | null = null;
  let starBadgeColor = '#facc15';
  if (starExt) {
    starBadgeText = '🔥 GEKLAUT!';
    starBadgeColor = '#38bdf8';
  } else if (starOwner === 1) {
    starBadgeText = is1vs1 ? `${p1First.toUpperCase()}` : '✓ EROBERT';
    starBadgeColor = '#f87171';
  } else if (starOwner === 2) {
    starBadgeText = p2First.toUpperCase();
    starBadgeColor = '#fbbf24';
  }

  return (
    <svg
      viewBox="0 0 420 500"
      className={`w-full h-auto drop-shadow-[0_14px_34px_rgba(0,0,0,0.85)] ${className}`}
      role="img"
      aria-label="Lions Tannenbaum"
    >
      <defs>
        <linearGradient id={`${treeIdPrefix}-foliage`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f8a62" />
          <stop offset="45%" stopColor="#076b4b" />
          <stop offset="100%" stopColor="#033a2a" />
        </linearGradient>

        {/* P1 Festliches Rot-Gradient */}
        <radialGradient id={`${treeIdPrefix}-ball-p1`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fecaca" />
          <stop offset="40%" stopColor="#f87171" />
          <stop offset="85%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>

        {/* P2 Gold/Amber-Gradient */}
        <radialGradient id={`${treeIdPrefix}-ball-p2`} cx="65%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#fbbf24" />
          <stop offset="85%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>

        {/* Aus / Dunkel */}
        <radialGradient id={`${treeIdPrefix}-ball-off`} cx="45%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="70%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>

        <linearGradient id={`${treeIdPrefix}-trunk-p1`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>

        <linearGradient id={`${treeIdPrefix}-trunk-p2`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        <linearGradient id={`${treeIdPrefix}-trunk-off`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#451a03" />
          <stop offset="100%" stopColor="#1c0d04" />
        </linearGradient>

        <radialGradient id={`${treeIdPrefix}-star-red`} cx="45%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#fecaca" />
          <stop offset="45%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#b91c1c" />
        </radialGradient>

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

      {/* Hintergrund-Tannenbaum-Silhouette (3 Stufen, zentriert bei x=210) */}
      <g>
        <polygon
          points="210,202 22,388 398,388"
          fill={`url(#${treeIdPrefix}-foliage)`}
          stroke="#10b981"
          strokeOpacity="0.45"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <polygon
          points="210,136 58,296 362,296"
          fill={`url(#${treeIdPrefix}-foliage)`}
          stroke="#10b981"
          strokeOpacity="0.52"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <polygon
          points="210,82 100,200 320,200"
          fill={`url(#${treeIdPrefix}-foliage)`}
          stroke="#34d399"
          strokeOpacity="0.6"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </g>

      {/* Optische Veredelung: Bodenschatten, Schneekappen, Nadel-Textur & Lichter-Glanz */}
      <g aria-hidden="true" pointerEvents="none">
        <ellipse cx="210" cy="466" rx="150" ry="13" fill="#000000" opacity="0.5" />
        <ellipse cx="210" cy="462" rx="128" ry="7" fill="#e2e8f0" opacity="0.1" />
        {/* Nadel-Reihen als feine Struktur auf jeder Stufe */}
        <path
          d="M 210 98 L 138 190 M 210 98 L 282 190 M 210 150 L 118 284 M 210 150 L 302 284 M 210 214 L 82 380 M 210 214 L 338 380"
          stroke="#6ee7b7"
          strokeOpacity="0.14"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 100 200 Q 160 214 210 200 Q 260 214 320 200 M 58 296 Q 134 312 210 296 Q 286 312 362 296 M 22 388 Q 116 406 210 388 Q 304 406 398 388"
          stroke="#f8fafc"
          strokeOpacity="0.55"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 100 200 Q 160 214 210 200 Q 260 214 320 200 M 58 296 Q 134 312 210 296 Q 286 312 362 296 M 22 388 Q 116 406 210 388 Q 304 406 398 388"
          stroke="#94a3b8"
          strokeOpacity="0.35"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          transform="translate(0 4)"
        />
        {/* Zarte Lichter-Perlen entlang der Randkonturen */}
        {[
          [160, 140], [260, 140], [124, 230], [296, 230], [78, 340], [342, 340],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.6" fill={i % 2 ? '#fde68a' : '#fecaca'} opacity="0.75" />
        ))}
      </g>

      {/* Dekorative Lichterketten zwischen den Kugeln */}
      <path
        d="M 168 158 Q 210 176 252 158 M 130 242 Q 170 262 210 242 Q 250 262 290 242 M 96 330 Q 134 352 172 330 Q 210 352 248 330 Q 286 352 324 330"
        fill="none"
        stroke="#fbbf24"
        strokeOpacity="0.32"
        strokeWidth="2"
        strokeDasharray="5 5"
      />

      {/* Vollfarbiger exklusiver Baumstamm (TRUNK = Beliebiges Doppel, x=130..290, y=396..452) */}
      <g>
        {(trunkOwner !== null || trunkExt || trunkFresh) && (
          <rect
            x="124"
            y="391"
            width="172"
            height="66"
            rx="14"
            fill="none"
            stroke={trunkExt ? '#38bdf8' : trunkOwner === 1 ? '#f87171' : '#fbbf24'}
            strokeWidth={trunkExt || trunkFresh ? '3.5' : '2.8'}
            opacity="0.82"
            className={trunkExt ? 'animate-pulse' : undefined}
            filter={`url(#${treeIdPrefix}-glow)`}
          />
        )}
        <rect
          x="130"
          y="396"
          width="160"
          height="56"
          rx="12"
          fill={
            trunkOwner === 1
              ? `url(#${treeIdPrefix}-trunk-p1)`
              : trunkOwner === 2
              ? `url(#${treeIdPrefix}-trunk-p2)`
              : `url(#${treeIdPrefix}-trunk-off)`
          }
          stroke={
            trunkExt
              ? '#38bdf8'
              : trunkOwner === 1
              ? '#f87171'
              : trunkOwner === 2
              ? '#fbbf24'
              : '#92400e'
          }
          strokeWidth={trunkOwner !== null || trunkExt ? 2.6 : 2}
        />
        <text
          x="210"
          y="416"
          textAnchor="middle"
          paintOrder="stroke"
          stroke="#020617"
          strokeWidth="3.2"
          fill="#ffffff"
          fontSize="11.5"
          fontWeight="900"
          fontFamily="monospace"
          letterSpacing="1.2"
        >
          STAMM · DOPPEL
        </text>
        <text
          x="210"
          y="439"
          textAnchor="middle"
          paintOrder="stroke"
          stroke="#020617"
          strokeWidth="3.5"
          fill={
            trunkOwner === 1
              ? '#fecaca'
              : trunkOwner === 2
              ? '#fef08a'
              : '#cbd5e1'
          }
          fontSize="14.5"
          fontWeight="900"
          fontFamily="monospace"
        >
          {is1vs1
            ? trunkOwner === 1
              ? `✓ ${p1First.toUpperCase()}`
              : trunkOwner === 2
              ? `✓ ${p2First.toUpperCase()}`
              : 'DOPPEL'
            : trunkOwner === 1
            ? '✓ DOPPEL AN'
            : 'DOPPEL'}
        </text>
      </g>

      {/* 9 Vollfarbige Christbaumkugeln (20 bis 12) */}
      {BALL_POSITIONS.map(({ num, cx, cy, r }) => {
        const p1Lit = p1Tree.balls[num];
        const p2Lit = is1vs1 && safeP2Tree.balls[num];
        const p1Ext = p1RecentlyExtinguished === String(num);
        const p2Ext = is1vs1 && p2RecentlyExtinguished === String(num);
        const p1Fresh = p1RecentlyLit === String(num);
        const p2Fresh = is1vs1 && p2RecentlyLit === String(num);

        const isStolen = p1Ext || p2Ext;
        const owner: 1 | 2 | null = p1Lit ? 1 : p2Lit ? 2 : null;
        const outerStroke = isStolen
          ? '#38bdf8'
          : owner === 1
          ? '#f87171'
          : owner === 2
          ? '#fbbf24'
          : '#475569';

        const anyLit = owner !== null;

        return (
          <g key={num}>
            {/* Kleiner goldener Kugel-Aufhänger oben */}
            <rect
              x={cx - 6}
              y={cy - r - 7}
              width={12}
              height={8}
              rx={2}
              fill={anyLit ? '#fbbf24' : '#64748b'}
            />

            {/* Äußerer Glow bei Licht an */}
            {(anyLit || p1Fresh || p2Fresh) && !isStolen && (
              <circle
                cx={cx}
                cy={cy}
                r={r + 5}
                fill="none"
                stroke={
                  p1Fresh
                    ? '#f87171'
                    : p2Fresh
                    ? '#fde047'
                    : owner === 1
                    ? '#f87171'
                    : '#fbbf24'
                }
                strokeWidth={p1Fresh || p2Fresh ? '3.5' : '2.2'}
                opacity="0.78"
                filter={`url(#${treeIdPrefix}-glow)`}
              />
            )}

            {/* Vollkreisiger eisblauer Puls-Ring bei frischem Klau */}
            {isStolen && (
              <circle
                cx={cx}
                cy={cy}
                r={r + 6}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="4"
                className="animate-pulse"
                filter={`url(#${treeIdPrefix}-glow)`}
              />
            )}

            {/* Vollfarbige Kugel (kein Split mehr im 1vs1!) */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={
                owner === 1
                  ? `url(#${treeIdPrefix}-ball-p1)`
                  : owner === 2
                  ? `url(#${treeIdPrefix}-ball-p2)`
                  : `url(#${treeIdPrefix}-ball-off)`
              }
              stroke={outerStroke}
              strokeWidth={anyLit || isStolen ? 2.8 : 1.8}
            />

            {/* Subtiler Glanzpunkt */}
            <ellipse
              cx={cx - 8}
              cy={cy - 11}
              rx={6}
              ry={3.2}
              fill="#ffffff"
              opacity={anyLit ? 0.45 : 0.14}
            />

            {/* Zahl mit starkem Kontrast-Rand für gestochen scharfe Lesbarkeit */}
            <text
              x={cx}
              y={cy + 8}
              textAnchor="middle"
              paintOrder="stroke"
              stroke="#020617"
              strokeWidth="4.5"
              strokeLinejoin="round"
              fill="#ffffff"
              fontSize="22"
              fontWeight="900"
              fontFamily="monospace"
            >
              {num}
            </text>
          </g>
        );
      })}

      {/* Spitzen-Stern (STAR = BULL oder D20, von Anfang an werfbar & exklusiv, zentriert bei 210, 54) */}
      <g transform="translate(210, 54)">
        {(starOwner !== null || starExt || starFresh) && (
          <circle
            cx="0"
            cy="0"
            r={starExt ? 46 : 44}
            fill="none"
            stroke={starExt ? '#38bdf8' : starOwner === 1 ? '#f87171' : '#facc15'}
            strokeWidth={starExt ? '4' : '3.2'}
            opacity="0.9"
            className={starExt ? 'animate-pulse' : undefined}
            filter={`url(#${treeIdPrefix}-glow)`}
          />
        )}

        {starOwner !== null && (
          <g
            stroke={starExt ? '#38bdf8' : starOwner === 1 ? '#fecaca' : '#fef08a'}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          >
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line key={deg} x1="0" y1="-51" x2="0" y2="-53" transform={`rotate(${deg})`} />
            ))}
          </g>
        )}

        <polygon
          points="0,-35 10,-11 35,-11 15,6 22,30 0,15 -22,30 -15,6 -35,-11 -10,-11"
          fill={
            starOwner === 1
              ? `url(#${treeIdPrefix}-star-red)`
              : starOwner === 2
              ? `url(#${treeIdPrefix}-star-gold)`
              : '#1e293b'
          }
          stroke={
            starExt
              ? '#38bdf8'
              : starOwner === 1
              ? '#fecaca'
              : starOwner === 2
              ? '#fef08a'
              : '#94a3b8'
          }
          strokeWidth={starOwner !== null || starExt ? 2.8 : 2}
          strokeLinejoin="round"
          filter={starOwner !== null || starExt ? `url(#${treeIdPrefix}-glow)` : undefined}
        />

        <text
          x="0"
          y="5"
          textAnchor="middle"
          paintOrder="stroke"
          stroke="#020617"
          strokeWidth="3.2"
          fill="#ffffff"
          fontSize="12"
          fontWeight="900"
          fontFamily="monospace"
        >
          {starTarget}
        </text>

        {starBadgeText && (
          <g transform="translate(0, -42)">
            <rect x="-56" y="-12" width="112" height="19" rx="9" fill={starBadgeColor} />
            <text
              x="0"
              y="1"
              textAnchor="middle"
              fill="#020617"
              fontSize="10.5"
              fontWeight="900"
              fontFamily="monospace"
            >
              {starBadgeText}
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
      <div className="rounded-2xl bg-slate-900/65 border border-white/10 px-5 py-3.5 text-center backdrop-blur-xl">
        <div className="text-sm font-mono uppercase tracking-[0.25em] text-emerald-300 font-black">
          🎄 Spiel läuft
        </div>
        <div className="text-sm sm:text-base text-slate-300 mt-1">
          Erobere Kugeln (12–20), Stamm (Doppel) &amp; Stern — Klau per Doppel/Triple!
        </div>
      </div>
    );
  }

  let boxCls = 'bg-slate-900/75 border-white/15 text-slate-100';
  if (lastAction.type === 'extinguish') {
    boxCls =
      'bg-orange-950/85 border-orange-400 text-orange-100 shadow-[0_0_35px_rgba(249,115,22,0.45)] animate-pulse';
  } else if (lastAction.type === 'win' || lastAction.type === 'star_unlocked') {
    boxCls =
      'bg-amber-950/80 border-amber-400 text-amber-100 shadow-[0_0_35px_rgba(251,191,36,0.45)]';
  } else if (lastAction.type === 'lit' || lastAction.type === 'trunk') {
    boxCls =
      'bg-emerald-950/75 border-emerald-400 text-emerald-100 shadow-[0_0_25px_rgba(16,185,129,0.35)]';
  } else if (lastAction.type === 'miss') {
    boxCls = 'bg-red-950/75 border-red-500/75 text-red-200';
  }

  return (
    <div className={`rounded-2xl border-2 px-5 py-3.5 text-center backdrop-blur-2xl transition-all duration-300 ${boxCls}`}>
      <div className="text-lg sm:text-2xl font-black tracking-wide uppercase leading-tight">
        {lastAction.headline}
      </div>
      <div className="text-sm sm:text-lg font-semibold opacity-95 mt-1 leading-snug">
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
  winCondition = 'majority_6',
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
  const requiredToWin = getRequiredLitToWin(winCondition, is1vs1);

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

  const p1First = p1Name.trim().split(' ')[0] || 'Spieler 1';
  const p2First = p2Name.trim().split(' ')[0] || 'Spieler 2';

  const renderPlayerWing = (
    playerNum: 1 | 2,
    name: string,
    state: TannenbaumPlayerState,
    litCount: number
  ) => {
    const isP1 = playerNum === 1;
    const isAct = !winnerName && activePlayer === playerNum;
    const isWinner = winnerPlayer === playerNum;
    const { firstName, lastName, sizeClass } = getNameSizing(name);
    const pct = Math.min(100, Math.round((litCount / requiredToWin) * 100));

    return (
      <div
        className={`relative flex flex-col justify-between rounded-[2.25rem] backdrop-blur-3xl border-2 p-6 sm:p-8 transition-all duration-500 overflow-hidden h-full max-h-[82vh] bg-gradient-to-b ${
          isWinner
            ? 'from-amber-950/70 to-slate-950/90 border-amber-400 shadow-[0_0_70px_rgba(251,191,36,0.55)]'
            : isAct
            ? isP1
              ? 'from-red-950/60 to-slate-950/90 border-red-400/90 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_60px_rgba(239,68,68,0.45)] scale-[1.015]'
              : 'from-amber-950/55 to-slate-950/90 border-amber-400/90 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_60px_rgba(251,191,36,0.42)] scale-[1.015]'
            : 'from-slate-900/50 to-slate-950/70 border-white/10 opacity-70 shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
        }`}
      >
        {/* Farb-Leiste oben */}
        <div
          className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${
            isP1 ? 'from-red-600 via-red-400 to-rose-300' : 'from-amber-500 via-amber-300 to-yellow-200'
          }`}
        />

        {/* Spieler-Badge + Name */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-mono text-xs font-black tracking-wider border ${
                isP1
                  ? 'bg-red-500/15 border-red-400/50 text-red-300'
                  : 'bg-amber-500/15 border-amber-400/50 text-amber-300'
              }`}
            >
              {isP1 ? '🔴 SPIELER 1 · ROT' : '🟡 SPIELER 2 · GOLD'}
            </span>
          </div>

          <div className="flex flex-col">
            <span className={`${sizeClass} font-black text-white tracking-tight leading-none truncate`}>
              {firstName}
            </span>
            {lastName && (
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-300 leading-none mt-1.5 truncate">
                {lastName}
              </span>
            )}
          </div>

          <div>
            {isWinner ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/25 border-2 border-amber-400 text-amber-200 font-mono text-xs font-black">
                🏆 WEIHNACHTSSIEGER
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
                SPIELER {playerNum} · WARTET
              </span>
            )}
          </div>
        </div>

        {/* Großer Lichterstand */}
        <div className="my-auto py-5 border-y border-white/10 space-y-4">
          <div className="flex items-end justify-between">
            <span className="text-sm font-mono uppercase tracking-[0.2em] text-slate-300 font-bold">
              Besitz
            </span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-7xl sm:text-8xl lg:text-9xl font-black font-mono leading-none tabular-nums ${
                  isP1
                    ? 'text-[#ff4d6d] drop-shadow-[0_0_32px_rgba(239,68,68,0.85)]'
                    : 'text-[#fbbf24] drop-shadow-[0_0_32px_rgba(251,191,36,0.8)]'
                }`}
              >
                {litCount}
              </span>
              <span className="text-2xl font-mono font-bold text-slate-400">/{requiredToWin}</span>
            </div>
          </div>

          <div className="w-full h-4 bg-slate-950/90 rounded-full overflow-hidden border border-white/15 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isP1
                  ? 'bg-gradient-to-r from-red-700 via-red-500 to-rose-300 shadow-[0_0_18px_rgba(239,68,68,0.7)]'
                  : 'bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-200 shadow-[0_0_18px_rgba(251,191,36,0.7)]'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 font-mono">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 text-center">
              <div className="text-xs text-slate-400 uppercase tracking-wider">Darts</div>
              <div className="text-3xl font-black text-cyan-300 tabular-nums">{state.dartsThrown}</div>
            </div>
            {tripleExtinguishEnabled || is1vs1 ? (
              <div className="p-3 rounded-2xl bg-sky-950/45 border border-sky-400/40 text-center">
                <div className="text-xs text-sky-300 uppercase tracking-wider">🔥 Geklaut</div>
                <div className="text-3xl font-black text-sky-200 tabular-nums">{state.extinguishedCount}</div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Runden</div>
                <div className="text-3xl font-black text-white tabular-nums">{state.roundsPlayed}</div>
              </div>
            )}
          </div>
        </div>

        {/* Aktuelle 3-Dart-Aufnahme */}
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-slate-300 font-bold block">
            Aufnahme
          </span>
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
      {/* Festliche God Rays & subtiler Schneefall */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#0b1d2e_0%,#050a16_55%,#02040a_100%)]" />
        <div className="absolute -top-32 left-[14%] w-[28vw] h-[130vh] bg-gradient-to-b from-red-500/20 via-rose-600/05 to-transparent rotate-[18deg] blur-2xl opacity-70" />
        <div className="absolute -top-32 right-[14%] w-[28vw] h-[130vh] bg-gradient-to-b from-amber-400/20 via-amber-500/05 to-transparent -rotate-[18deg] blur-2xl opacity-70" />
        <div className="absolute top-[42%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[820px] h-[820px] bg-emerald-500/15 rounded-full blur-[160px]" />
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[120vw] h-[40vh] bg-gradient-to-t from-slate-200/10 via-slate-300/[0.03] to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:48px_48px] opacity-30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.65)_100%)]" />

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
        <div className="w-44 hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse" />
          <span className="text-sm font-mono font-black tracking-[0.3em] text-emerald-400">
            LIONS SPECIAL
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 px-6 py-2.5 rounded-full bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-900/80 backdrop-blur-2xl border border-emerald-400/50 shadow-[0_0_35px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]">
          <span className="text-sm sm:text-base font-black font-mono tracking-wider text-cyan-300">
            BOARD {boardId}
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-base sm:text-xl font-black tracking-[0.12em] text-amber-300 uppercase drop-shadow-[0_0_14px_rgba(251,191,36,0.55)]">
            🎄 LIONS TANNENBAUM
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-sm sm:text-base font-black font-mono tracking-wider text-emerald-300">
            RUNDE {roundNumber}
          </span>
          <span className="text-slate-600">•</span>
          <span className="px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-xs sm:text-sm font-black font-mono tracking-wider text-amber-200">
            {is1vs1 && winCondition === 'majority_6' ? '6 VON 11' : 'ALLE 11'}
          </span>
        </div>

        <div className="flex items-center gap-3 w-44 justify-end">
          <span className="text-sm sm:text-base font-mono text-slate-300 tracking-widest tabular-nums">
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
          <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,1fr)_minmax(340px,1.45fr)_minmax(220px,1fr)] gap-4 lg:gap-6 items-center w-full max-w-[1520px] h-full">
            {/* Linker Flügel: Spieler 1 */}
            <div className="h-full flex flex-col justify-center">
              {renderPlayerWing(1, p1Name, p1, p1Lit)}
            </div>

            {/* Mittlere Spalte: Der EINE gemeinsame Exklusiv-Tannenbaum */}
            <div className="flex flex-col items-center justify-between h-full max-h-[82vh] py-1 gap-2">
              {/* Kompakte Farb-Legende über dem Baum */}
              <div className="flex items-center justify-center gap-5 px-6 py-2 rounded-full bg-slate-900/75 border border-white/15 font-mono text-base font-black backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                <span className="flex items-center gap-2 text-red-300">
                  <span className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]" />
                  <span>{p1First}</span>
                </span>
                <span className="text-slate-500 text-sm">VS</span>
                <span className="flex items-center gap-2 text-amber-300">
                  <span>{p2First}</span>
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24]" />
                </span>
              </div>

              {/* Zentraler riesiger SVG-Tannenbaum */}
              <div className="flex-1 flex items-center justify-center min-h-0 w-full">
                <FestiveSvgTree
                  treeIdPrefix="duel"
                  is1vs1={true}
                  p1Tree={p1.tree}
                  p2Tree={safeP2.tree}
                  p1Name={p1Name}
                  p2Name={p2Name}
                  starTarget={starTarget}
                  p1RecentlyExtinguished={p1RecentlyExtinguished}
                  p2RecentlyExtinguished={p2RecentlyExtinguished}
                  p1RecentlyLit={p1RecentlyLit}
                  p2RecentlyLit={p2RecentlyLit}
                  className="max-h-[62vh] w-auto max-w-full"
                />
              </div>

              {/* Action Banner & kompakte Regel-Pills unter dem Baum */}
              <div className="w-full space-y-2 shrink-0">
                <ActionBannerBox lastAction={lastAction} />
                <div className="flex flex-wrap items-center justify-center gap-2.5 font-mono text-sm">
                  <span className="px-3.5 py-1.5 rounded-xl bg-orange-950/65 border border-orange-400/40 text-orange-200 font-bold">
                    🔥 D/T klaut Kugel
                  </span>
                  <span className="px-3.5 py-1.5 rounded-xl bg-red-950/65 border border-red-400/40 text-red-200 font-bold">
                    🛡️ Single prallt ab
                  </span>
                  <span className="px-3.5 py-1.5 rounded-xl bg-emerald-950/65 border border-emerald-400/40 text-emerald-200 font-bold">
                    🪵 Stamm: Doppel
                  </span>
                  <span className="px-3.5 py-1.5 rounded-xl bg-amber-950/65 border border-amber-400/40 text-amber-200 font-bold">
                    ⭐ Spitze: {starTarget} (ab Start)
                  </span>
                </div>
              </div>
            </div>

            {/* Rechter Flügel: Spieler 2 */}
            <div className="h-full flex flex-col justify-center">
              {renderPlayerWing(2, p2Name, safeP2, p2Lit)}
            </div>
          </div>
        ) : (
          /* Solo-Modus */
          <div className="grid grid-cols-12 gap-6 items-center w-full max-w-6xl h-full">
            {/* Linker Flügel */}
            <div className="col-span-4 rounded-[2rem] bg-slate-900/65 backdrop-blur-3xl border-2 border-red-400/50 p-6 flex flex-col justify-between h-[360px] shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
              <div>
                <span className="text-xs font-mono font-black uppercase tracking-widest text-red-400">
                  🎄 SOLO-MODUS · AM OCHE
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-white mt-2 leading-tight">
                  {activeName}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 border-y border-white/10 py-4">
                <div>
                  <span className="text-[11px] font-mono uppercase text-slate-400 block">
                    Elemente
                  </span>
                  <div className="text-4xl font-black font-mono text-[#ff4d6d]">
                    {p1Lit}
                    <span className="text-base text-slate-400">/{requiredToWin}</span>
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
                is1vs1={false}
                p1Tree={p1.tree}
                p1Name={p1Name}
                starTarget={starTarget}
                p1RecentlyLit={p1RecentlyLit}
                className="max-h-[68vh] w-auto max-w-full"
              />
            </div>

            {/* Rechter Flügel */}
            <div className="col-span-4 rounded-[2rem] bg-slate-900/65 backdrop-blur-3xl border border-white/15 p-6 flex flex-col justify-between h-[360px] shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
              <div className="space-y-3">
                <span className="text-xs font-mono font-black uppercase tracking-widest text-amber-300 block">
                  Aktuelle Aufnahme
                </span>
                <CurrentTurnRow darts={p1.currentTurnDarts || []} isActive={!winnerName} accentColor="red" />
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
                          ? 'bg-red-500/25 border-red-400 text-red-200'
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
          <div className="max-w-3xl w-full rounded-[2.5rem] bg-gradient-to-b from-amber-950/60 via-slate-950/95 to-slate-950/95 border-2 border-amber-400 shadow-[0_0_120px_rgba(251,191,36,0.55),inset_0_1px_0_rgba(255,255,255,0.15)] p-8 sm:p-12 text-center space-y-6">
            <div className="text-7xl sm:text-8xl drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]">🏆</div>
            <div className="space-y-3">
              <span className="text-sm sm:text-base font-mono font-black uppercase tracking-[0.35em] text-amber-300">
                FROHE WEIHNACHTEN
              </span>
              <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight drop-shadow-[0_0_24px_rgba(251,191,36,0.35)]">
                SIEG FÜR {winnerName.toUpperCase()}!
              </h2>
              <p className="text-base sm:text-xl text-emerald-300 font-semibold">
                {is1vs1 && winCondition === 'majority_6'
                  ? `🎄 ${winnerPlayer === 2 ? p2Lit : p1Lit} von ${requiredToWin} Elementen am Lions-Tannenbaum erobert!`
                  : '🎄 Der Lions-Tannenbaum erstrahlt in vollem Glanz!'}
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
                <div className="text-[10px] text-slate-400 uppercase">Geklaut</div>
                <div className="text-xl font-black text-red-300">
                  {winnerPlayer === 2 ? safeP2.extinguishedCount : p1.extinguishedCount}
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
