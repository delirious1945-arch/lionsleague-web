'use client';

import React, { useId } from 'react';
import { extractTargetNumber } from '@/components/TrainingMonitorShell';
import './HolographicCheckoutBattleCockpit.css';

// Offizielle Turnier-Reihenfolge im Uhrzeigersinn ab 12 Uhr (0°)
const DARTBOARD_NUMBERS = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
] as const;

export interface HolographicCheckoutBattleProps {
  boardId: string;
  boardLabel?: string;
  activeName: string;
  is1vs1?: boolean;
  activePlayer?: 1 | 2;
  currentTarget: string;
  currentRound: number;
  totalRounds?: number;
  quote: number;
  hits?: number;
  thrown?: number;
  currentTime?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function getSegmentAngle(num: number | null): number {
  if (!num) return 0;
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

function BrandCrownIcon() {
  return (
    <svg
      className="cb-brand-icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3.5 17.5h17L22 8.5l-5 3.4L12 4.5 7 11.9 2 8.5l1.5 9Zm0 2h17v1.8h-17v-1.8Z" />
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

export default function HolographicCheckoutBattleCockpit({
  boardId,
  boardLabel,
  activeName,
  is1vs1 = false,
  activePlayer = 1,
  currentTarget,
  currentRound,
  totalRounds = 10,
  quote,
  hits = 0,
  thrown = 0,
  currentTime,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicCheckoutBattleProps) {
  const uid = useId().replace(/:/g, '');
  const redGlowId = `cb-red-glow-${uid}`;
  const laserGradId = `cb-laser-grad-${uid}`;
  const numGlowGradId = `cb-num-glow-${uid}`;

  // Spielername immer dynamisch aus dem laufenden Spiel (niemals hardcoded!)
  const cleanName = (activeName || '').trim() || 'Spieler';
  const nameParts = cleanName.split(/\s+/).filter(Boolean);
  const longestPartLen = Math.max(...nameParts.map((p) => p.length), 0);
  const isCompactName = longestPartLen > 12 || nameParts.length > 2;

  const safeTotal = Math.max(1, totalRounds);
  const safeRound = Math.max(1, Math.min(currentRound, safeTotal));
  const safeTarget = (currentTarget || 'D20').trim().toUpperCase();
  const targetNumber = extractTargetNumber(safeTarget);
  const beamAngle = getSegmentAngle(targetNumber);
  const isBullTarget = targetNumber === null;

  // Gold-Balken-Fortschritt (zeigt dynamisch Rundenfortschritt mit sichtbarem Basis-Glow)
  const roundProgressPct = Math.round((safeRound / safeTotal) * 100);
  const goldBarWidth = Math.max(14, Math.min(100, roundProgressPct));

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
  const rDoubleIn = 202;
  const rDoubleOut = 221;
  const rNumberOuter = 272;
  const rDoubleCenter = (rDoubleIn + rDoubleOut) / 2;

  return (
    <main className="cb-screen" aria-label="Checkout Battle">
      <div className="cb-canvas">
        {/* Textfreie 1:1 Arena-Clean-Plate */}
        <img
          className="cb-stage-img"
          src="/images/checkout-battle-stage.jpg"
          alt=""
        />

        {/* Oben links: Checkout Battle Brand */}
        <div className="cb-brand">
          <BrandCrownIcon />
          <span className="cb-brand-text">CHECKOUT BATTLE</span>
        </div>

        {/* Oben mittig: Dynamische Spiel-Kapsel */}
        <header className="cb-header-pill">
          <span>{boardLabel || `BOARD ${boardId}`}</span>
          <i />
          <span>LIONS WEYHAUSEN</span>
          <i />
          <span>
            AUFNAHME {safeRound}/{safeTotal}
          </span>
        </header>

        {/* Oben rechts: Uhrzeit + Vollbild */}
        <div className="cb-top-right">
          {currentTime && <span className="cb-clock">{currentTime}</span>}
          <button
            type="button"
            className="cb-fullscreen-btn"
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

        {/* Linker Glasflügel: Aktiver Spieler aus dem Spiel */}
        <section className="cb-left-wing" aria-label="Aktiver Spieler">
          <span className="cb-kicker">
            {is1vs1 ? `SPIELER ${activePlayer} AM OCHE` : 'SPIELER AM OCHE'}
          </span>
          <div className="cb-divider" />
          <h1
            className={`cb-player-name ${isCompactName ? 'cb-name-compact' : ''}`}
          >
            {nameParts.map((part, idx) => (
              <span key={`${part}-${idx}`}>{part}</span>
            ))}
          </h1>
          <div className="cb-throw-pill">AM WURF</div>
        </section>

        {/* Transparentes SVG-Overlay exakt auf dem Dartboard (Laser + Fadenkreuz + Ziel-Hub) */}
        <div className="cb-board-overlay" aria-hidden="true">
          <svg viewBox="0 0 600 600">
            <defs>
              <filter
                id={redGlowId}
                x="-40%"
                y="-40%"
                width="180%"
                height="180%"
              >
                <feGaussianBlur stdDeviation="6.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <linearGradient id={laserGradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff225c" stopOpacity="0.95" />
                <stop offset="55%" stopColor="#ff164d" stopOpacity="0.52" />
                <stop offset="100%" stopColor="#ff164d" stopOpacity="0.02" />
              </linearGradient>

              <radialGradient id={numGlowGradId} cx="50%" cy="35%" r="70%">
                <stop offset="0%" stopColor="#ff336b" stopOpacity="0.68" />
                <stop offset="100%" stopColor="#c40d3a" stopOpacity="0.18" />
              </radialGradient>
            </defs>

            {/* Drehbares rotes Laser-Highlight exakt auf das aktive Doppel-Segment */}
            {!isBullTarget && (
              <g transform={`rotate(${beamAngle} ${cx} ${cy})`}>
                {/* Roter Glow-Kegel über der aktiven Zahl */}
                <path
                  d={describeSectorRing(cx, cy, rDoubleOut, rNumberOuter, -9, 9)}
                  fill={`url(#${numGlowGradId})`}
                  stroke="#ff4b7d"
                  strokeWidth="1.4"
                  filter={`url(#${redGlowId})`}
                />

                {/* Laser-Strahl vom oberen Rand bis zum Doppel-Ring */}
                <polygon
                  points={`${cx - 16},-22 ${cx + 16},-22 ${cx + 24},${cy - rDoubleIn + 8} ${cx - 24},${cy - rDoubleIn + 8}`}
                  fill={`url(#${laserGradId})`}
                  filter={`url(#${redGlowId})`}
                />
                <line
                  x1={cx}
                  y1="-24"
                  x2={cx}
                  y2={cy - rDoubleCenter}
                  stroke="#ff9eb8"
                  strokeWidth="2.8"
                  opacity="0.95"
                />

                {/* Aktives Doppel-Feld Highlight */}
                <path
                  d={describeSectorRing(cx, cy, rDoubleIn, rDoubleOut, -9, 9)}
                  fill="rgba(255, 22, 77, 0.36)"
                  stroke="#ff5c8a"
                  strokeWidth="2.4"
                  filter={`url(#${redGlowId})`}
                />

                {/* Fadenkreuz auf dem aktiven Doppel */}
                <g
                  transform={`translate(${cx}, ${cy - rDoubleCenter})`}
                  stroke="#ffffff"
                  opacity="0.96"
                >
                  <circle r="8.5" fill="rgba(255, 22, 77, 0.35)" strokeWidth="1.5" />
                  <line x1="-12" y1="0" x2="12" y2="0" strokeWidth="1.1" />
                  <line x1="0" y1="-12" x2="0" y2="12" strokeWidth="1.1" />
                </g>
              </g>
            )}

            {/* Zentraler Ziel-Hub exakt im leeren Glas-Kreis */}
            <g>
              <text
                x={cx}
                y={cy - 22}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#b8ecff"
                fontSize="16"
                fontWeight="800"
                letterSpacing="2.4"
                fontFamily="Barlow Condensed, sans-serif"
              >
                DOPPEL
              </text>
              <text
                x={cx}
                y={cy + 14}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ffffff"
                fontSize={safeTarget.length >= 4 ? 38 : 48}
                fontWeight="900"
                fontFamily="Barlow Condensed, sans-serif"
                style={{
                  filter: 'drop-shadow(0 0 14px rgba(0, 217, 255, 0.65))',
                }}
              >
                {safeTarget}
              </text>
            </g>
          </svg>
        </div>

        {/* Rechter Glasflügel: Dynamische Doppelquote + Gold-Fortschrittsbalken */}
        <section className="cb-right-wing" aria-label="Doppelquote">
          <span className="cb-kicker">DOPPELQUOTE</span>
          <div className="cb-divider" />
          <div className="cb-quote-value">{quote.toFixed(1)}%</div>
          {thrown > 0 && (
            <div className="cb-quote-sub">
              {hits} TREFFER / {thrown} DARTS
            </div>
          )}
          <div className="cb-gold-bar">
            <div
              className="cb-gold-bar-fill"
              style={{ width: `${goldBarWidth}%` }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
