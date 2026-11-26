'use client';

import React, { useId } from 'react';
import {
  DartHitValue,
  Darts99LivePlayerStats,
  MAX_POINTS_99,
  TOTAL_DARTS_99,
  TOTAL_ROUNDS_99,
} from '@/app/training/99-darts/types';
import './HolographicDarts99Cockpit.css';

// Offizielle Turnier-Reihenfolge im Uhrzeigersinn ab 12 Uhr (0°)
const DARTBOARD_NUMBERS = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
] as const;

export interface HolographicDarts99Props {
  boardId: string;
  boardLabel?: string;
  p1Name?: string;
  p2Name?: string;
  activeName: string;
  is1vs1?: boolean;
  activePlayer?: 1 | 2;
  targetNumber: number; // 20 | 19 | 18
  p1Stats: Darts99LivePlayerStats;
  p2Stats?: Darts99LivePlayerStats;
  currentTime?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function getSegmentAngle(num: number): number {
  const idx = DARTBOARD_NUMBERS.indexOf(
    num as (typeof DARTBOARD_NUMBERS)[number]
  );
  return idx >= 0 ? idx * 18 : 0;
}

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

function DartSilhouetteSvg() {
  return (
    <svg
      className="d99-dart-svg"
      viewBox="0 0 180 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <polygon points="4,10 26,3 34,8 34,12 26,17" opacity="0.85" />
      <rect x="34" y="8.5" width="44" height="3" rx="1.5" opacity="0.7" />
      <rect x="78" y="7" width="54" height="6" rx="3" />
      <polygon points="132,8.5 174,10 132,11.5" opacity="0.9" />
    </svg>
  );
}

function FullscreenCornerIcon({ isFullscreen }: { isFullscreen?: boolean }) {
  if (isFullscreen) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 9h5V4m11 5h-5V4M4 15h5v5m11-5h-5v5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 4H4v5m11-5h5v5M9 20H4v-5m11 5h5v-5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function getDartSlotMeta(
  val: DartHitValue | undefined,
  idx: number,
  targetNumber: number
): { cls: string; badge: string } {
  if (val === 3) return { cls: 'd99-slot-triple', badge: `T${targetNumber} (+3)` };
  if (val === 2) return { cls: 'd99-slot-double', badge: `D${targetNumber} (+2)` };
  if (val === 1) return { cls: 'd99-slot-single', badge: `S${targetNumber} (+1)` };
  if (val === 0) return { cls: 'd99-slot-miss', badge: 'MISS (0)' };
  return { cls: '', badge: `DART ${idx + 1}` };
}

export default function HolographicDarts99Cockpit({
  boardId,
  boardLabel,
  p1Name = 'Spieler 1',
  p2Name = 'Spieler 2',
  activeName,
  is1vs1 = false,
  activePlayer = 1,
  targetNumber,
  p1Stats,
  p2Stats,
  currentTime,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicDarts99Props) {
  const uid = useId().replace(/:/g, '');
  const goldGlowId = `d99-gold-glow-${uid}`;
  const cyanGlowId = `d99-cyan-glow-${uid}`;
  const wedgeGradId = `d99-wedge-grad-${uid}`;

  // Spielername immer dynamisch aus dem laufenden Spiel (niemals hardcoded!)
  const cleanName = (activeName || '').trim() || 'Spieler';
  const isCompactName = cleanName.length > 15;

  const activeStats =
    is1vs1 && activePlayer === 2 && p2Stats ? p2Stats : p1Stats;

  const displayRound = Math.min(
    Math.max(1, activeStats.currentRound || 1),
    TOTAL_ROUNDS_99
  );
  const safeTarget = [20, 19, 18].includes(targetNumber) ? targetNumber : 20;
  const beamAngle = getSegmentAngle(safeTarget);

  const otherName = activePlayer === 1 ? p2Name : p1Name;
  const otherStats = activePlayer === 1 ? p2Stats : p1Stats;

  const thrownDenom = Math.max(1, activeStats.dartsThrown);
  const triplePct =
    activeStats.dartsThrown > 0
      ? Math.round((activeStats.triples / thrownDenom) * 100)
      : 0;
  const doublePct =
    activeStats.dartsThrown > 0
      ? Math.round((activeStats.doubles / thrownDenom) * 100)
      : 0;
  const singlePct =
    activeStats.dartsThrown > 0
      ? Math.round((activeStats.singles / thrownDenom) * 100)
      : 0;
  const missPct =
    activeStats.dartsThrown > 0
      ? Math.round((activeStats.misses / thrownDenom) * 100)
      : 0;
  const progressPct = Math.min(
    100,
    Math.round((activeStats.dartsThrown / TOTAL_DARTS_99) * 100)
  );

  const handleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
      return;
    }
    if (typeof document !== 'undefined') {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else {
        void document.documentElement.requestFullscreen();
      }
    }
  };

  // Geometrie des transparenten SVG-Overlays exakt auf der Clean-Plate-Dartscheibe
  const cx = 300;
  const cy = 300;
  const rHub = 84;
  const rDoubleOut = 218;
  const rNumberOuter = 272;

  return (
    <main className="d99-screen" aria-label="99 Darts Challenge">
      <div className="d99-canvas">
        {/* Textfreie 1:1 Arena-Clean-Plate */}
        <img
          className="d99-stage-img"
          src="/images/darts99-stage.jpg"
          alt=""
        />

        {/* Obere Header-Kapsel */}
        <header className="d99-header-pill">
          <span>{boardLabel || `BOARD ${boardId}`}</span>
          <i />
          <span>LIONS WEYHAUSEN</span>
          <i />
          <span>99 DARTS CHALLENGE</span>
          <i />
          <span>ZIEL {safeTarget}</span>
          <i />
          <span>
            AUFNAHME {displayRound}/{TOTAL_ROUNDS_99}
          </span>
        </header>

        {/* Oben rechts: Uhrzeit & Vollbild */}
        <div className="d99-top-right">
          {currentTime && <span className="d99-clock">{currentTime}</span>}
          <button
            type="button"
            className="d99-fullscreen-btn"
            onClick={handleFullscreen}
            aria-label={
              isFullscreen ? 'Vollbildmodus beenden' : 'Vollbildmodus umschalten'
            }
            title={
              isFullscreen ? 'Vollbildmodus beenden' : 'Vollbildmodus umschalten'
            }
          >
            <FullscreenCornerIcon isFullscreen={isFullscreen} />
          </button>
        </div>

        {/* Linker Glasflügel: Aktiver Spieler, Dart-Slots & Quoten */}
        <section className="d99-left-wing" aria-label="Aktiver Spieler">
          <div style={{ width: '100%' }}>
            <span className="d99-throw-pill">
              {is1vs1 ? `SPIELER ${activePlayer} · AM WURF` : 'AM WURF'}
            </span>
            <h1
              className={`d99-player-name ${isCompactName ? 'd99-name-compact' : ''}`}
            >
              {cleanName}
            </h1>
            <div className="d99-round-sub">
              AUFNAHME {displayRound} / {TOTAL_ROUNDS_99}
            </div>
          </div>

          <div className="d99-dart-list">
            {[0, 1, 2].map((idx) => {
              const meta = getDartSlotMeta(
                activeStats.currentTurnDarts?.[idx],
                idx,
                safeTarget
              );
              return (
                <div className={`d99-dart-slot ${meta.cls}`} key={idx}>
                  <DartSilhouetteSvg />
                  <span className="d99-dart-badge">{meta.badge}</span>
                </div>
              );
            })}
          </div>

          {is1vs1 && otherStats && (
            <div className="d99-opponent-bar">
              GEGNER: {otherName} · {otherStats.totalPoints} PKT
            </div>
          )}

          <div className="d99-left-kpis">
            <div className="d99-kpi-item">
              <small>TREFFERQUOTE</small>
              <strong>{activeStats.hitQuote.toFixed(1)}%</strong>
            </div>
            <div className="d99-kpi-sep" />
            <div className="d99-kpi-item">
              <small>PKT / DART</small>
              <strong>{activeStats.pointsPerDart.toFixed(2)}</strong>
            </div>
          </div>
        </section>

        {/* Transparentes SVG-Overlay exakt über dem Dartboard (Ziel-Highlight + Zentral-Hub) */}
        <div className="d99-board-overlay" aria-hidden="true">
          <svg viewBox="0 0 600 600">
            <defs>
              <filter
                id={goldGlowId}
                x="-35%"
                y="-35%"
                width="170%"
                height="170%"
              >
                <feGaussianBlur stdDeviation="5.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter
                id={cyanGlowId}
                x="-35%"
                y="-35%"
                width="170%"
                height="170%"
              >
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <linearGradient id={wedgeGradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fde047" stopOpacity="0.45" />
                <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.06" />
              </linearGradient>
            </defs>

            {/* Drehbares Ziel-Highlight exakt auf der aktiven Zielzahl (20, 19 oder 18) */}
            <g transform={`rotate(${beamAngle} ${cx} ${cy})`}>
              {/* Blau leuchtender Rahmen um die Zielzahl im Zahlenring */}
              <path
                d={describeSectorRing(cx, cy, rDoubleOut, rNumberOuter, -9, 9)}
                fill="rgba(37, 99, 235, 0.24)"
                stroke="#38e8ff"
                strokeWidth="2.5"
                filter={`url(#${cyanGlowId})`}
              />

              {/* Warm-goldener Glow-Rahmen über das gesamte Ziel-Segment */}
              <path
                d={describeSectorRing(cx, cy, rHub, rDoubleOut, -9, 9)}
                fill={`url(#${wedgeGradId})`}
                stroke="#fbbf24"
                strokeWidth="2.6"
                filter={`url(#${goldGlowId})`}
              />
            </g>

            {/* Zentraler Ziel-Hub exakt im leeren Glas-Kreis */}
            <g>
              <text
                x={cx}
                y={cy - 26}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#b8ecff"
                fontSize="17"
                fontWeight="800"
                letterSpacing="2.4"
                fontFamily="Barlow Condensed, sans-serif"
              >
                ZIELZAHL
              </text>
              <text
                x={cx}
                y={cy + 16}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ffffff"
                fontSize="66"
                fontWeight="900"
                fontFamily="Barlow Condensed, sans-serif"
                style={{
                  filter: 'drop-shadow(0 0 16px rgba(0, 217, 255, 0.6))',
                }}
              >
                {safeTarget}
              </text>
            </g>
          </svg>
        </div>

        {/* Rechter Glasflügel: Punktestand, Darts-Counter & 5 Live-Balken */}
        <section className="d99-right-wing" aria-label="Punktestand und Statistik">
          <div className="d99-score-head">
            <span className="d99-score-kicker">PUNKTESTAND</span>
            <div className="d99-score-big">
              {activeStats.totalPoints} / {MAX_POINTS_99}
            </div>
            <div className="d99-darts-pill">
              <span>🎯</span>
              <span>
                Darts {activeStats.dartsThrown} / {TOTAL_DARTS_99}
              </span>
            </div>
          </div>

          <div className="d99-stat-list">
            <div className="d99-stat-row">
              <div className="d99-stat-top">
                <span className="d99-stat-label">
                  Triple (T{safeTarget}) · {activeStats.triples}×
                </span>
                <span className="d99-stat-meta">{triplePct}%</span>
              </div>
              <div className="d99-stat-track">
                <div
                  className="d99-stat-fill d99-fill-gold"
                  style={{ width: `${triplePct}%` }}
                />
              </div>
            </div>

            <div className="d99-stat-row">
              <div className="d99-stat-top">
                <span className="d99-stat-label">
                  Double (D{safeTarget}) · {activeStats.doubles}×
                </span>
                <span className="d99-stat-meta">{doublePct}%</span>
              </div>
              <div className="d99-stat-track">
                <div
                  className="d99-stat-fill d99-fill-cyan"
                  style={{ width: `${doublePct}%` }}
                />
              </div>
            </div>

            <div className="d99-stat-row">
              <div className="d99-stat-top">
                <span className="d99-stat-label">
                  Single (S{safeTarget}) · {activeStats.singles}×
                </span>
                <span className="d99-stat-meta">{singlePct}%</span>
              </div>
              <div className="d99-stat-track">
                <div
                  className="d99-stat-fill d99-fill-green"
                  style={{ width: `${singlePct}%` }}
                />
              </div>
            </div>

            <div className="d99-stat-row">
              <div className="d99-stat-top">
                <span className="d99-stat-label">
                  Miss (0 Pkt) · {activeStats.misses}×
                </span>
                <span className="d99-stat-meta">{missPct}%</span>
              </div>
              <div className="d99-stat-track">
                <div
                  className="d99-stat-fill d99-fill-red"
                  style={{ width: `${missPct}%` }}
                />
              </div>
            </div>

            <div className="d99-stat-row">
              <div className="d99-stat-top">
                <span className="d99-stat-label">FORTSCHRITT</span>
                <span className="d99-stat-meta">{progressPct}%</span>
              </div>
              <div className="d99-stat-track">
                <div
                  className="d99-stat-fill d99-fill-cyan"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Untere Legende-Kapsel */}
        <footer className="d99-bottom-pill">
          <span>S{safeTarget}: 1P</span>
          <i />
          <span>D{safeTarget}: 2P</span>
          <i />
          <span>T{safeTarget}: 3P</span>
          <i />
          <span>{TOTAL_DARTS_99} DARTS</span>
        </footer>
      </div>
    </main>
  );
}
