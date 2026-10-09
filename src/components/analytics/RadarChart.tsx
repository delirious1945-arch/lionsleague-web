'use client';

import React from 'react';
import { RadarDimension } from '@/lib/daeEngine';

interface RadarChartProps {
  dimensions: RadarDimension[];
  comparisonDimensions?: RadarDimension[];
  playerName?: string;
  comparisonPlayerName?: string;
  size?: number;
}

export default function RadarChart({
  dimensions,
  comparisonDimensions,
  playerName = 'Spieler',
  comparisonPlayerName = 'Gegner',
  size = 380,
}: RadarChartProps) {
  const center = size / 2;
  const radius = (size / 2) * 0.72;
  const count = dimensions.length;

  // Berechne Punkte auf dem Kreis
  const getCoordinates = (index: number, val: number) => {
    // 0 Grad ist oben ( - PI / 2 )
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const r = (val / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  // SVG-Pfade für Ringe
  const levels = [20, 40, 60, 80, 100];

  // Polygon Spieler 1
  const pointsP1 = dimensions.map((d, i) => {
    const coords = getCoordinates(i, Math.max(d.value, 5));
    return `${coords.x},${coords.y}`;
  }).join(' ');

  // Polygon Spieler 2 (H2H Vergleich)
  const pointsP2 = comparisonDimensions
    ? comparisonDimensions.map((d, i) => {
        const coords = getCoordinates(i, Math.max(d.value, 5));
        return `${coords.x},${coords.y}`;
      }).join(' ')
    : null;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="p1Grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="p2Grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.15" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Konzentrische Ringe */}
          {levels.map((lvl) => {
            const r = (lvl / 100) * radius;
            return (
              <circle
                key={lvl}
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeDasharray={lvl === 100 ? 'none' : '3 3'}
                strokeWidth={lvl === 100 ? '1.5' : '1'}
              />
            );
          })}

          {/* Achsenlinien & Beschriftungen */}
          {dimensions.map((d, i) => {
            const outer = getCoordinates(i, 100);
            const labelCoords = getCoordinates(i, 118);

            return (
              <g key={d.key}>
                {/* Achse */}
                <line
                  x1={center}
                  y1={center}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="1"
                />

                {/* Achsenbeschriftung */}
                <text
                  x={labelCoords.x}
                  y={labelCoords.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[11px] font-extrabold fill-slate-300 select-none tracking-tight"
                >
                  {d.dim}
                </text>
              </g>
            );
          })}

          {/* Vergleichsspieler-Polygon (falls H2H) */}
          {pointsP2 && (
            <>
              <polygon
                points={pointsP2}
                fill="url(#p2Grad)"
                stroke="#F59E0B"
                strokeWidth="2.5"
                filter="url(#glow)"
              />
              {comparisonDimensions?.map((d, i) => {
                const c = getCoordinates(i, Math.max(d.value, 5));
                return (
                  <circle
                    key={`p2-dot-${i}`}
                    cx={c.x}
                    cy={c.y}
                    r="4"
                    fill="#F59E0B"
                    stroke="#1E1E2F"
                    strokeWidth="1.5"
                  />
                );
              })}
            </>
          )}

          {/* Spieler 1 Polygon */}
          <polygon
            points={pointsP1}
            fill="url(#p1Grad)"
            stroke="#00D4FF"
            strokeWidth="2.5"
            filter="url(#glow)"
          />

          {/* Punkte Spieler 1 */}
          {dimensions.map((d, i) => {
            const c = getCoordinates(i, Math.max(d.value, 5));
            return (
              <g key={`p1-dot-${i}`}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r="4.5"
                  fill="#00D4FF"
                  stroke="#081430"
                  strokeWidth="2"
                />
                {/* Kleiner Wert-Badge */}
                <text
                  x={c.x}
                  y={c.y - 8}
                  textAnchor="middle"
                  className="text-[10px] font-black fill-cyan-300 drop-shadow"
                >
                  {d.value}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legende */}
      <div className="flex items-center gap-6 mt-3 text-xs font-bold">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
          <span className="text-white">{playerName}</span>
        </div>
        {comparisonDimensions && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
            <span className="text-white">{comparisonPlayerName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
