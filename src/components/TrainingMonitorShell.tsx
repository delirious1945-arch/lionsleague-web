'use client';

import React, { useId } from 'react';
import { Lock, Maximize2, Minimize2 } from 'lucide-react';
import './TrainingMonitorCockpit.css';

// Offizielle Turnier-Reihenfolge im Uhrzeigersinn ab 12 Uhr (0°)
const DARTBOARD_NUMBERS = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
] as const;

export interface TrainingMonitorDartSlot {
  label: string;
  value: string;
  tone?: 'hit' | 'miss' | 'pending';
}

export interface TrainingMonitorPlayerStat {
  label: string;
  value: string;
}

export interface TrainingMonitorStatRow {
  label: string;
  value: string;
  pct?: number;
  tone?: 'gold' | 'cyan' | 'green' | 'red';
}

export type TrainingMonitorDotState = 'hit' | 'miss' | 'current' | 'pending';
export type TrainingMonitorTargetRing = 'double' | 'triple' | 'single' | 'bull';
export type TrainingMonitorProgressStyle = 'dots' | 'circles' | 'capsules';

export interface TrainingMonitorShellProps {
  boardId: string;
  boardLabel?: string;
  gameName: string;
  headerTitle: string;
  counter: string;
  kind: 'board' | 'ladder';
  playerName: string;
  playerTop?: string;
  playerDetail?: string;
  dartSlots?: TrainingMonitorDartSlot[];
  playerStats?: TrainingMonitorPlayerStat[];
  opponentBanner?: string;
  centerLabel?: string;
  centerValue?: string;
  highlightNumber?: number | null;
  targetRing?: TrainingMonitorTargetRing;
  route?: string;
  legend?: string;
  ladderSteps?: number[];
  activeLadderIndex?: number;
  clearedAll?: boolean;
  eliminated?: boolean;
  statsTitle: string;
  statsValue: string;
  statsSuffix?: string;
  statsDetail?: string;
  secondary?: string;
  statRows?: TrainingMonitorStatRow[];
  progressDots?: TrainingMonitorDotState[];
  progressStyle?: TrainingMonitorProgressStyle;
  goldProgressPct?: number;
  currentTime?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

/**
 * Extrahiert die erste gültige Segmentzahl (1–20) aus einem Ziel- oder Routenstring (z. B. "D20", "T16 ➔ D8", "19").
 * Liefert null für Bullseye / 25 / 50 oder unbekannte Werte.
 */
export function extractTargetNumber(targetStr?: string | null): number | null {
  if (!targetStr) return null;
  const upper = targetStr.trim().toUpperCase();
  if (!upper) return null;

  const firstToken = upper.split(/➔|→|->|\s+/)[0] || upper;
  if (
    firstToken === 'BULL' ||
    firstToken === 'DBULL' ||
    firstToken === 'SBULL' ||
    firstToken === '25' ||
    firstToken === '50'
  ) {
    return null;
  }

  const tokenMatch = firstToken.match(/^([DTS])?(\d{1,2})$/);
  if (tokenMatch) {
    const num = parseInt(tokenMatch[2], 10);
    if (num >= 1 && num <= 20) return num;
  }

  const hashMatch = upper.match(/#(\d{1,2})/);
  if (hashMatch) {
    const num = parseInt(hashMatch[1], 10);
    if (num >= 1 && num <= 20) return num;
  }

  return null;
}

function detectTargetRing(
  centerValue?: string,
  route?: string
): TrainingMonitorTargetRing {
  const source = (route || centerValue || '').trim().toUpperCase();
  const firstToken = source.split(/➔|→|->|\s+/)[0] || source;
  if (
    firstToken === 'BULL' ||
    firstToken === 'DBULL' ||
    firstToken === 'SBULL' ||
    firstToken === '25' ||
    firstToken === '50'
  ) {
    return 'bull';
  }
  if (/^D\d{1,2}$/.test(firstToken)) return 'double';
  if (/^T\d{1,2}$/.test(firstToken)) return 'triple';
  return 'single';
}

function getBoardAngle(num: number | null | undefined): number {
  if (!num) return 0;
  const idx = DARTBOARD_NUMBERS.indexOf(
    num as (typeof DARTBOARD_NUMBERS)[number]
  );
  return idx >= 0 ? idx * 18 : 0;
}

/**
 * Erzeugt einen präzisen SVG-Ringsektor-Pfad (0° = 12 Uhr, im Uhrzeigersinn).
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

function BrandCrestIcon() {
  return (
    <svg className="tmc-brand-crest" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 17h16l1.5-8.5-4.8 3.2L12 4.5 7.3 11.7 2.5 8.5 4 17Zm0 2.5h16v2H4v-2Z" />
    </svg>
  );
}

interface RealisticArenaDartboardProps {
  centerLabel?: string;
  centerValue?: string;
  highlightNumber?: number | null;
  targetRing: TrainingMonitorTargetRing;
}

function RealisticArenaDartboard({
  centerLabel,
  centerValue,
  highlightNumber,
  targetRing,
}: RealisticArenaDartboardProps) {
  const uid = useId().replace(/:/g, '');
  const cyanGlowId = `tmc-cyan-glow-${uid}`;
  const redGlowId = `tmc-red-glow-${uid}`;
  const sisalId = `tmc-sisal-${uid}`;
  const boardShadeId = `tmc-shade-${uid}`;
  const hubBgId = `tmc-hub-bg-${uid}`;
  const laserGradId = `tmc-laser-grad-${uid}`;
  const activeSectorGradId = `tmc-active-sec-${uid}`;

  const cx = 300;
  const cy = 300;
  const rOuterRim = 282;
  const rNumberOuter = 276;
  const rDoubleOut = 222;
  const rDoubleIn = 204;
  const rTripleOut = 138;
  const rTripleIn = 122;
  const rHub = 76;
  const rNumberText = 249;

  const hasSegmentTarget =
    highlightNumber !== undefined && highlightNumber !== null;
  const beamAngle = getBoardAngle(highlightNumber);
  const isBullTarget = highlightNumber === null;

  const targetCenterRadius =
    targetRing === 'double'
      ? (rDoubleIn + rDoubleOut) / 2
      : targetRing === 'triple'
      ? (rTripleIn + rTripleOut) / 2
      : (rTripleOut + rDoubleIn) / 2;

  const targetHighlightPath =
    targetRing === 'double'
      ? describeSectorRing(cx, cy, rDoubleIn, rDoubleOut, -9, 9)
      : targetRing === 'triple'
      ? describeSectorRing(cx, cy, rTripleIn, rTripleOut, -9, 9)
      : describeSectorRing(cx, cy, rTripleOut, rDoubleIn, -9, 9);

  const safeCenterVal = centerValue || '20';
  const centerFontSize = safeCenterVal.length >= 3 ? 42 : 52;

  return (
    <svg
      className="tmc-dartboard-svg"
      viewBox="0 0 600 600"
      aria-label={`Dartboard Ziel ${safeCenterVal}`}
    >
      <defs>
        <filter id={cyanGlowId} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={redGlowId} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={sisalId} x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="3"
            seed="11"
            result="noise"
          />
          <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
          <feComponentTransfer in="gray" result="soft">
            <feFuncA type="linear" slope="0.22" />
          </feComponentTransfer>
        </filter>

        <radialGradient id={boardShadeId} cx="50%" cy="46%" r="54%">
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="88%" stopColor="#000000" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
        </radialGradient>

        <radialGradient id={hubBgId} cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="#0c344f" stopOpacity="0.96" />
          <stop offset="68%" stopColor="#051728" stopOpacity="0.98" />
          <stop offset="100%" stopColor="#020914" stopOpacity="0.99" />
        </radialGradient>

        <linearGradient id={laserGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff3b72" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#ff225c" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ff225c" stopOpacity="0.06" />
        </linearGradient>

        <radialGradient id={activeSectorGradId} cx="50%" cy="15%" r="85%">
          <stop offset="0%" stopColor="#ff4a7d" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#b9123a" stopOpacity="0.22" />
        </radialGradient>
      </defs>

      {/* Äußere Flügel-Halterungen links & rechts (docken optisch an die 3D-Glasflügel an) */}
      <g opacity="0.88">
        <rect x="6" y="232" width="22" height="14" rx="4" fill="#3a6d8c" stroke="#9be7ff" strokeWidth="1.2" />
        <rect x="6" y="354" width="22" height="14" rx="4" fill="#3a6d8c" stroke="#9be7ff" strokeWidth="1.2" />
        <rect x="572" y="232" width="22" height="14" rx="4" fill="#3a6d8c" stroke="#9be7ff" strokeWidth="1.2" />
        <rect x="572" y="354" width="22" height="14" rx="4" fill="#3a6d8c" stroke="#9be7ff" strokeWidth="1.2" />
      </g>

      {/* Dunkler Außenrahmen & doppelter Cyan-Neon-Ring */}
      <circle cx={cx} cy={cy} r="290" fill="#030914" />
      <circle
        cx={cx}
        cy={cy}
        r={rOuterRim + 4}
        fill="none"
        stroke="#09ddfa"
        strokeWidth="4.5"
        opacity="0.78"
        filter={`url(#${cyanGlowId})`}
      />
      <circle
        cx={cx}
        cy={cy}
        r={rOuterRim - 2}
        fill="none"
        stroke="#a3f2ff"
        strokeWidth="2"
        opacity="0.9"
      />

      {/* Schwarzer Zahlenring */}
      <circle
        cx={cx}
        cy={cy}
        r={rNumberOuter}
        fill="#080d16"
        stroke="#224e6b"
        strokeWidth="1.2"
      />

      {/* Aktives Zahlenring-Highlight hinter der Zielzahl */}
      {hasSegmentTarget && (
        <g transform={`rotate(${beamAngle} ${cx} ${cy})`}>
          <path
            d={describeSectorRing(cx, cy, rDoubleOut, rNumberOuter, -9, 9)}
            fill={`url(#${activeSectorGradId})`}
            stroke="#ff5c8a"
            strokeWidth="1.5"
            filter={`url(#${redGlowId})`}
          />
        </g>
      )}

      {/* 20 Sisal-Segmente (Einzelfelder, Triple- & Double-Ring) */}
      {DARTBOARD_NUMBERS.map((num, idx) => {
        const startDeg = idx * 18 - 9;
        const endDeg = idx * 18 + 9;
        const isEven = idx % 2 === 0;

        const singleColor = isEven ? '#14181e' : '#dfd3bc';
        const ringColor = isEven ? '#c41d2b' : '#138648';

        return (
          <g key={num}>
            <path
              d={describeSectorRing(cx, cy, rHub, rTripleIn, startDeg, endDeg)}
              fill={singleColor}
            />
            <path
              d={describeSectorRing(cx, cy, rTripleIn, rTripleOut, startDeg, endDeg)}
              fill={ringColor}
            />
            <path
              d={describeSectorRing(cx, cy, rTripleOut, rDoubleIn, startDeg, endDeg)}
              fill={singleColor}
            />
            <path
              d={describeSectorRing(cx, cy, rDoubleIn, rDoubleOut, startDeg, endDeg)}
              fill={ringColor}
            />
          </g>
        );
      })}

      {/* Subtile Sisal-Textur & Licht-Vignette über der Spielfläche */}
      <circle
        cx={cx}
        cy={cy}
        r={rDoubleOut}
        fill="#ffffff"
        filter={`url(#${sisalId})`}
        opacity="0.7"
        style={{ mixBlendMode: 'soft-light' }}
      />
      <circle cx={cx} cy={cy} r={rDoubleOut} fill={`url(#${boardShadeId})`} />

      {/* Metallische Draht-Spinne (Spider) */}
      <g stroke="#c4d1de" strokeWidth="1.55" opacity="0.88" fill="none">
        {DARTBOARD_NUMBERS.map((num, idx) => {
          const deg = idx * 18 - 9;
          const rad = ((deg - 90) * Math.PI) / 180;
          const x1 = cx + rHub * Math.cos(rad);
          const y1 = cy + rHub * Math.sin(rad);
          const x2 = cx + rDoubleOut * Math.cos(rad);
          const y2 = cy + rDoubleOut * Math.sin(rad);
          return <line key={`w-${num}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
        <circle cx={cx} cy={cy} r={rTripleIn} />
        <circle cx={cx} cy={cy} r={rTripleOut} />
        <circle cx={cx} cy={cy} r={rDoubleIn} />
        <circle cx={cx} cy={cy} r={rDoubleOut} stroke="#5be6ff" strokeWidth="2" opacity="0.82" />
      </g>

      {/* Roter Laser-Zielstrahl & Fadenkreuz exakt auf dem aktiven Segment */}
      {hasSegmentTarget && (
        <g transform={`rotate(${beamAngle} ${cx} ${cy})`}>
          {/* Laserlichtkegel vom oberen Rand auf das Zielfeld */}
          <polygon
            points={`${cx - 18},0 ${cx + 18},0 ${cx + 28},${cy - targetCenterRadius + 10} ${cx - 28},${cy - targetCenterRadius + 10}`}
            fill={`url(#${laserGradId})`}
            filter={`url(#${redGlowId})`}
          />
          <line
            x1={cx}
            y1="0"
            x2={cx}
            y2={cy - targetCenterRadius}
            stroke="#ff96b3"
            strokeWidth="2.5"
            opacity="0.92"
          />

          {/* Aktives Ziel-Segment Highlight */}
          <path
            d={targetHighlightPath}
            fill="rgba(255, 45, 95, 0.34)"
            stroke="#ff618b"
            strokeWidth="2.5"
            filter={`url(#${redGlowId})`}
          />

          {/* Fadenkreuz im Zentrum des Zielrings */}
          <g transform={`translate(${cx}, ${cy - targetCenterRadius})`} stroke="#ffffff" opacity="0.95">
            <circle r="7.5" fill="rgba(255,45,95,0.45)" strokeWidth="1.4" />
            <line x1="-11" y1="0" x2="11" y2="0" strokeWidth="1" />
            <line x1="0" y1="-11" x2="0" y2="11" strokeWidth="1" />
          </g>
        </g>
      )}

      {/* Alle 20 Zahlen rund um den Zahlenring */}
      {DARTBOARD_NUMBERS.map((num, idx) => {
        const deg = idx * 18;
        const rad = ((deg - 90) * Math.PI) / 180;
        const x = cx + rNumberText * Math.cos(rad);
        const y = cy + rNumberText * Math.sin(rad);
        const isActive = highlightNumber === num;

        return (
          <text
            key={`num-${num}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={isActive ? '#ffffff' : '#dceaf5'}
            fontSize={isActive ? 32 : 28}
            fontWeight="800"
            fontFamily="Barlow Condensed, sans-serif"
            style={
              isActive
                ? { filter: 'drop-shadow(0 0 8px #ffffff) drop-shadow(0 0 12px #ff3b72)' }
                : undefined
            }
          >
            {num}
          </text>
        );
      })}

      {/* Zentrale schwebende Ziel-Kapsel */}
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={rHub}
          fill={`url(#${hubBgId})`}
          stroke={isBullTarget ? '#ff4d79' : '#3ee6ff'}
          strokeWidth="3.5"
          filter={`url(#${isBullTarget ? redGlowId : cyanGlowId})`}
        />
        <circle
          cx={cx}
          cy={cy}
          r={rHub - 6}
          fill="none"
          stroke={isBullTarget ? 'rgba(255,150,180,0.55)' : 'rgba(180,242,255,0.55)'}
          strokeWidth="1.4"
        />
        {centerLabel && (
          <text
            x={cx}
            y={cy - 24}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#8deaff"
            fontSize="12"
            fontWeight="800"
            letterSpacing="2.2"
            fontFamily="Barlow Condensed, sans-serif"
          >
            {centerLabel}
          </text>
        )}
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          fontSize={centerFontSize}
          fontWeight="900"
          fontFamily="Barlow Condensed, sans-serif"
          style={{ filter: 'drop-shadow(0 0 14px rgba(9, 221, 250, 0.55))' }}
        >
          {safeCenterVal}
        </text>
      </g>
    </svg>
  );
}

export default function TrainingMonitorShell({
  boardId,
  boardLabel,
  gameName,
  headerTitle,
  counter,
  kind,
  playerName,
  playerTop,
  playerDetail,
  dartSlots,
  playerStats,
  opponentBanner,
  centerLabel,
  centerValue,
  highlightNumber,
  targetRing,
  route,
  legend,
  ladderSteps = [],
  activeLadderIndex = 0,
  clearedAll = false,
  eliminated = false,
  statsTitle,
  statsValue,
  statsSuffix,
  statsDetail,
  secondary,
  statRows,
  progressDots,
  progressStyle = 'dots',
  goldProgressPct,
  currentTime,
  isFullscreen = false,
  onToggleFullscreen,
}: TrainingMonitorShellProps) {
  const safeNameParts = (playerName || 'Spieler')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const resolvedTargetRing =
    targetRing ?? detectTargetRing(centerValue, route);

  const handleFullscreenClick = () => {
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

  const renderProgressSection = () => {
    if (!progressDots?.length) return null;

    if (progressStyle === 'circles') {
      return (
        <div className="tmc-progress-circles">
          {progressDots.map((dot, idx) => {
            const dotCls =
              dot === 'hit'
                ? 'tmc-dot-hit'
                : dot === 'miss'
                ? 'tmc-dot-miss'
                : dot === 'current'
                ? 'tmc-dot-current'
                : '';
            return (
              <div className={`tmc-circle-item ${dotCls}`} key={idx}>
                <span className="tmc-circle-ring" />
                <small>{idx + 1}</small>
              </div>
            );
          })}
        </div>
      );
    }

    if (progressStyle === 'capsules') {
      return (
        <div className="tmc-progress-capsules">
          {progressDots.map((dot, idx) => {
            const dotCls =
              dot === 'hit'
                ? 'tmc-dot-hit'
                : dot === 'miss'
                ? 'tmc-dot-miss'
                : dot === 'current'
                ? 'tmc-dot-current'
                : '';
            return <i className={`tmc-capsule ${dotCls}`} key={idx} />;
          })}
        </div>
      );
    }

    return (
      <div className="tmc-progress-dots">
        {progressDots.map((dot, idx) => {
          const dotCls =
            dot === 'hit'
              ? 'tmc-dot-hit'
              : dot === 'miss'
              ? 'tmc-dot-miss'
              : dot === 'current'
              ? 'tmc-dot-current'
              : '';
          return <i className={dotCls} key={idx} />;
        })}
      </div>
    );
  };

  const showGoldBar = !statRows?.length && !progressDots?.length;
  const goldBarWidth = Math.max(42, Math.min(100, goldProgressPct ?? 45));

  return (
    <main className="tmc-monitor">
      <img
        className="tmc-arena-img"
        src="/images/training-arena-stage.png"
        alt=""
      />
      <div className="tmc-arena-vignette" />

      <div className="tmc-game-brand">
        <BrandCrestIcon />
        <span className="tmc-game-name">{gameName}</span>
      </div>

      <header className="tmc-header">
        <strong>{boardLabel || `BOARD ${boardId}`}</strong>
        <i />
        <span>LIONS WEYHAUSEN</span>
        {headerTitle && (
          <>
            <i />
            <span>{headerTitle}</span>
          </>
        )}
        <i />
        <em>{counter}</em>
      </header>

      <div className="tmc-top-right">
        {currentTime && <span className="tmc-clock">{currentTime}</span>}
        <button
          type="button"
          className="tmc-fullscreen-btn"
          onClick={handleFullscreenClick}
          aria-label={isFullscreen ? 'Vollbild verlassen' : 'Vollbild'}
          title={isFullscreen ? 'Vollbild verlassen' : 'Vollbild'}
        >
          {isFullscreen ? <Minimize2 /> : <Maximize2 />}
        </button>
      </div>

      <div className="tmc-layout">
        {/* Linker 3D-Glasflügel */}
        <section className="tmc-glass-card tmc-player-card">
          {playerTop && (
            <>
              <span className="tmc-card-label">{playerTop}</span>
              <div className="tmc-card-divider" />
            </>
          )}
          <h1>
            {safeNameParts.map((part, idx) => (
              <span key={`${part}-${idx}`}>{part}</span>
            ))}
          </h1>
          {playerDetail && (
            <small className="tmc-player-detail">{playerDetail}</small>
          )}
          {dartSlots && dartSlots.length > 0 && (
            <div className="tmc-dart-slots">
              {dartSlots.map((slot) => {
                const toneCls =
                  slot.tone === 'hit'
                    ? 'tmc-dart-slot-hit'
                    : slot.tone === 'miss'
                    ? 'tmc-dart-slot-miss'
                    : '';
                return (
                  <span key={slot.label} className={toneCls}>
                    {slot.label}
                    <b>{slot.value}</b>
                  </span>
                );
              })}
            </div>
          )}
          <div className="tmc-throw-pill">
            <span>AM WURF</span>
          </div>
          {opponentBanner && (
            <div className="tmc-opponent-pill">{opponentBanner}</div>
          )}
          {playerStats && playerStats.length > 0 && (
            <div className="tmc-player-stats">
              {playerStats.map((stat) => (
                <div key={stat.label}>
                  <small>{stat.label}</small>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Zentrum: Fotorealistische SVG-Dartscheibe oder Neon-Scoring-Leiter */}
        {kind === 'ladder' ? (
          <div className="tmc-ladder">
            <div className="tmc-rail tmc-left-rail" />
            <div className="tmc-rail tmc-right-rail" />
            {[...ladderSteps].reverse().map((step, reverseIdx) => {
              const stepIdx = ladderSteps.length - 1 - reverseIdx;
              const isCleared = clearedAll || stepIdx < activeLadderIndex;
              const isActive = !clearedAll && stepIdx === activeLadderIndex;
              const rungCls = isActive
                ? eliminated
                  ? 'tmc-rung tmc-active-rung tmc-eliminated-rung'
                  : 'tmc-rung tmc-active-rung'
                : isCleared
                ? 'tmc-rung tmc-cleared-rung'
                : 'tmc-rung';

              return (
                <div className={rungCls} key={step}>
                  <small>STUFE {stepIdx + 1}</small>
                  <strong>{step}</strong>
                  {isActive && (
                    <span className="tmc-rung-badge">
                      {eliminated ? '✕ K.O.' : '◎ ZIEL'}
                    </span>
                  )}
                  {!isActive && isCleared && (
                    <span className="tmc-rung-badge">✓ GESCHAFFT</span>
                  )}
                  {!isActive && !isCleared && (
                    <span className="tmc-rung-badge">
                      <Lock size={13} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="tmc-board-wrap">
            <div className="tmc-board-floor-glow" />
            <RealisticArenaDartboard
              centerLabel={centerLabel}
              centerValue={centerValue}
              highlightNumber={highlightNumber}
              targetRing={resolvedTargetRing}
            />
            {route && <div className="tmc-route">{route}</div>}
            {legend && <div className="tmc-legend">{legend}</div>}
          </div>
        )}

        {/* Rechter 3D-Glasflügel */}
        <section className="tmc-glass-card tmc-stats-card">
          <span className="tmc-card-label">{statsTitle}</span>
          <div className="tmc-card-divider" />
          <div className="tmc-main-stat">
            <strong>{statsValue}</strong>
            {statsSuffix && <span>{statsSuffix}</span>}
          </div>
          {statsDetail && <p>{statsDetail}</p>}
          {secondary && <b className="tmc-secondary">{secondary}</b>}
          {statRows && statRows.length > 0 && (
            <div className="tmc-stat-rows">
              {statRows.map((row) => {
                const fillTone =
                  row.tone === 'gold'
                    ? 'tmc-tone-gold'
                    : row.tone === 'green'
                    ? 'tmc-tone-green'
                    : row.tone === 'red'
                    ? 'tmc-tone-red'
                    : '';
                const pct = Math.max(0, Math.min(100, row.pct ?? 0));
                return (
                  <div className="tmc-stat-row" key={row.label}>
                    <div className="tmc-stat-row-head">
                      <span>{row.label}</span>
                      <b>{row.value}</b>
                    </div>
                    <div className="tmc-stat-track">
                      <span
                        className={`tmc-stat-fill ${fillTone}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {renderProgressSection()}
          {showGoldBar && (
            <div className="tmc-gold-bar">
              <div
                className="tmc-gold-bar-fill"
                style={{ width: `${goldBarWidth}%` }}
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
