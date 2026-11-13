'use client';

import React, { useId } from 'react';

// Offizielle Turnier-Reihenfolge im Uhrzeigersinn ab 12 Uhr (0°)
const BOARD_NUMBERS = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
] as const;

interface HolographicDartboardProps {
  /** Aktuelles Ziel, z. B. "D20", "T20", "D16", "25" oder "BULL" */
  target: string;
  /** Optionales Label über dem Ziel im Zentrum (z. B. "DOPPEL" oder "ZIELFELD") */
  badgeLabel?: string;
  /** Optionale Größe / Klassen für den Container */
  className?: string;
}

/**
 * Erzeugt einen SVG-Ringsektor-Pfad (Wedge) zwischen innerRadius und outerRadius
 * von startDeg bis endDeg (0° = 12 Uhr, im Uhrzeigersinn).
 */
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

type TargetRing = 'double' | 'triple' | 'single' | 'outer_bull' | 'bull';

/**
 * Ermittelt Zielnummer, Ringtyp und exakten Winkel (0° = oben) aus dem Zielstring.
 */
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
  if (match) {
    const prefix = match[1] || 'S';
    const num = parseInt(match[2], 10);
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

  // Fallback: Wenn zusammengesetzter String übergeben wird (z.B. "#10" oder "(#10)")
  const hashMatch = normalized.match(/#(\d{1,2})/);
  if (hashMatch) {
    const num = parseInt(hashMatch[1], 10);
    const idx = BOARD_NUMBERS.indexOf(num as (typeof BOARD_NUMBERS)[number]);
    if (idx >= 0) {
      return { number: num, ring: 'single', angle: idx * 18, isBull: false };
    }
  }

  // Fallback: Einzelne Zahl im String suchen
  const numMatch = normalized.match(/\b(\d{1,2})\b/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    const idx = BOARD_NUMBERS.indexOf(num as (typeof BOARD_NUMBERS)[number]);
    if (idx >= 0) {
      return { number: num, ring: 'single', angle: idx * 18, isBull: false };
    }
  }

  return {
    number: 20,
    ring: 'single',
    angle: 0,
    isBull: false,
  };
}

export default function HolographicDartboard({
  target,
  badgeLabel,
  className = '',
}: HolographicDartboardProps) {
  const uid = useId().replace(/:/g, '');
  const { number: activeNum, ring: activeRing, angle: activeAngle, isBull } = parseTarget(target);

  const cx = 250;
  const cy = 250;

  // Turnier-inspirierte Radien (bezogen auf 500x500 ViewBox)
  const rHudOuter = 242;
  const rHudTicks = 230;
  const rCatchOuter = 218;
  const rNumberRing = 197;
  const rDoubleOuter = 176;
  const rDoubleInner = 160;
  const rTrebleOuter = 114;
  const rTrebleInner = 100;
  const rOuterBull = 36;
  const rInnerBull = 18;

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Äußerer atmosphärischer Halo */}
      <div className="absolute inset-3 rounded-full border border-cyan-400/30 shadow-[0_0_70px_rgba(6,182,212,0.35),inset_0_0_45px_rgba(6,182,212,0.2)] pointer-events-none" />

      <svg
        viewBox="0 0 500 500"
        className="w-full h-full drop-shadow-[0_0_32px_rgba(0,229,255,0.38)] pointer-events-none"
      >
        <defs>
          <filter id={`${uid}-cyanGlow`} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`${uid}-targetGlow`} x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id={`${uid}-boardBg`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#081b33" stopOpacity="0.95" />
            <stop offset="72%" stopColor="#040d1c" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#020712" stopOpacity="0.98" />
          </radialGradient>
          <linearGradient id={`${uid}-glassSweep`} x1="15%" y1="10%" x2="85%" y2="90%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
            <stop offset="45%" stopColor="#00e5ff" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* 1. Äußerer HUD-Radar-Rahmen & Grad-Ticks (Figma-HUD-Inspiration) */}
        <circle
          cx={cx}
          cy={cy}
          r={rHudOuter}
          fill="none"
          stroke="#00e5ff"
          strokeWidth="0.75"
          strokeOpacity="0.22"
          strokeDasharray="6 6"
        />
        <circle
          cx={cx}
          cy={cy}
          r={rHudTicks}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.2"
          strokeOpacity="0.35"
          strokeDasharray="48 16 12 16"
        />

        {/* 72 feine HUD-Gradstriche alle 5° */}
        {Array.from({ length: 72 }).map((_, i) => {
          const deg = i * 5;
          const rad = ((deg - 90) * Math.PI) / 180;
          const isMajor = deg % 90 === 0;
          const isSectorCenter = deg % 18 === 0;
          const r1 = isMajor ? rHudOuter + 5 : isSectorCenter ? rHudTicks + 4 : rHudTicks;
          const r2 = isMajor ? rCatchOuter + 3 : rHudTicks - (isSectorCenter ? 4 : 2.5);
          return (
            <line
              key={`tick-${i}`}
              x1={cx + r1 * Math.cos(rad)}
              y1={cy + r1 * Math.sin(rad)}
              x2={cx + r2 * Math.cos(rad)}
              y2={cy + r2 * Math.sin(rad)}
              stroke="#00e5ff"
              strokeWidth={isMajor ? 1.8 : isSectorCenter ? 1.1 : 0.7}
              strokeOpacity={isMajor ? 0.75 : isSectorCenter ? 0.45 : 0.22}
            />
          );
        })}

        {/* 2. Catchring / Surround & Board-Grundfläche */}
        <circle
          cx={cx}
          cy={cy}
          r={rCatchOuter}
          fill={`url(#${uid}-boardBg)`}
          stroke="#00e5ff"
          strokeWidth="2.2"
          strokeOpacity="0.7"
          filter={`url(#${uid}-cyanGlow)`}
        />
        <circle
          cx={cx}
          cy={cy}
          r={rCatchOuter - 4}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="0.8"
          strokeOpacity="0.35"
        />

        {/* 3. Alle 20 Segmente mit exakten Turnier-Ringen (Double, Outer Single, Treble, Inner Single) */}
        {BOARD_NUMBERS.map((num, idx) => {
          const centerDeg = idx * 18;
          const startDeg = centerDeg - 9;
          const endDeg = centerDeg + 9;
          const isEven = idx % 2 === 0;
          const isTargetSector = !isBull && activeNum === num;

          const singleFill = isEven
            ? 'rgba(7, 16, 34, 0.92)'
            : 'rgba(18, 46, 78, 0.42)';
          const ringFill = isEven
            ? 'rgba(0, 229, 255, 0.16)'
            : 'rgba(14, 116, 144, 0.28)';

          return (
            <g key={`sector-${num}`}>
              {/* Double Ring */}
              <path
                d={describeSectorRing(cx, cy, rDoubleInner, rDoubleOuter, startDeg, endDeg)}
                fill={ringFill}
              />
              {/* Outer Single */}
              <path
                d={describeSectorRing(cx, cy, rTrebleOuter, rDoubleInner, startDeg, endDeg)}
                fill={isTargetSector ? 'rgba(255, 51, 102, 0.10)' : singleFill}
              />
              {/* Treble Ring */}
              <path
                d={describeSectorRing(cx, cy, rTrebleInner, rTrebleOuter, startDeg, endDeg)}
                fill={ringFill}
              />
              {/* Inner Single */}
              <path
                d={describeSectorRing(cx, cy, rOuterBull, rTrebleInner, startDeg, endDeg)}
                fill={isTargetSector ? 'rgba(255, 51, 102, 0.08)' : singleFill}
              />
            </g>
          );
        })}

        {/* 4. Konzentrische Spider-Ringe */}
        {[rDoubleOuter, rDoubleInner, rTrebleOuter, rTrebleInner].map((r, i) => (
          <circle
            key={`ring-${i}`}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={i === 0 ? 1.8 : 1.1}
            strokeOpacity={i === 0 ? 0.75 : 0.48}
          />
        ))}

        {/* 5. Radiale Spider-Drähte (exakt auf den Segmentgrenzen: ±9°, 27°, 45°, ...) */}
        {Array.from({ length: 20 }).map((_, i) => {
          const deg = i * 18 + 9;
          const rad = ((deg - 90) * Math.PI) / 180;
          return (
            <line
              key={`wire-${i}`}
              x1={cx + rOuterBull * Math.cos(rad)}
              y1={cy + rOuterBull * Math.sin(rad)}
              x2={cx + rDoubleOuter * Math.cos(rad)}
              y2={cy + rDoubleOuter * Math.sin(rad)}
              stroke="#67e8f9"
              strokeWidth="1"
              strokeOpacity="0.45"
            />
          );
        })}

        {/* 6. Outer Bull (25) & Inner Bull (50) */}
        <circle
          cx={cx}
          cy={cy}
          r={rOuterBull}
          fill={activeRing === 'outer_bull' ? '#ff3366' : 'rgba(16, 185, 129, 0.25)'}
          stroke={activeRing === 'outer_bull' ? '#ffe4e6' : '#34d399'}
          strokeWidth={activeRing === 'outer_bull' ? '2' : '1.4'}
          strokeOpacity={activeRing === 'outer_bull' ? '1' : '0.7'}
          filter={activeRing === 'outer_bull' ? `url(#${uid}-targetGlow)` : undefined}
        />
        <circle
          cx={cx}
          cy={cy}
          r={rInnerBull}
          fill={activeRing === 'bull' ? '#ff3366' : 'rgba(244, 63, 94, 0.45)'}
          stroke="#fda4af"
          strokeWidth="1.5"
          filter={activeRing === 'bull' ? `url(#${uid}-targetGlow)` : undefined}
        />

        {/* 7. Zahlenring mit allen 20 echten Board-Zahlen (aufrecht & gestochen scharf) */}
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
                  r="14"
                  fill="rgba(255, 51, 102, 0.22)"
                  stroke="#ff3366"
                  strokeWidth="1.2"
                />
              )}
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isTargetNum ? '#ff6699' : '#bae6fd'}
                fontSize={isTargetNum ? '18' : '15'}
                fontWeight="800"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                style={{
                  letterSpacing: '-0.02em',
                  filter: isTargetNum ? 'drop-shadow(0 0 8px rgba(255, 51, 102, 0.9))' : undefined,
                }}
              >
                {num}
              </text>
            </g>
          );
        })}

        {/* 8. Aktives Ziel-Segment (rotierender Laser-Marker auf Double, Treble oder Single) */}
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
                transition: 'transform 0.75s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {/* Leuchtendes Zielfeld */}
              <path
                d={describeSectorRing(cx, cy, ringInner, ringOuter, -9, 9)}
                fill="#ff3366"
                fillOpacity={activeRing === 'single' ? 0.52 : 0.92}
                filter={`url(#${uid}-targetGlow)`}
              />
              <path
                d={describeSectorRing(cx, cy, ringInner, ringOuter, -9, 9)}
                fill="none"
                stroke="#ffe4e6"
                strokeWidth="2"
              />
              {/* Subtiler Zielstrahl vom Center zum Zielring */}
              <line
                x1={cx}
                y1={cy - rOuterBull - 4}
                x2={cx}
                y2={cy - ringInner}
                stroke="#ff3366"
                strokeWidth="1.4"
                strokeOpacity="0.45"
                strokeDasharray="4 4"
              />
              {/* Präzisions-Marker am äußeren Ring */}
              <polygon
                points={`${cx},${cy - rCatchOuter - 2} ${cx - 5},${cy - rCatchOuter - 10} ${cx + 5},${cy - rCatchOuter - 10}`}
                fill="#ff3366"
                filter={`url(#${uid}-targetGlow)`}
              />
              <line
                x1={cx}
                y1={cy - ringOuter - 3}
                x2={cx}
                y2={cy - ringInner + 3}
                stroke="#ffffff"
                strokeWidth="2"
                strokeOpacity="0.9"
              />
            </g>
          );
        })()}

        {/* 9. Dezente gläserne Lichtreflexion */}
        <circle
          cx={cx}
          cy={cy}
          r={rDoubleOuter}
          fill={`url(#${uid}-glassSweep)`}
          pointerEvents="none"
        />
      </svg>

      {/* Zentriertes Ziel-Badge (kompakt, damit Treble-Ring & innere Segmente sichtbar bleiben) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-slate-950/90 backdrop-blur-md border-2 border-cyan-400/80 shadow-[0_0_32px_rgba(6,182,212,0.55),inset_0_0_18px_rgba(6,182,212,0.25)] flex flex-col items-center justify-center">
          <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-[0.22em] text-cyan-300/80 uppercase">
            {badgeLabel || (isBull ? 'ZIEL' : activeRing === 'double' ? 'DOPPEL' : activeRing === 'triple' ? 'TRIPLE' : 'ZIELFELD')}
          </span>
          <span className="text-3xl sm:text-4xl md:text-5xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_16px_rgba(0,229,255,0.85)] leading-none mt-0.5">
            {isBull ? 'BULL' : activeNum !== null ? (activeRing === 'double' ? `D${activeNum}` : activeRing === 'triple' ? `T${activeNum}` : String(activeNum)) : target}
          </span>
        </div>
      </div>
    </div>
  );
}
