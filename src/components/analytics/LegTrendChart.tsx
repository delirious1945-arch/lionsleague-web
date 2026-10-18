'use client';

import React, { useState, useMemo } from 'react';
import { LegTrendPoint } from '@/lib/daeEngine';

interface LegTrendChartProps {
  trendData: LegTrendPoint[];
  matchAvg: number;
  korridorMin: number;
  korridorMax: number;
  playerName: string;
}

export default function LegTrendChart({
  trendData,
  matchAvg,
  korridorMin,
  korridorMax,
  playerName,
}: LegTrendChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<LegTrendPoint | null>(null);
  const [filterScope, setFilterScope] = useState<'season' | 'all'>('season');

  // Gefilterte Leg-Daten nach gewählter Zeitspanne (Standard: Nur aktuelle Saison 2026/27)
  const {
    displayData,
    effectiveMatchAvg,
    effectiveKorridorMin,
    effectiveKorridorMax,
    hasSeasonData,
  } = useMemo(() => {
    if (filterScope === 'all') {
      return {
        displayData: trendData,
        effectiveMatchAvg: matchAvg,
        effectiveKorridorMin: korridorMin,
        effectiveKorridorMax: korridorMax,
        hasSeasonData: true,
      };
    }

    // Filter: Nur aktuelle Saison (2026/2027)
    const filtered = trendData.filter((d) =>
      d.season ? d.season === '2026/2027' : d.match_date >= '2026-08-01'
    );

    if (filtered.length === 0) {
      return {
        displayData: trendData,
        effectiveMatchAvg: matchAvg,
        effectiveKorridorMin: korridorMin,
        effectiveKorridorMax: korridorMax,
        hasSeasonData: false,
      };
    }

    // Neu durchzählen und gleitenden 3-Leg-Schnitt für sauberen Graphen berechnen
    const recent: number[] = [];
    const recomputed: LegTrendPoint[] = filtered.map((d, i) => {
      recent.push(d.leg_avg);
      const last3 = recent.slice(-3);
      const mAvg3 = Math.round((last3.reduce((a, b) => a + b, 0) / last3.length) * 10) / 10;
      return {
        ...d,
        index: i + 1,
        moving_avg_3: mAvg3,
      };
    });

    const avgs = recomputed.map((d) => d.leg_avg);
    const scopeAvg = Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 10) / 10;
    const variance = avgs.reduce((a, b) => a + Math.pow(b - scopeAvg, 2), 0) / (avgs.length || 1);
    const std = Math.sqrt(variance);
    const scopeMin = Math.round(Math.max(10, scopeAvg - std) * 10) / 10;
    const scopeMax = Math.round((scopeAvg + std) * 10) / 10;

    return {
      displayData: recomputed,
      effectiveMatchAvg: scopeAvg,
      effectiveKorridorMin: scopeMin,
      effectiveKorridorMax: scopeMax,
      hasSeasonData: true,
    };
  }, [trendData, filterScope, matchAvg, korridorMin, korridorMax]);

  if (trendData.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm border border-white/5 rounded-2xl bg-white/[0.02]">
        Noch keine Leg-Daten für den Leistungs-Trend vorhanden.
      </div>
    );
  }

  const width = 640;
  const height = 260;
  const padding = { top: 25, right: 30, bottom: 35, left: 45 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Skalierung Min/Max Y anhand von displayData
  const allAvgs = displayData.map((d) => d.leg_avg);
  const minY = Math.max(15, Math.floor(Math.min(...allAvgs, effectiveKorridorMin) / 5) * 5 - 5);
  const maxY = Math.min(100, Math.ceil(Math.max(...allAvgs, effectiveKorridorMax) / 5) * 5 + 5);
  const rangeY = maxY - minY || 1;

  const getX = (idx: number) => {
    if (displayData.length === 1) return padding.left + plotW / 2;
    return padding.left + (idx / (displayData.length - 1)) * plotW;
  };

  const getY = (val: number) => {
    return padding.top + plotH - ((val - minY) / rangeY) * plotH;
  };

  // Korridor SVG Pfad
  const corridorTopY = getY(effectiveKorridorMax);
  const corridorBottomY = getY(effectiveKorridorMin);
  const matchAvgY = getY(effectiveMatchAvg);

  // Gleitender Durchschnitt Pfad
  const trendLinePath = displayData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.moving_avg_3)}`)
    .join(' ');

  return (
    <div className="relative bg-gradient-to-b from-[#091630] to-[#050c1e] border border-cyan-500/20 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between pb-3 mb-2 border-b border-white/10 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>📈</span> Chronologischer Leg-Trend & Konstanz-Korridor
            </h3>
            {filterScope === 'season' && !hasSeasonData && (
              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded">
                Nur Vorsaison verfügbar
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Jeder Punkt = 1 Leg • Gelbe Linie = Gleitender Form-Schnitt (3-Leg-Ø) • Schattiert = Wurfkorridor
          </p>
        </div>

        {/* Umschalter: Aktuelle Saison vs. Gesamt & Legende */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Umschalter Saison vs. Gesamt */}
          <div className="bg-slate-900/90 p-1 rounded-xl border border-white/15 flex items-center gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => setFilterScope('season')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                filterScope === 'season'
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🎯</span> Aktuelle Saison
            </button>
            <button
              type="button"
              onClick={() => setFilterScope('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                filterScope === 'all'
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🌐</span> Gesamt ({trendData.length})
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2.5 text-[11px] font-bold pl-1 border-l border-white/10">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300">Sieg</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span className="text-slate-400">Verlust</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-amber-400" />
              <span className="text-amber-300">3-Leg-Ø</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px] overflow-visible"
        >
          <defs>
            <linearGradient id="corridorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* Horizontale Hilfslinien */}
          {[minY, Math.round((minY + maxY) / 2), maxY].map((val) => (
            <g key={val}>
              <line
                x1={padding.left}
                y1={getY(val)}
                x2={width - padding.right}
                y2={getY(val)}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={getY(val)}
                textAnchor="end"
                dominantBaseline="central"
                className="text-[10px] font-bold fill-slate-500"
              >
                {val}
              </text>
            </g>
          ))}

          {/* Leistungs-Korridor (Schattierter Bereich) */}
          <rect
            x={padding.left}
            y={corridorTopY}
            width={plotW}
            height={Math.max(1, corridorBottomY - corridorTopY)}
            fill="url(#corridorGrad)"
            rx="4"
          />

          {/* Saisonschnitt Mittellinie */}
          <line
            x1={padding.left}
            y1={matchAvgY}
            x2={width - padding.right}
            y2={matchAvgY}
            stroke="#00D4FF"
            strokeDasharray="3 3"
            strokeWidth="1.2"
            opacity="0.6"
          />
          <text
            x={width - padding.right + 5}
            y={matchAvgY}
            dominantBaseline="central"
            className="text-[9px] font-extrabold fill-cyan-400"
          >
            Ø {effectiveMatchAvg.toFixed(1)}
          </text>

          {/* Gleitender Trend (Linie) */}
          {displayData.length > 1 && (
            <path
              d={trendLinePath}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-md"
            />
          )}

          {/* Datenpunkte pro Leg */}
          {displayData.map((pt, idx) => {
            const cx = getX(idx);
            const cy = getY(pt.leg_avg);
            const isHovered = hoveredPoint?.index === pt.index;

            return (
              <g
                key={`${pt.match_date}-${pt.index}`}
                className="cursor-pointer transition-transform duration-150"
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Verbindungslinie zum Boden/Hover */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={padding.top}
                    x2={cx}
                    y2={height - padding.bottom}
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Punkt */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6.5 : pt.is_win ? 4.5 : 3.5}
                  fill={pt.is_win ? '#10B981' : '#64748B'}
                  stroke={pt.is_win ? '#059669' : '#334155'}
                  strokeWidth={isHovered ? '2.5' : '1.5'}
                  className="transition-all"
                />

                {/* Gewinner-Glow */}
                {pt.is_win && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="8"
                    fill="#10B981"
                    opacity="0.25"
                  />
                )}
              </g>
            );
          })}

          {/* X-Achsen Beschriftung */}
          <text
            x={padding.left}
            y={height - 10}
            className="text-[10px] font-bold fill-slate-500"
          >
            Leg 1
          </text>
          <text
            x={width - padding.right}
            y={height - 10}
            textAnchor="end"
            className="text-[10px] font-bold fill-slate-500"
          >
            Leg {displayData.length}
          </text>
        </svg>

        {/* Hover Tooltip Popup */}
        {hoveredPoint && (
          <div className="absolute top-2 right-4 bg-slate-900/95 border border-cyan-400/60 shadow-2xl rounded-xl p-3 text-xs pointer-events-none backdrop-blur-md animate-fadeIn z-20">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="font-extrabold text-white">
                Leg #{hoveredPoint.index}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                  hoveredPoint.is_win
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {hoveredPoint.is_win ? 'GEWONNEN' : 'VERLOREN'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300 text-[11px] pt-1 border-t border-white/10">
              <div>
                Average:{' '}
                <span className="font-bold text-cyan-300">
                  {hoveredPoint.leg_avg.toFixed(1)}
                </span>
              </div>
              <div>
                Darts:{' '}
                <span className="font-bold text-white">
                  {hoveredPoint.darts_thrown}
                </span>
              </div>
              {hoveredPoint.checkout && (
                <div>
                  Finish-Checkout:{' '}
                  <span className="font-bold text-emerald-400">
                    {hoveredPoint.checkout} Pkt
                  </span>
                </div>
              )}
              <div>
                Form-Schnitt (3-Leg-Ø):{' '}
                <span className="font-bold text-amber-300">
                  {hoveredPoint.moving_avg_3.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
        <div>
          Korridor-Spannbreite ({filterScope === 'season' ? 'Saison 2026/27' : 'Gesamt'}):{' '}
          <span className="text-cyan-300 font-bold">
            {effectiveKorridorMin} – {effectiveKorridorMax} Pkt
          </span>
        </div>
        <div>
          Gespielte Legs:{' '}
          <span className="text-cyan-300 font-bold">{displayData.length}</span>
          {filterScope === 'season' && (
            <span className="text-slate-500 ml-1">
              (von {trendData.length} Legs historisch)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
