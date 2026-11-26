'use client';

import React, { useId } from 'react';
import './LionsDartboardArenaShell.css';

// Offizielle Turnier-Reihenfolge im Uhrzeigersinn ab 12 Uhr (0°)
export const DARTBOARD_NUMBERS = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
] as const;

export type DartboardHighlightMode =
  | 'double'
  | 'triple'
  | 'single'
  | 'wedge'
  | 'bull'
  | 'none';

export interface DartboardTargetSpec {
  mode: DartboardHighlightMode;
  number?: number | null;
}

export interface LionsDartboardArenaShellProps {
  ariaLabel: string;
  gameTitle: string;
  headerItems: string[];
  currentTime?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  leftWingContent: React.ReactNode;
  leftWingRich?: boolean;
  leftAriaLabel?: string;
  rightWingContent: React.ReactNode;
  rightWingRich?: boolean;
  rightAriaLabel?: string;
  centerLabel: string;
  centerValue: string;
  primaryTarget: DartboardTargetSpec;
  secondaryTarget?: DartboardTargetSpec;
  bottomPill?: React.ReactNode;
  stageImageSrc?: string;
}

/**
 * Parst ein Ziel-Token wie "D20", "T16", "S11", "19", "#5", "BULL" oder "50"
 * in eine einheitliche Board-Highlight-Spezifikation.
 */
export function parseDartToken(token?: string | null): DartboardTargetSpec {
  if (!token) return { mode: 'none', number: null };
  const clean = token.trim().toUpperCase();
  if (!clean) return { mode: 'none', number: null };

  if (
    clean === 'BULL' ||
    clean === 'DBULL' ||
    clean === 'SBULL' ||
    clean === '25' ||
    clean === '50'
  ) {
    return { mode: 'bull', number: null };
  }

  const prefixMatch = clean.match(/^([DTS])(\d{1,2})$/);
  if (prefixMatch) {
    const num = parseInt(prefixMatch[2], 10);
    if (num >= 1 && num <= 20) {
      const prefix = prefixMatch[1];
      if (prefix === 'D') return { mode: 'double', number: num };
      if (prefix === 'T') return { mode: 'triple', number: num };
      return { mode: 'single', number: num };
    }
  }

  const plainMatch = clean.match(/^#?(\d{1,2})$/);
  if (plainMatch) {
    const num = parseInt(plainMatch[1], 10);
    if (num >= 1 && num <= 20) {
      return { mode: 'wedge', number: num };
    }
  }

  const embeddedMatch = clean.match(/(?:^|\s|#)([DTS])?(\d{1,2})(?:\s|$)/);
  if (embeddedMatch) {
    const num = parseInt(embeddedMatch[2], 10);
    if (num >= 1 && num <= 20) {
      if (embeddedMatch[1] === 'D') return { mode: 'double', number: num };
      if (embeddedMatch[1] === 'T') return { mode: 'triple', number: num };
      if (embeddedMatch[1] === 'S') return { mode: 'single', number: num };
      return { mode: 'wedge', number: num };
    }
  }

  return { mode: 'none', number: null };
}

/**
 * Zerlegt eine Checkroute wie "T16 ➔ D8" oder "S19 ➔ T12 ➔ D16"
 * in das primäre erste Wurffeld und ein optionales zweites Finish-Feld (z. B. letztes Doppel/Bull).
 */
export function parseCheckoutRouteTargets(route?: string | null): {
  primary: DartboardTargetSpec;
  secondary?: DartboardTargetSpec;
} {
  if (!route) return { primary: { mode: 'none', number: null } };
  const tokens = route
    .trim()
    .toUpperCase()
    .split(/\s*(?:➔|→|->|\s+)\s*/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return { primary: { mode: 'none', number: null } };
  }

  const primary = parseDartToken(tokens[0]);
  if (tokens.length === 1) {
    return { primary };
  }

  const lastSpec = parseDartToken(tokens[tokens.length - 1]);
  const sameTarget =
    lastSpec.mode === primary.mode && lastSpec.number === primary.number;

  if (lastSpec.mode !== 'none' && !sameTarget) {
    return { primary, secondary: lastSpec };
  }

  return { primary };
}

function getSegmentAngle(num: number | null | undefined): number {
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

function getRingBounds(
  mode: DartboardHighlightMode,
  rHub: number,
  rTripleIn: number,
  rTripleOut: number,
  rDoubleIn: number,
  rDoubleOut: number
): { rIn: number; rOut: number; rCenter: number } {
  if (mode === 'double') {
    return {
      rIn: rDoubleIn,
      rOut: rDoubleOut,
      rCenter: (rDoubleIn + rDoubleOut) / 2,
    };
  }
  if (mode === 'triple') {
    return {
      rIn: rTripleIn,
      rOut: rTripleOut,
      rCenter: (rTripleIn + rTripleOut) / 2,
    };
  }
  if (mode === 'single') {
    return {
      rIn: rTripleOut,
      rOut: rDoubleIn,
      rCenter: (rTripleOut + rDoubleIn) / 2,
    };
  }
  return {
    rIn: rHub,
    rOut: rDoubleOut,
    rCenter: (rTripleOut + rDoubleIn) / 2,
  };
}

export default function LionsDartboardArenaShell({
  ariaLabel,
  gameTitle,
  headerItems,
  currentTime,
  isFullscreen = false,
  onToggleFullscreen,
  leftWingContent,
  leftWingRich = false,
  leftAriaLabel = 'Aktiver Spieler',
  rightWingContent,
  rightWingRich = false,
  rightAriaLabel = 'Spielstand und Statistik',
  centerLabel,
  centerValue,
  primaryTarget,
  secondaryTarget,
  bottomPill,
  stageImageSrc = '/images/arena-stage-emerald-gold.jpg',
}: LionsDartboardArenaShellProps) {
  const uid = useId().replace(/:/g, '');
  const greenGlowId = `lda-green-glow-${uid}`;
  const goldGlowId = `lda-gold-glow-${uid}`;
  const cyanGlowId = `lda-cyan-glow-${uid}`;
  const wedgeGradId = `lda-wedge-grad-${uid}`;

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

  // Geometrie des transparenten SVG-Overlays exakt auf der Master-Clean-Plate-Dartscheibe
  const cx = 300;
  const cy = 300;
  const rHub = 76;
  const rTripleIn = 123;
  const rTripleOut = 140;
  const rDoubleIn = 202;
  const rDoubleOut = 221;
  const rNumberOuter = 272;

  const safeCenterValue = (centerValue || '').trim() || '-';
  const centerFontSize =
    safeCenterValue.length >= 6
      ? 28
      : safeCenterValue.length === 5
      ? 33
      : safeCenterValue.length === 4
      ? 38
      : safeCenterValue.length === 3
      ? 48
      : 58;

  const primaryAngle = getSegmentAngle(primaryTarget.number);
  const primaryBounds = getRingBounds(
    primaryTarget.mode,
    rHub,
    rTripleIn,
    rTripleOut,
    rDoubleIn,
    rDoubleOut
  );

  const secondaryAngle = getSegmentAngle(secondaryTarget?.number);
  const secondaryBounds = secondaryTarget
    ? getRingBounds(
        secondaryTarget.mode,
        rHub,
        rTripleIn,
        rTripleOut,
        rDoubleIn,
        rDoubleOut
      )
    : null;

  const isCompactHeader = headerItems.length >= 4;

  return (
    <main className="lda-screen" aria-label={ariaLabel}>
      <div className="lda-canvas">
        {/* Einheitliche, textfreie Master-Arena-Clean-Plate */}
        <img
          className="lda-stage-img"
          src={stageImageSrc}
          alt=""
        />

        {/* Oben links: Spielname */}
        <div className="lda-brand">
          <span className="lda-brand-text">{gameTitle}</span>
        </div>

        {/* Oben mittig: Dynamische Spiel-Kapsel */}
        <header
          className={`lda-header-pill ${isCompactHeader ? 'lda-header-pill-compact' : ''}`}
        >
          {headerItems.map((item, idx) => (
            <React.Fragment key={`${item}-${idx}`}>
              {idx > 0 && <i />}
              <span>{item}</span>
            </React.Fragment>
          ))}
        </header>

        {/* Oben rechts: Uhrzeit & Vollbild */}
        <div className="lda-top-right">
          {currentTime && <span className="lda-clock">{currentTime}</span>}
          <button
            type="button"
            className="lda-fullscreen-btn"
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

        {/* Linker Glasflügel */}
        <section
          className={`lda-left-wing ${leftWingRich ? 'lda-left-wing-rich' : ''}`}
          aria-label={leftAriaLabel}
        >
          {leftWingContent}
        </section>

        {/* Transparentes SVG-Overlay exakt auf der Master-Dartscheibe */}
        <div className="lda-board-overlay" aria-hidden="true">
          <svg viewBox="0 0 600 600">
            <defs>
              <filter
                id={greenGlowId}
                x="-40%"
                y="-40%"
                width="180%"
                height="180%"
              >
                <feGaussianBlur stdDeviation="5.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

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
                <stop offset="0%" stopColor="#fde047" stopOpacity="0.46" />
                <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.06" />
              </linearGradient>
            </defs>

            {/* Optionales zweites Ziel (z. B. Finish-Doppel bei Checkrouten) in Smaragdgrün */}
            {secondaryTarget && secondaryTarget.mode === 'bull' && (
              <circle
                cx={cx}
                cy={cy}
                r={rHub + 3}
                fill="none"
                stroke="#00ed79"
                strokeWidth="3.5"
                filter={`url(#${greenGlowId})`}
              />
            )}

            {secondaryTarget &&
              secondaryTarget.mode !== 'bull' &&
              secondaryTarget.mode !== 'none' &&
              secondaryTarget.number &&
              secondaryBounds && (
                <g transform={`rotate(${secondaryAngle} ${cx} ${cy})`}>
                  <path
                    d={describeSectorRing(cx, cy, rDoubleOut, rNumberOuter, -9, 9)}
                    fill="rgba(0, 237, 121, 0.16)"
                    stroke="#00ed79"
                    strokeWidth="1.8"
                    filter={`url(#${greenGlowId})`}
                  />
                  <path
                    d={describeSectorRing(
                      cx,
                      cy,
                      secondaryBounds.rIn,
                      secondaryBounds.rOut,
                      -9,
                      9
                    )}
                    fill="rgba(0, 237, 121, 0.34)"
                    stroke="#00ed79"
                    strokeWidth="2.4"
                    filter={`url(#${greenGlowId})`}
                  />
                </g>
              )}

            {/* Primäres Ziel: Bullseye (Gold + Cyan-Akzent) */}
            {primaryTarget.mode === 'bull' && (
              <g>
                <circle
                  cx={cx}
                  cy={cy}
                  r={rHub + 2}
                  fill="none"
                  stroke="#fde047"
                  strokeWidth="4.2"
                  filter={`url(#${goldGlowId})`}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={rHub - 5}
                  fill="none"
                  stroke="#38e8ff"
                  strokeWidth="1.8"
                  opacity="0.9"
                />
              </g>
            )}

            {/* Primäres Ziel: Wedge-Highlight (für 99 Darts & PDC Scoring/Shanghai) */}
            {primaryTarget.mode === 'wedge' && primaryTarget.number && (
              <g transform={`rotate(${primaryAngle} ${cx} ${cy})`}>
                <path
                  d={describeSectorRing(cx, cy, rDoubleOut, rNumberOuter, -9, 9)}
                  fill="rgba(37, 99, 235, 0.24)"
                  stroke="#38e8ff"
                  strokeWidth="2.5"
                  filter={`url(#${cyanGlowId})`}
                />
                <path
                  d={describeSectorRing(cx, cy, rHub, rDoubleOut, -9, 9)}
                  fill={`url(#${wedgeGradId})`}
                  stroke="#fbbf24"
                  strokeWidth="2.6"
                  filter={`url(#${goldGlowId})`}
                />
              </g>
            )}

            {/* Primäres Ziel: Gelb/Goldenes Trefferfeld + leuchtend blauer Zahlenrahmen (Double, Triple, Single) */}
            {(primaryTarget.mode === 'double' ||
              primaryTarget.mode === 'triple' ||
              primaryTarget.mode === 'single') &&
              primaryTarget.number && (
                <g transform={`rotate(${primaryAngle} ${cx} ${cy})`}>
                  {/* Blauer/Cyan-Rahmen um die aktive Zielzahl im Zahlenring */}
                  <path
                    d={describeSectorRing(cx, cy, rDoubleOut, rNumberOuter, -9, 9)}
                    fill="rgba(37, 99, 235, 0.24)"
                    stroke="#38e8ff"
                    strokeWidth="2.5"
                    filter={`url(#${cyanGlowId})`}
                  />

                  {/* Gelbes Trefferbereich-Highlight exakt auf dem Zielring */}
                  <path
                    d={describeSectorRing(
                      cx,
                      cy,
                      primaryBounds.rIn,
                      primaryBounds.rOut,
                      -9,
                      9
                    )}
                    fill="rgba(250, 204, 21, 0.42)"
                    stroke="#fde047"
                    strokeWidth="2.8"
                    filter={`url(#${goldGlowId})`}
                  />

                  {/* Fadenkreuz auf dem exakten Zielring */}
                  <g
                    transform={`translate(${cx}, ${cy - primaryBounds.rCenter})`}
                    stroke="#ffffff"
                    opacity="0.96"
                  >
                    <circle
                      r="8.5"
                      fill="rgba(250, 204, 21, 0.35)"
                      strokeWidth="1.5"
                    />
                    <line x1="-12" y1="0" x2="12" y2="0" strokeWidth="1.1" />
                    <line x1="0" y1="-12" x2="0" y2="12" strokeWidth="1.1" />
                  </g>
                </g>
              )}

            {/* Zentraler Ziel-Hub exakt im leeren Glas-Kreis */}
            <g>
              <text
                x={cx}
                y={cy - 24}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#b8ecff"
                fontSize="16"
                fontWeight="800"
                letterSpacing="2.4"
                fontFamily="Barlow Condensed, sans-serif"
              >
                {centerLabel}
              </text>
              <text
                x={cx}
                y={cy + 14}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ffffff"
                fontSize={centerFontSize}
                fontWeight="900"
                fontFamily="Barlow Condensed, sans-serif"
                style={{
                  filter: 'drop-shadow(0 0 14px rgba(0, 217, 255, 0.65))',
                }}
              >
                {safeCenterValue}
              </text>
            </g>
          </svg>
        </div>

        {/* Rechter Glasflügel */}
        <section
          className={`lda-right-wing ${rightWingRich ? 'lda-right-wing-rich' : ''}`}
          aria-label={rightAriaLabel}
        >
          {rightWingContent}
        </section>

        {/* Optionale untere Info-Kapsel */}
        {bottomPill && <footer className="lda-bottom-pill">{bottomPill}</footer>}
      </div>
    </main>
  );
}
