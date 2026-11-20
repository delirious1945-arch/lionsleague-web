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
      sub: '💨 GEKLAUT!',
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
  accentColor = 'emerald',
}: {
  darts: TannenbaumDartEvent[];
  isActive: boolean;
  accentColor?: 'emerald' | 'amber';
}) {
  const pulseBorder =
    accentColor === 'amber'
      ? 'bg-amber-500/10 border-amber-400/75 text-amber-300 animate-pulse'
      : 'bg-emerald-500/10 border-emerald-400/75 text-emerald-300 animate-pulse';

  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {[0, 1, 2].map((idx) => {
        const ev = darts[idx];
        if (ev) {
          const chip = formatDartSlot(ev);
          return (
            <div
              key={idx}
              className={`py-2 px-1.5 rounded-xl border-2 text-center font-mono transition-all ${chip.cls}`}
            >
              <div className="text-xs sm:text-sm font-black leading-tight truncate">{chip.title}</div>
              <div className="text-[10px] font-bold opacity-90">{chip.sub}</div>
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
  const p1StarReady = isStarUnlocked(p1Tree);
  const p2StarReady = is1vs1 && isStarUnlocked(safeP2Tree);
  const anyStarWon = p1Tree.star || (is1vs1 && safeP2Tree.star);

  const p1First = p1Name.trim().split(' ')[0] || 'P1';
  const p2First = p2Name.trim().split(' ')[0] || 'P2';

  // Stern-Status-Text & Farbe
  let starBadgeText: string | null = null;
  let starRingStroke = '#facc15';
  if (!anyStarWon) {
    if (is1vs1 && p1StarReady && p2StarReady) {
      starBadgeText = 'SUDDEN DEATH!';
      starRingStroke = '#f87171';
    } else if (p1StarReady) {
      starBadgeText = is1vs1 ? `${p1First.toUpperCase()} FINALE!` : 'FINALE!';
      starRingStroke = '#34d399';
    } else if (p2StarReady) {
      starBadgeText = `${p2First.toUpperCase()} FINALE!`;
      starRingStroke = '#fbbf24';
    }
  }

  const starAnyReady = p1StarReady || p2StarReady;

  return (
    <svg
      viewBox="0 0 420 500"
      className={`w-full h-auto drop-shadow-[0_14px_34px_rgba(0,0,0,0.85)] ${className}`}
      role="img"
      aria-label="Lions Tannenbaum"
    >
      <defs>
        <linearGradient id={`${treeIdPrefix}-foliage`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#065f46" />
          <stop offset="55%" stopColor="#064e3b" />
          <stop offset="100%" stopColor="#022c22" />
        </linearGradient>

        {/* P1 Smaragd-Gradient */}
        <radialGradient id={`${treeIdPrefix}-ball-p1`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="40%" stopColor="#34d399" />
          <stop offset="85%" stopColor="#059669" />
          <stop offset="100%" stopColor="#064e3b" />
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

        {/* Geklaut / Rot */}
        <radialGradient id={`${treeIdPrefix}-ball-ext`} cx="45%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="55%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>

        <linearGradient id={`${treeIdPrefix}-trunk-p1`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>

        <linearGradient id={`${treeIdPrefix}-trunk-p2`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#b45309" />
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

      {/* Subtile Seiten-Akzente & vertikale Mittellinie im 1vs1 */}
      {is1vs1 && (
        <g>
          <polygon points="210,86 24,386 210,386" fill="#10b981" fillOpacity="0.06" />
          <polygon points="210,86 210,386 396,386" fill="#fbbf24" fillOpacity="0.06" />
          <line
            x1="210"
            y1="88"
            x2="210"
            y2="388"
            stroke="#ffffff"
            strokeOpacity="0.18"
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />
        </g>
      )}

      {/* Dekorative Lichterketten zwischen den Kugeln */}
      <path
        d="M 168 158 Q 210 176 252 158 M 130 242 Q 170 262 210 242 Q 250 262 290 242 M 96 330 Q 134 352 172 330 Q 210 352 248 330 Q 286 352 324 330"
        fill="none"
        stroke="#fbbf24"
        strokeOpacity="0.32"
        strokeWidth="2"
        strokeDasharray="5 5"
      />

      {/* Baumstamm (TRUNK = Beliebiges Doppel, x=130..290, y=396..452) */}
      {is1vs1 ? (
        <g>
          {/* Glow falls mind. ein Spieler Stamm an hat */}
          {(p1Tree.trunk || safeP2Tree.trunk) && (
            <rect
              x="124"
              y="391"
              width="172"
              height="66"
              rx="14"
              fill="none"
              stroke={p1Tree.trunk && safeP2Tree.trunk ? '#fef08a' : p1Tree.trunk ? '#34d399' : '#fbbf24'}
              strokeWidth="2.5"
              opacity="0.7"
              filter={`url(#${treeIdPrefix}-glow)`}
            />
          )}

          {/* Linke Hälfte (Spieler 1: x=130..210) */}
          <path
            d="M 142 396 L 210 396 L 210 452 L 142 452 A 12 12 0 0 1 130 440 L 130 408 A 12 12 0 0 1 142 396 Z"
            fill={p1Tree.trunk ? `url(#${treeIdPrefix}-trunk-p1)` : `url(#${treeIdPrefix}-trunk-off)`}
          />
          {/* Rechte Hälfte (Spieler 2: x=210..290) */}
          <path
            d="M 210 396 L 278 396 A 12 12 0 0 1 290 408 L 290 440 A 12 12 0 0 1 278 452 L 210 452 Z"
            fill={safeP2Tree.trunk ? `url(#${treeIdPrefix}-trunk-p2)` : `url(#${treeIdPrefix}-trunk-off)`}
          />
          {/* Äußerer Stamm-Rahmen & Mittelnaht */}
          <rect
            x="130"
            y="396"
            width="160"
            height="56"
            rx="12"
            fill="none"
            stroke={p1Tree.trunk || safeP2Tree.trunk ? '#fde047' : '#92400e'}
            strokeWidth="2.2"
          />
          <line x1="210" y1="396" x2="210" y2="452" stroke="#020617" strokeOpacity="0.7" strokeWidth="2" />

          {/* Stamm-Beschriftung */}
          <text
            x="210"
            y="416"
            textAnchor="middle"
            paintOrder="stroke"
            stroke="#020617"
            strokeWidth="3.5"
            fill="#ffffff"
            fontSize="12"
            fontWeight="900"
            fontFamily="monospace"
            letterSpacing="1.2"
          >
            STAMM · DOPPEL
          </text>
          <text
            x="170"
            y="439"
            textAnchor="middle"
            paintOrder="stroke"
            stroke="#020617"
            strokeWidth="3"
            fill={p1Tree.trunk ? '#a7f3d0' : '#94a3b8'}
            fontSize="13"
            fontWeight="900"
            fontFamily="monospace"
          >
            {p1Tree.trunk ? '✓ AN' : '○ AUS'}
          </text>
          <text
            x="250"
            y="439"
            textAnchor="middle"
            paintOrder="stroke"
            stroke="#020617"
            strokeWidth="3"
            fill={safeP2Tree.trunk ? '#fef08a' : '#94a3b8'}
            fontSize="13"
            fontWeight="900"
            fontFamily="monospace"
          >
            {safeP2Tree.trunk ? '✓ AN' : '○ AUS'}
          </text>
        </g>
      ) : (
        <g>
          {p1Tree.trunk && (
            <rect
              x="124"
              y="391"
              width="172"
              height="66"
              rx="14"
              fill="none"
              stroke="#34d399"
              strokeWidth="3"
              opacity="0.7"
              filter={`url(#${treeIdPrefix}-glow)`}
            />
          )}
          <rect
            x="130"
            y="396"
            width="160"
            height="56"
            rx="12"
            fill={p1Tree.trunk ? `url(#${treeIdPrefix}-trunk-p1)` : `url(#${treeIdPrefix}-trunk-off)`}
            stroke={p1Tree.trunk ? '#34d399' : '#92400e'}
            strokeWidth={p1Tree.trunk ? 2.5 : 2}
          />
          <text
            x="210"
            y="416"
            textAnchor="middle"
            fill={p1Tree.trunk ? '#022c22' : '#fed7aa'}
            fontSize="12"
            fontWeight="900"
            fontFamily="monospace"
            letterSpacing="1.2"
          >
            STAMM
          </text>
          <text
            x="210"
            y="438"
            textAnchor="middle"
            fill={p1Tree.trunk ? '#022c22' : '#ffffff'}
            fontSize="15"
            fontWeight="900"
            fontFamily="monospace"
          >
            {p1Tree.trunk ? '✓ DOPPEL AN' : 'DOPPEL'}
          </text>
        </g>
      )}

      {/* 9 Christbaumkugeln (20 bis 12) */}
      {BALL_POSITIONS.map(({ num, cx, cy, r }) => {
        const p1Lit = p1Tree.balls[num];
        const p2Lit = is1vs1 && safeP2Tree.balls[num];
        const p1Ext = p1RecentlyExtinguished === String(num);
        const p2Ext = is1vs1 && p2RecentlyExtinguished === String(num);
        const p1Fresh = p1RecentlyLit === String(num);
        const p2Fresh = is1vs1 && p2RecentlyLit === String(num);

        const outerStroke =
          p1Ext || p2Ext
            ? '#ff3366'
            : is1vs1
            ? p1Lit && p2Lit
              ? '#fef08a'
              : p1Lit
              ? '#34d399'
              : p2Lit
              ? '#fbbf24'
              : '#475569'
            : p1Lit
            ? '#34d399'
            : '#475569';

        const anyLit = p1Lit || p2Lit;

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
            {(anyLit || p1Fresh || p2Fresh) && !p1Ext && !p2Ext && (
              <circle
                cx={cx}
                cy={cy}
                r={r + 5}
                fill="none"
                stroke={
                  p1Fresh
                    ? '#34d399'
                    : p2Fresh
                    ? '#fde047'
                    : p1Lit && p2Lit
                    ? '#fde047'
                    : p1Lit
                    ? '#34d399'
                    : '#fbbf24'
                }
                strokeWidth={p1Fresh || p2Fresh ? '3.5' : '2'}
                opacity="0.75"
                filter={`url(#${treeIdPrefix}-glow)`}
              />
            )}

            {/* Pulsierender roter Bogen bei geklauter Hälfte (oder ganzem Kreis im Solo) */}
            {p1Ext && (
              <path
                d={`M ${cx} ${cy - (r + 6)} A ${r + 6} ${r + 6} 0 0 0 ${cx} ${cy + (r + 6)}`}
                fill="none"
                stroke="#ff3366"
                strokeWidth="4"
                strokeLinecap="round"
                className="animate-pulse"
                filter={`url(#${treeIdPrefix}-glow)`}
              />
            )}
            {p2Ext && (
              <path
                d={`M ${cx} ${cy - (r + 6)} A ${r + 6} ${r + 6} 0 0 1 ${cx} ${cy + (r + 6)}`}
                fill="none"
                stroke="#ff3366"
                strokeWidth="4"
                strokeLinecap="round"
                className="animate-pulse"
                filter={`url(#${treeIdPrefix}-glow)`}
              />
            )}

            {is1vs1 ? (
              <>
                {/* Linke Halbkugel (Spieler 1 - Smaragd) */}
                <path
                  d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`}
                  fill={
                    p1Ext
                      ? `url(#${treeIdPrefix}-ball-ext)`
                      : p1Lit
                      ? `url(#${treeIdPrefix}-ball-p1)`
                      : `url(#${treeIdPrefix}-ball-off)`
                  }
                />
                {/* Rechte Halbkugel (Spieler 2 - Gold/Amber) */}
                <path
                  d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`}
                  fill={
                    p2Ext
                      ? `url(#${treeIdPrefix}-ball-ext)`
                      : p2Lit
                      ? `url(#${treeIdPrefix}-ball-p2)`
                      : `url(#${treeIdPrefix}-ball-off)`
                  }
                />
                {/* Vertikale Mittelnaht */}
                <line
                  x1={cx}
                  y1={cy - r}
                  x2={cx}
                  y2={cy + r}
                  stroke="#020617"
                  strokeOpacity="0.65"
                  strokeWidth="2"
                />
                {/* Äußerer Kreis-Rand */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={outerStroke}
                  strokeWidth={anyLit || p1Ext || p2Ext ? 2.8 : 1.8}
                />
              </>
            ) : (
              /* Solo-Modus: Vollflächige Kugel */
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={
                  p1Ext
                    ? `url(#${treeIdPrefix}-ball-ext)`
                    : p1Lit
                    ? `url(#${treeIdPrefix}-ball-p1)`
                    : `url(#${treeIdPrefix}-ball-off)`
                }
                stroke={outerStroke}
                strokeWidth={p1Lit || p1Ext ? 2.8 : 1.8}
              />
            )}

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

      {/* Spitzen-Stern (STAR = BULL oder D20, zentriert bei 210, 54) */}
      <g transform="translate(210, 54)">
        {(starAnyReady || anyStarWon) && (
          <circle
            cx="0"
            cy="0"
            r={anyStarWon ? 48 : 42}
            fill="none"
            stroke={anyStarWon ? '#facc15' : starRingStroke}
            strokeWidth={anyStarWon ? '3.5' : '2.8'}
            strokeDasharray={anyStarWon ? undefined : '7 4'}
            opacity="0.88"
            className={!anyStarWon ? 'animate-pulse' : undefined}
            filter={`url(#${treeIdPrefix}-glow)`}
          />
        )}

        <polygon
          points="0,-35 10,-11 35,-11 15,6 22,30 0,15 -22,30 -15,6 -35,-11 -10,-11"
          fill={
            anyStarWon || starAnyReady
              ? `url(#${treeIdPrefix}-star-gold)`
              : '#1e293b'
          }
          stroke={
            anyStarWon
              ? '#fef08a'
              : starAnyReady
              ? starRingStroke
              : '#64748b'
          }
          strokeWidth={anyStarWon || starAnyReady ? 2.6 : 1.8}
          strokeLinejoin="round"
          filter={anyStarWon || starAnyReady ? `url(#${treeIdPrefix}-glow)` : undefined}
        />

        <text
          x="0"
          y="5"
          textAnchor="middle"
          fill={anyStarWon || starAnyReady ? '#451a03' : '#cbd5e1'}
          fontSize="12"
          fontWeight="900"
          fontFamily="monospace"
        >
          {starTarget}
        </text>

        {starBadgeText && (
          <g transform="translate(0, -42)">
            <rect x="-56" y="-12" width="112" height="19" rx="9" fill={starRingStroke} />
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
      <div className="rounded-2xl bg-slate-900/65 border border-white/10 px-4 py-2.5 text-center backdrop-blur-xl">
        <div className="text-xs font-mono uppercase tracking-widest text-emerald-300 font-black">
          🎄 Spiel läuft
        </div>
        <div className="text-xs text-slate-300 mt-0.5">
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
    <div className={`rounded-2xl border-2 px-4 py-2.5 text-center backdrop-blur-2xl transition-all ${boxCls}`}>
      <div className="text-sm sm:text-base font-black tracking-wide uppercase leading-tight">
        {lastAction.headline}
      </div>
      <div className="text-xs sm:text-sm font-semibold opacity-95 mt-0.5 leading-snug">
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
    const pct = Math.round((litCount / 11) * 100);

    return (
      <div
        className={`relative flex flex-col justify-between rounded-[2rem] backdrop-blur-3xl border-2 p-5 sm:p-6 transition-all duration-500 overflow-hidden h-full max-h-[78vh] ${
          isWinner
            ? 'bg-slate-900/85 border-amber-400 shadow-[0_0_55px_rgba(251,191,36,0.5)]'
            : isAct
            ? isP1
              ? 'bg-slate-900/80 border-emerald-400/90 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_45px_rgba(16,185,129,0.38)]'
              : 'bg-slate-900/80 border-amber-400/90 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_45px_rgba(251,191,36,0.38)]'
            : 'bg-slate-900/45 border-white/15 opacity-80 shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
        }`}
      >
        {/* Farb-Leiste oben */}
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
            isP1 ? 'from-emerald-400 to-cyan-400' : 'from-amber-400 to-yellow-300'
          }`}
        />

        {/* Seiten-Indikator + Name */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-black tracking-wider border ${
                isP1
                  ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
                  : 'bg-amber-500/15 border-amber-400/50 text-amber-300'
              }`}
            >
              {isP1 ? '◀ LINKE HÄLFTE · SMARAGD' : 'GOLD · RECHTE HÄLFTE ▶'}
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
                🏆 WEIHNACHTSSIEGER
              </span>
            ) : isAct ? (
              <span
                className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border-2 font-mono text-xs font-black ${
                  isP1
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-amber-500/20 border-amber-400 text-amber-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full animate-ping ${
                    isP1 ? 'bg-emerald-400' : 'bg-amber-400'
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
        <div className="my-auto py-4 border-y border-white/10 space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
              Lichterstand
            </span>
            <div className="flex items-baseline gap-1">
              <span
                className={`text-5xl sm:text-6xl font-black font-mono leading-none ${
                  isP1
                    ? 'text-[#00ff88] drop-shadow-[0_0_25px_rgba(0,255,136,0.75)]'
                    : 'text-[#fbbf24] drop-shadow-[0_0_25px_rgba(251,191,36,0.75)]'
                }`}
              >
                {litCount}
              </span>
              <span className="text-lg font-mono font-bold text-slate-400">/11</span>
            </div>
          </div>

          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-white/10">
            <div
              className={`h-full transition-all duration-500 ${
                isP1
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-300'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-center">
              <div className="text-[10px] text-slate-400 uppercase">Darts</div>
              <div className="text-lg font-black text-cyan-300">{state.dartsThrown}</div>
            </div>
            {tripleExtinguishEnabled ? (
              <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-400/35 text-center">
                <div className="text-[10px] text-red-300 uppercase">💨 Geklaut</div>
                <div className="text-lg font-black text-red-200">{state.extinguishedCount}</div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-center">
                <div className="text-[10px] text-slate-400 uppercase">Runden</div>
                <div className="text-lg font-black text-white">{state.roundsPlayed}</div>
              </div>
            )}
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
            accentColor={isP1 ? 'emerald' : 'amber'}
          />
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
        <div className="absolute top-[42%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] bg-emerald-600/12 rounded-full blur-[150px]" />
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
          <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,1fr)_minmax(340px,1.45fr)_minmax(220px,1fr)] gap-4 lg:gap-6 items-center w-full max-w-[1520px] h-full">
            {/* Linker Flügel: Spieler 1 */}
            <div className="h-full flex flex-col justify-center">
              {renderPlayerWing(1, p1Name, p1, p1Lit)}
            </div>

            {/* Mittlere Spalte: Der EINE gemeinsame Split-Tannenbaum */}
            <div className="flex flex-col items-center justify-between h-full max-h-[82vh] py-1 gap-2">
              {/* Kompakte Farb-Legende über dem Baum */}
              <div className="flex items-center justify-center gap-4 px-4 py-1.5 rounded-full bg-slate-900/75 border border-white/15 font-mono text-xs font-black backdrop-blur-xl">
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  <span>{p1First}</span>
                </span>
                <span className="text-slate-500">VS</span>
                <span className="flex items-center gap-1.5 text-amber-300">
                  <span>{p2First}</span>
                  <span className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
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
                <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[11px]">
                  {tripleExtinguishEnabled && (
                    <span className="px-2.5 py-1 rounded-lg bg-red-950/65 border border-red-400/40 text-red-200 font-bold">
                      🔥 Triple klaut Licht
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-950/65 border border-emerald-400/40 text-emerald-200 font-bold">
                    🪵 Stamm: Doppel
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-950/65 border border-amber-400/40 text-amber-200 font-bold">
                    ⭐ Spitze: {starTarget}
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
