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
    <div className="relative w-screen h-screen bg-[#0a1324] text-white flex flex-col justify-between p-4 sm:p-7 overflow-hidden select-none font-sans">
      {/* Hellerer, freundlicher Hintergrund mit sanften Licht-Akzenten für starken Glassmorphism-Kontrast */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#17284a_0%,#0b1426_55%,#070d1a_100%)]" />
        <div className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full bg-sky-400/18 blur-[120px]" />
        <div className="absolute top-[25%] left-1/2 -translate-x-1/2 w-[620px] h-[620px] rounded-full bg-indigo-400/12 blur-[130px]" />
        <div className="absolute -bottom-24 -right-24 w-[520px] h-[520px] rounded-full bg-amber-400/14 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0c_1px,transparent_1px)] [background-size:40px_40px] opacity-35" />
      </div>

      {/* Top Header + 3-Phasen-Stepper */}
      <header className="relative z-20 flex flex-col items-center gap-3 w-full">
        <div className="relative w-full flex items-center justify-center">
          <div className="px-6 sm:px-10 py-2 rounded-full bg-slate-800/50 backdrop-blur-2xl border border-white/25 shadow-[0_10px_35px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.28)] flex items-center gap-2.5 text-xs sm:text-sm font-mono font-bold tracking-wider">
            <span className="text-amber-300">BOARD {boardId}</span>
            <span className="text-slate-400">•</span>
            <span className="text-white uppercase">LIONS WEYHAUSEN</span>
            <span className="text-slate-400">•</span>
            <span className="text-sky-200">PDC CHALLENGE</span>
          </div>

          <div className="absolute right-0 flex items-center gap-3">
            {currentTime && (
              <span className="hidden sm:inline text-xs font-mono text-slate-300 tracking-widest">
                {currentTime}
              </span>
            )}
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-slate-200 hover:text-white transition-all cursor-pointer backdrop-blur-xl"
                title="Vollbild"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* 3-Phasen-Stepper */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-2xl bg-slate-800/45 backdrop-blur-2xl border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.22)]">
          {phases.map((p) => {
            const isActive = phase === p.id;
            const isDone = phase > p.id;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl font-mono text-[10px] sm:text-xs font-bold tracking-wider transition-all ${
                  isActive
                    ? 'bg-amber-400/20 border border-amber-300/70 text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.22)]'
                    : isDone
                    ? 'bg-emerald-500/15 border border-emerald-400/40 text-emerald-200'
                    : 'bg-transparent border border-transparent text-slate-400'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    isActive
                      ? 'bg-amber-300 text-slate-950'
                      : isDone
                      ? 'bg-emerald-400/30 text-emerald-200'
                      : 'bg-white/10 text-slate-400'
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

      {/* Haupt-Cockpit: Links Spieler (Glass), Mitte klare Turnier-Scheibe, Rechts Score-Gauge (Glass) */}
      <main className="relative z-10 flex-1 flex items-center justify-center w-full max-w-7xl mx-auto px-2 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-6 lg:gap-10 w-full">
          {/* LINKER FLÜGEL: Kontrastreiche Glassmorphism Spielerkarte */}
          <div className="relative justify-self-center lg:justify-self-end w-full max-w-[335px] h-[240px] sm:h-[268px] rounded-3xl bg-slate-800/45 backdrop-blur-3xl border border-white/25 shadow-[0_24px_55px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] p-6 sm:p-7 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-sky-300/60 to-transparent" />

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-sky-200">
                {is1vs1 ? `SPIELER ${activePlayer}` : 'SPIELER AM OCHE'}
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
            </div>

            <div className="my-auto">
              <h2
                className={`${nameSizeClass} font-black text-white tracking-tight leading-tight break-words drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]`}
              >
                {activeName}
              </h2>
            </div>

            <div className="pt-3 border-t border-white/15 flex items-center justify-between">
              <span className="px-3.5 py-1.5 rounded-full bg-amber-400/20 border border-amber-300/55 text-amber-200 font-mono text-xs font-bold tracking-wider shadow-[0_0_14px_rgba(251,191,36,0.18)]">
                AM WURF
              </span>
              <span className="text-xs font-mono text-slate-300">
                ZIEL: <strong className="text-white">{currentTarget}</strong>
              </span>
            </div>
          </div>

          {/* ZENTRUM: Klare Turnier-Scheibe (Doppel & Trippel sofort erkennbar) + größere Zielfeld-Kachel */}
          <div className="justify-self-center flex flex-col items-center gap-3.5">
            <div className="relative w-[300px] h-[300px] sm:w-[365px] sm:h-[365px] lg:w-[410px] lg:h-[410px] flex items-center justify-center">
              <svg viewBox="0 0 420 420" className="w-full h-full select-none pointer-events-none drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
                <defs>
                  <filter id={`${uid}-targetFocus`} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Äußerer Zahlenring / Surround */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={rOuterRim}
                  fill="#0c1322"
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeWidth="2"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={rOuterRim - 5}
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.16)"
                  strokeWidth="1"
                />

                {/* 20 Segmente mit klar erkennbaren Doppel- & Trippel-Ringen im edlen Turnier-Kontrast */}
                {BOARD_NUMBERS.map((num, idx) => {
                  const centerDeg = idx * 18;
                  const startDeg = centerDeg - 9;
                  const endDeg = centerDeg + 9;
                  const isEven = idx % 2 === 0;

                  // Klassische Turnier-Farblogik: Schwarz/Creme-Sisal für Singles, Rubinrot/Smaragdgrün für Double & Treble
                  const singleFill = isEven ? '#111827' : '#26334a';
                  const ringFill = isEven ? 'rgba(225, 29, 72, 0.52)' : 'rgba(16, 185, 129, 0.48)';

                  return (
                    <g key={`sec-${num}`}>
                      {/* Double Ring */}
                      <path
                        d={describeSectorRing(cx, cy, rDoubleInner, rDoubleOuter, startDeg, endDeg)}
                        fill={ringFill}
                      />
                      {/* Outer Single */}
                      <path
                        d={describeSectorRing(cx, cy, rTrebleOuter, rDoubleInner, startDeg, endDeg)}
                        fill={singleFill}
                      />
                      {/* Treble Ring */}
                      <path
                        d={describeSectorRing(cx, cy, rTrebleInner, rTrebleOuter, startDeg, endDeg)}
                        fill={ringFill}
                      />
                      {/* Inner Single */}
                      <path
                        d={describeSectorRing(cx, cy, rOuterBull, rTrebleInner, startDeg, endDeg)}
                        fill={singleFill}
                      />
                    </g>
                  );
                })}

                {/* Klare silber-metallische Spider-Drähte (ohne grellen Neon-Glow) */}
                {[rDoubleOuter, rDoubleInner, rTrebleOuter, rTrebleInner].map((r, i) => (
                  <circle
                    key={`wire-ring-${i}`}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke="rgba(226, 232, 240, 0.52)"
                    strokeWidth={i === 0 ? '1.4' : '1.15'}
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
                      stroke="rgba(226, 232, 240, 0.48)"
                      strokeWidth="1.1"
                    />
                  );
                })}

                {/* Outer Bull (25) & Inner Bull (50) */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={rOuterBull}
                  fill={activeRing === 'outer_bull' ? '#ff3366' : 'rgba(16, 185, 129, 0.55)'}
                  stroke={activeRing === 'outer_bull' ? '#ffffff' : 'rgba(226, 232, 240, 0.65)'}
                  strokeWidth={activeRing === 'outer_bull' ? '2.2' : '1.2'}
                  filter={activeRing === 'outer_bull' ? `url(#${uid}-targetFocus)` : undefined}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={rInnerBull}
                  fill={activeRing === 'bull' ? '#ff3366' : 'rgba(225, 29, 72, 0.72)'}
                  stroke={activeRing === 'bull' ? '#ffffff' : 'rgba(226, 232, 240, 0.7)'}
                  strokeWidth={activeRing === 'bull' ? '2.2' : '1.2'}
                  filter={activeRing === 'bull' ? `url(#${uid}-targetFocus)` : undefined}
                />

                {/* Klare Zahlen im Außenring */}
                {BOARD_NUMBERS.map((num, idx) => {
                  const deg = idx * 18;
                  const rad = ((deg - 90) * Math.PI) / 180;
                  const x = cx + rNumberRing * Math.cos(rad);
                  const y = cy + rNumberRing * Math.sin(rad);
                  const isTargetNum = !isBull && activeNum === num;

                  return (
                    <g key={`num-${num}`}>
                      {isTargetNum && (
                        <circle
                          cx={x}
                          cy={y}
                          r="12.5"
                          fill="rgba(255, 51, 102, 0.28)"
                          stroke="#ff4d79"
                          strokeWidth="1.2"
                        />
                      )}
                      <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={isTargetNum ? '#ffffff' : '#cbd5e1'}
                        fontSize={isTargetNum ? '15.5' : '13'}
                        fontWeight={isTargetNum ? '900' : '700'}
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                      >
                        {num}
                      </text>
                    </g>
                  );
                })}

                {/* AKTIVES ZIELFELD: Klare Hervorhebung auf dem Ziel-Segment */}
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
                        fill="#ff2e63"
                        fillOpacity={activeRing === 'single' ? 0.68 : 0.96}
                        stroke="#ffffff"
                        strokeWidth="2.4"
                        filter={`url(#${uid}-targetFocus)`}
                      />
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Größere, kontrastreiche Zielfeld-Kachel im Glassmorphism-Stil */}
            <div className="px-9 py-2.5 rounded-2xl bg-slate-800/55 backdrop-blur-2xl border border-white/25 shadow-[0_12px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.28)] flex items-center gap-4">
              <span className="text-xs sm:text-sm font-mono font-bold uppercase tracking-[0.2em] text-amber-200">
                ZIELFELD
              </span>
              <span className="w-[1px] h-5 bg-white/20" />
              <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight drop-shadow-[0_2px_10px_rgba(255,46,99,0.5)]">
                {currentTarget}
              </span>
            </div>
          </div>

          {/* RECHTER FLÜGEL: Kontrastreiche Glassmorphism Punktestand-Karte */}
          <div className="relative justify-self-center lg:justify-self-start w-full max-w-[335px] h-[240px] sm:h-[268px] rounded-3xl bg-slate-800/45 backdrop-blur-3xl border border-white/25 shadow-[0_24px_55px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] p-6 sm:p-7 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent" />

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-emerald-200">
                PUNKTESTAND
              </span>
              <span className="text-[11px] font-mono text-slate-300">MAX 100</span>
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
                  stroke="rgba(255,255,255,0.14)"
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
                <span className="text-4xl sm:text-5xl font-black font-mono text-white leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
                  {currentScore}
                </span>
                <span className="text-xs font-mono text-slate-300 mt-1">/ 100</span>
              </div>
            </div>

            {/* Aufnahme-Balken */}
            <div className="space-y-1.5 pt-2 border-t border-white/15">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">AUFNAHME</span>
                <span className="text-white font-bold">
                  {currentVisit} / {totalVisits}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
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
