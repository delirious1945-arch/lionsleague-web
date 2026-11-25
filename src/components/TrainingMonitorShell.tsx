'use client';

import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import './TrainingMonitorCockpit.css';

// Offizielle Dartboard-Reihenfolge im Uhrzeigersinn ab 12 Uhr (0°)
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

  // Erstes Token einer evtl. Checkroute prüfen ("T16 ➔ D8" -> "T16")
  const firstToken = upper.split(/➔|->|\s+/)[0] || upper;
  if (firstToken === 'BULL' || firstToken === 'DBULL' || firstToken === 'SBULL' || firstToken === '25' || firstToken === '50') {
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

function getBoardAngle(num: number | null | undefined): number {
  if (!num) return 0;
  const idx = DARTBOARD_NUMBERS.indexOf(num as (typeof DARTBOARD_NUMBERS)[number]);
  return idx >= 0 ? idx * 18 : 0;
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
  currentTime,
  isFullscreen = false,
  onToggleFullscreen,
}: TrainingMonitorShellProps) {
  const safeNameParts = (playerName || 'Spieler').trim().split(/\s+/).filter(Boolean);
  const beamAngle = getBoardAngle(highlightNumber);
  const isBullTarget = highlightNumber === null;

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

  return (
    <main className="tmc-monitor">
      <div className="tmc-arena" />
      <div className="tmc-spotlight tmc-spotlight-one" />
      <div className="tmc-spotlight tmc-spotlight-two" />

      <span className="tmc-game-name">{gameName}</span>

      <header className="tmc-header">
        <strong>{boardLabel || `BOARD ${boardId}`}</strong>
        <i />
        <span>LIONS WEYHAUSEN</span>
        <i />
        <span>{headerTitle}</span>
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
        {/* Linke Spielerkarte */}
        <section className="tmc-glass-card tmc-player-card">
          {playerTop && <span className="tmc-card-label">{playerTop}</span>}
          <h1>
            {safeNameParts.map((part, idx) => (
              <span key={`${part}-${idx}`}>{part}</span>
            ))}
          </h1>
          {playerDetail && <small className="tmc-player-detail">{playerDetail}</small>}
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
            <i />
            <span>◎ &nbsp; AM WURF</span>
          </div>
          {opponentBanner && <div className="tmc-opponent-pill">{opponentBanner}</div>}
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

        {/* Zentrum: Dartscheibe oder Scoring-Leiter */}
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
                  {isActive && <span>{eliminated ? '✕ K.O.' : '◀ ZIEL'}</span>}
                  {!isActive && isCleared && <span>✓ GESCHAFFT</span>}
                  {!isActive && !isCleared && <span />}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="tmc-board-wrap">
            <div className="tmc-board-orbit" />
            <div className="tmc-dartboard">
              <div className="tmc-board-grid" />
              {DARTBOARD_NUMBERS.map((number, index) => {
                const angle = index * 18;
                const isActive = highlightNumber === number;
                return (
                  <span
                    className={`tmc-board-number ${isActive ? 'tmc-active-number' : ''}`}
                    key={number}
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    <b style={{ transform: `rotate(${-angle}deg)` }}>{number}</b>
                  </span>
                );
              })}
              {highlightNumber !== undefined && highlightNumber !== null && (
                <div
                  className="tmc-beam-rotator"
                  style={{ transform: `rotate(${beamAngle}deg)` }}
                >
                  <div className="tmc-target-beam" />
                </div>
              )}
              <div
                className={`tmc-board-center ${isBullTarget ? 'tmc-bull-active' : ''}`}
              >
                {centerLabel && <small>{centerLabel}</small>}
                <strong>{centerValue || '20'}</strong>
              </div>
            </div>
            {route && <div className="tmc-route">{route}</div>}
            {legend && <div className="tmc-legend">{legend}</div>}
          </div>
        )}

        {/* Rechte Statistik-Karte */}
        <section className="tmc-glass-card tmc-stats-card">
          <span className="tmc-card-label">{statsTitle}</span>
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
          {progressDots && progressDots.length > 0 && (
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
          )}
          {!statRows?.length && !progressDots?.length && (
            <div className="tmc-gold-line" />
          )}
        </section>
      </div>
    </main>
  );
}
