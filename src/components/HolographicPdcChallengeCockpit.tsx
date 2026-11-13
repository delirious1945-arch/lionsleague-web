'use client';

import React, { useId } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

export interface HolographicPdcChallengeProps {
  boardId: string;
  activeName: string;
  is1vs1?: boolean;
  activePlayer?: 1 | 2;
  currentPart?: 1 | 2 | 3;
  currentTarget: string;
  currentScore: number;
  currentVisit: number;
  totalVisits?: number;
  currentTime?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const BOARD_NUMBERS = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
] as const;

type TargetRing = 'double' | 'triple' | 'single' | 'outer_bull' | 'bull';

function describeSectorRing(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startDeg: number,
  endDeg: number
): string {
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const startRad = toRad(startDeg);
  const endRad = toRad(endDeg);

  const x1Outer = cx + outerRadius * Math.cos(startRad);
  const y1Outer = cy + outerRadius * Math.sin(startRad);
  const x2Outer = cx + outerRadius * Math.cos(endRad);
  const y2Outer = cy + outerRadius * Math.sin(endRad);

  const x1Inner = cx + innerRadius * Math.cos(endRad);
  const y1Inner = cy + innerRadius * Math.sin(endRad);
  const x2Inner = cx + innerRadius * Math.cos(startRad);
  const y2Inner = cy + innerRadius * Math.sin(startRad);

  const largeArc = endDeg - startDeg > 180 ? 1 : 0;

  return [
    `M ${x1Outer.toFixed(2)} ${y1Outer.toFixed(2)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2Outer.toFixed(2)} ${y2Outer.toFixed(2)}`,
    `L ${x1Inner.toFixed(2)} ${y1Inner.toFixed(2)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x2Inner.toFixed(2)} ${y2Inner.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function parseTarget(target: string): {
  number: number | null;
  ring: TargetRing;
  angle: number;
  isBull: boolean;
} {
  const normalized = target.trim().toUpperCase();
  if (normalized === 'BULL' || normalized === 'DBULL' || normalized === '50') {
    return { number: null, ring: 'bull', angle: 0, isBull: true };
  }
  if (normalized === '25' || normalized === 'OBULL' || normalized === 'SBULL') {
    return { number: null, ring: 'outer_bull', angle: 0, isBull: true };
  }
  const match = normalized.match(/^([DTS])?(\d{1,2})$/);
  const prefix = match?.[1] || 'S';
  const num = match ? parseInt(match[2], 10) : 20;
  const ring: TargetRing =
    prefix === 'T' ? 'triple' : prefix === 'D' ? 'double' : 'single';
  const idx = BOARD_NUMBERS.indexOf(num as (typeof BOARD_NUMBERS)[number]);
  return {
    number: idx >= 0 ? num : 20,
    ring,
    angle: idx >= 0 ? idx * 18 : 0,
    isBull: false,
  };
}

function inferPhase(
  currentPart: 1 | 2 | 3 | undefined,
  target: string,
  visit: number
): 1 | 2 | 3 {
  if (currentPart === 1 || currentPart === 2 || currentPart === 3) return currentPart;
  const up = target.trim().toUpperCase();
  if (up.includes('BULL') || up === '25' || up === '50' || visit > 20) return 3;
  if (up.startsWith('D') || visit > 10) return 2;
  return 1;
}

export default function HolographicPdcChallengeCockpit({
  boardId,
  activeName,
  is1vs1 = false,
  activePlayer = 1,
  currentPart,
  currentTarget,
  currentScore,
  currentVisit,
  totalVisits = 26,
  currentTime,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicPdcChallengeProps) {
  const uid = useId().replace(/:/g, '');
  const phase = inferPhase(currentPart, currentTarget, currentVisit);
  const { number: activeNum, ring: activeRing, angle: activeAngle, isBull } =
    parseTarget(currentTarget);

  // Dynamisches Name-Scaling
  const nameParts = activeName.trim().split(' ');
  const longestWord = nameParts.reduce((max, w) => Math.max(max, w.length), 0);
  const nameSizeClass =
    longestWord > 14
      ? 'text-2xl sm:text-3xl lg:text-4xl'
      : longestWord > 10
      ? 'text-3xl sm:text-4xl lg:text-4xl'
      : 'text-3xl sm:text-4xl lg:text-5xl';

  // Score-Gauge (0 - 100)
  const clampedScore = Math.max(0, Math.min(100, currentScore));
  const gaugeRadius = 64;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCircumference * (1 - clampedScore / 100);
  const visitPct = Math.min(100, Math.round((currentVisit / Math.max(1, totalVisits)) * 100));

  // Vereinfachte Scheiben-Geometrie (420x420)
  const cx = 210;
  const cy = 210;
  const rOuterRim = 196;
  const rNumberRing = 178;
  const rDoubleOuter = 160;
  const rDoubleInner = 145;
  const rTrebleOuter = 104;
  const rTrebleInner = 90;
  const rOuterBull = 30;
  const rInnerBull = 14;

  const phases = [
    { id: 1, label: 'PHASE 1: SCORING' },
    { id: 2, label: 'PHASE 2: DOUBLE' },
    { id: 3, label: 'PHASE 3: BULL & CHECK' },
  ] as const;

  return (
    <div className="relative w-screen h-screen bg-[#050914] text-white flex flex-col justify-between p-4 sm:p-7 overflow-hidden select-none font-sans">
      {/* Neutraler, ruhiger Hintergrund ohne Arena-Foto oder grelle Effekte */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(30,41,59,0.35),#050914_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff07_1px,transparent_1px)] [background-size:44px_44px] opacity-30" />
      </div>

      {/* Top Header + 3-Phasen-Stepper */}
      <header className="relative z-20 flex flex-col items-center gap-3 w-full">
        <div className="relative w-full flex items-center justify-center">
          <div className="px-6 sm:px-10 py-2 rounded-full bg-slate-900/55 backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.45)] flex items-center gap-2.5 text-xs sm:text-sm font-mono font-bold tracking-wider">
            <span className="text-amber-300">BOARD {boardId}</span>
            <span className="text-slate-600">•</span>
            <span className="text-white uppercase">LIONS WEYHAUSEN</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300">PDC CHALLENGE</span>
          </div>

          <div className="absolute right-0 flex items-center gap-3">
            {currentTime && (
              <span className="hidden sm:inline text-xs font-mono text-slate-400 tracking-widest">
                {currentTime}
              </span>
            )}
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-xl"
                title="Vollbild"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* 3-Phasen-Stepper */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 rounded-2xl bg-slate-900/45 backdrop-blur-2xl border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          {phases.map((p) => {
            const isActive = phase === p.id;
            const isDone = phase > p.id;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl font-mono text-[10px] sm:text-xs font-bold tracking-wider transition-all ${
                  isActive
                    ? 'bg-amber-400/15 border border-amber-300/60 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.18)]'
                    : isDone
                    ? 'bg-emerald-500/10 border border-emerald-400/30 text-emerald-300/80'
                    : 'bg-transparent border border-transparent text-slate-500'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    isActive
                      ? 'bg-amber-300 text-slate-950'
                      : isDone
                      ? 'bg-emerald-400/25 text-emerald-300'
                      : 'bg-white/5 text-slate-500'
                  }`}
                >
                  {p.id}
                </span>
                <span className="hidden sm:inline">{p.label}</span>
                <span className="sm:hidden">P{p.id}</span>
              </div>
            );
          })}
        </div>
      </header>

      {/* Haupt-Cockpit: Links Spieler (Glass), Mitte ruhige Scheibe (Ziel im Fokus), Rechts Score-Gauge (Glass) */}
      <main className="relative z-10 flex-1 flex items-center justify-center w-full max-w-7xl mx-auto px-2 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-6 lg:gap-10 w-full">
          {/* LINKER FLÜGEL: Glassmorphism Spielerkarte */}
          <div className="justify-self-center lg:justify-self-end w-full max-w-[330px] h-[230px] sm:h-[260px] rounded-3xl bg-slate-900/45 backdrop-blur-3xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.15)] p-6 sm:p-7 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-slate-400">
                {is1vs1 ? `SPIELER ${activePlayer}` : 'SPIELER AM OCHE'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </div>

            <div className="my-auto">
              <h2
                className={`${nameSizeClass} font-black text-white tracking-tight leading-tight break-words`}
              >
                {activeName}
              </h2>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="px-3.5 py-1.5 rounded-full bg-amber-400/15 border border-amber-300/40 text-amber-200 font-mono text-xs font-bold tracking-wider">
                AM WURF
              </span>
              <span className="text-xs font-mono text-slate-400">
                ZIEL: <strong className="text-white">{currentTarget}</strong>
              </span>
            </div>
          </div>

          {/* ZENTRUM: Vereinfachte, ruhige Turnier-Scheibe (Fokus rein auf das aktive Ziel, kein Ziel-Symbol oben) */}
          <div className="justify-self-center flex flex-col items-center gap-3">
            <div className="relative w-[300px] h-[300px] sm:w-[370px] sm:h-[370px] lg:w-[420px] lg:h-[420px] flex items-center justify-center">
              <svg viewBox="0 0 420 420" className="w-full h-full select-none pointer-events-none">
                <defs>
                  <filter id={`${uid}-targetFocus`} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Ruhiger, matter Catchring */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={rOuterRim}
                  fill="rgba(10, 15, 28, 0.85)"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="1.5"
                />

                {/* 20 matte Segmente ohne ablenkenden Glow */}
                {BOARD_NUMBERS.map((num, idx) => {
                  const centerDeg = idx * 18;
                  const startDeg = centerDeg - 9;
                  const endDeg = centerDeg + 9;
                  const isEven = idx % 2 === 0;

                  const singleFill = isEven ? '#0b1220' : '#131d31';
                  const ringFill = isEven ? '#18243b' : '#1e2d47';

                  return (
                    <g key={`sec-${num}`}>
                      <path
                        d={describeSectorRing(cx, cy, rDoubleInner, rDoubleOuter, startDeg, endDeg)}
                        fill={ringFill}
                      />
                      <path
                        d={describeSectorRing(cx, cy, rTrebleOuter, rDoubleInner, startDeg, endDeg)}
                        fill={singleFill}
                      />
                      <path
                        d={describeSectorRing(cx, cy, rTrebleInner, rTrebleOuter, startDeg, endDeg)}
                        fill={ringFill}
                      />
                      <path
                        d={describeSectorRing(cx, cy, rOuterBull, rTrebleInner, startDeg, endDeg)}
                        fill={singleFill}
                      />
                    </g>
                  );
                })}

                {/* Dezente, dünne Ring- und Drahtlinien */}
                {[rDoubleOuter, rDoubleInner, rTrebleOuter, rTrebleInner].map((r, i) => (
                  <circle
                    key={`wire-ring-${i}`}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke="rgba(148, 163, 184, 0.22)"
                    strokeWidth="0.9"
                  />
                ))}

                {Array.from({ length: 20 }).map((_, i) => {
                  const deg = i * 18 + 9;
                  const rad = ((deg - 90) * Math.PI) / 180;
                  return (
                    <line
                      key={`wire-rad-${i}`}
                      x1={cx + rOuterBull * Math.cos(rad)}
                      y1={cy + rOuterBull * Math.sin(rad)}
                      x2={cx + rDoubleOuter * Math.cos(rad)}
                      y2={cy + rDoubleOuter * Math.sin(rad)}
                      stroke="rgba(148, 163, 184, 0.2)"
                      strokeWidth="0.8"
                    />
                  );
                })}

                {/* Outer Bull & Inner Bull (dezent) */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={rOuterBull}
                  fill={activeRing === 'outer_bull' ? '#ff3366' : 'rgba(16, 185, 129, 0.22)'}
                  stroke={activeRing === 'outer_bull' ? '#ffffff' : 'rgba(148, 163, 184, 0.3)'}
                  strokeWidth={activeRing === 'outer_bull' ? '2' : '0.9'}
                  filter={activeRing === 'outer_bull' ? `url(#${uid}-targetFocus)` : undefined}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={rInnerBull}
                  fill={activeRing === 'bull' ? '#ff3366' : 'rgba(244, 63, 94, 0.35)'}
                  stroke={activeRing === 'bull' ? '#ffffff' : 'rgba(255, 255, 255, 0.2)'}
                  strokeWidth={activeRing === 'bull' ? '2' : '0.9'}
                  filter={activeRing === 'bull' ? `url(#${uid}-targetFocus)` : undefined}
                />

                {/* Klare Zahlen im Außenring (aktive Zahl leicht betont) */}
                {BOARD_NUMBERS.map((num, idx) => {
                  const deg = idx * 18;
                  const rad = ((deg - 90) * Math.PI) / 180;
                  const x = cx + rNumberRing * Math.cos(rad);
                  const y = cy + rNumberRing * Math.sin(rad);
                  const isTargetNum = !isBull && activeNum === num;

                  return (
                    <text
                      key={`num-${num}`}
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isTargetNum ? '#ffffff' : 'rgba(148, 163, 184, 0.72)'}
                      fontSize={isTargetNum ? '15' : '12.5'}
                      fontWeight={isTargetNum ? '900' : '700'}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                    >
                      {num}
                    </text>
                  );
                })}

                {/* EINZIGER FOKUS: Das aktive Zielfeld */}
                {!isBull && (() => {
                  const ringInner =
                    activeRing === 'triple'
                      ? rTrebleInner
                      : activeRing === 'double'
                      ? rDoubleInner
                      : rOuterBull;
                  const ringOuter =
                    activeRing === 'triple'
                      ? rTrebleOuter
                      : activeRing === 'double'
                      ? rDoubleOuter
                      : rDoubleInner;

                  return (
                    <g
                      style={{
                        transformOrigin: `${cx}px ${cy}px`,
                        transform: `rotate(${activeAngle}deg)`,
                        transition: 'transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    >
                      <path
                        d={describeSectorRing(cx, cy, ringInner, ringOuter, -9, 9)}
                        fill="#ff3366"
                        fillOpacity={activeRing === 'single' ? 0.65 : 0.95}
                        stroke="#ffffff"
                        strokeWidth="2"
                        filter={`url(#${uid}-targetFocus)`}
                      />
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Dezentes Ziel-Pill unter der Scheibe */}
            <div className="px-5 py-1.5 rounded-full bg-slate-900/55 backdrop-blur-2xl border border-white/15 flex items-center gap-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
              <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
                ZIELFELD
              </span>
              <span className="text-lg font-black font-mono text-white tracking-tight">
                {currentTarget}
              </span>
            </div>
          </div>

          {/* RECHTER FLÜGEL: Glassmorphism Punktestand mit rundem Progress-Gauge */}
          <div className="justify-self-center lg:justify-self-start w-full max-w-[330px] h-[230px] sm:h-[260px] rounded-3xl bg-slate-900/45 backdrop-blur-3xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.15)] p-6 sm:p-7 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-slate-400">
                PUNKTESTAND
              </span>
              <span className="text-[11px] font-mono text-slate-400">MAX 100</span>
            </div>

            {/* Runder Score-Gauge */}
            <div className="relative flex items-center justify-center my-auto">
              <svg viewBox="0 0 160 160" className="w-32 h-32 sm:w-36 sm:h-36 -rotate-90">
                <defs>
                  <linearGradient id={`${uid}-scoreGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                </defs>
                <circle
                  cx="80"
                  cy="80"
                  r={gaugeRadius}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="10"
                />
                <circle
                  cx="80"
                  cy="80"
                  r={gaugeRadius}
                  fill="none"
                  stroke={`url(#${uid}-scoreGrad)`}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={gaugeCircumference}
                  strokeDashoffset={gaugeOffset}
                  style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl sm:text-5xl font-black font-mono text-white leading-none">
                  {currentScore}
                </span>
                <span className="text-xs font-mono text-slate-400 mt-1">/ 100</span>
              </div>
            </div>

            {/* Aufnahme-Balken */}
            <div className="space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">AUFNAHME</span>
                <span className="text-white font-bold">
                  {currentVisit} / {totalVisits}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-all duration-500"
                  style={{ width: `${visitPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="relative z-10 h-2" />
    </div>
  );
}
