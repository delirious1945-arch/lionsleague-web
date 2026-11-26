'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import {
  SCORING_LEITER_LEVELS,
  MAX_VISITS_PER_LEVEL,
} from '@/app/training/scoring-leiter/types';
import './HolographicScoringLeiterCockpit.css';

export interface HolographicScoringLeiterProps {
  boardId: string;
  boardLabel?: string;
  p1Name?: string;
  p2Name?: string;
  activeName: string;
  is1vs1?: boolean;
  activePlayer?: 1 | 2;
  currentLevelIndex: number; // 0..7
  currentNumber: number;     // 41..140
  hitsInLevel: number;       // 0..2
  levelVisits: boolean[];    // bisherige Aufnahmen in dieser Stufe
  currentVisit: number;      // 1..10
  eliminated?: boolean;
  clearedAll?: boolean;
  // 1vs1 Daten pro Spieler
  p1LevelIndex?: number;
  p1HitsInLevel?: number;
  p1LevelVisits?: boolean[];
  p1Eliminated?: boolean;
  p1ClearedAll?: boolean;
  p2LevelIndex?: number;
  p2HitsInLevel?: number;
  p2LevelVisits?: boolean[];
  p2Eliminated?: boolean;
  p2ClearedAll?: boolean;
  currentTime?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

// Exakte perspektivische Positionen der 8 Stufen auf der Clean-Plate (Index 0 = unten 41 ... Index 7 = oben 140)
const RUNG_LAYOUTS = [
  { top: '68.6%', height: '12.4%', width: '29.2%', fontSize: '3.2cqw', activeFontSize: '3.6cqw' }, // Stufe 1 (41)
  { top: '57.8%', height: '9.4%', width: '27.2%', fontSize: '2.35cqw', activeFontSize: '2.9cqw' }, // Stufe 2 (60)
  { top: '48.6%', height: '8.2%', width: '25.2%', fontSize: '2.2cqw', activeFontSize: '2.7cqw' },  // Stufe 3 (65)
  { top: '40.1%', height: '7.5%', width: '23.2%', fontSize: '2.05cqw', activeFontSize: '2.5cqw' }, // Stufe 4 (80)
  { top: '32.5%', height: '6.8%', width: '21.3%', fontSize: '1.9cqw', activeFontSize: '2.3cqw' },  // Stufe 5 (95)
  { top: '25.6%', height: '6.2%', width: '19.4%', fontSize: '1.78cqw', activeFontSize: '2.15cqw' }, // Stufe 6 (100)
  { top: '19.3%', height: '5.6%', width: '17.6%', fontSize: '1.68cqw', activeFontSize: '2.0cqw' },  // Stufe 7 (120)
  { top: '13.5%', height: '5.2%', width: '15.8%', fontSize: '1.58cqw', activeFontSize: '1.88cqw' }, // Stufe 8 (140)
] as const;

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

export default function HolographicScoringLeiterCockpit({
  boardId,
  boardLabel,
  p1Name = 'Spieler 1',
  p2Name = 'Spieler 2',
  activeName,
  is1vs1 = false,
  activePlayer = 1,
  currentLevelIndex,
  hitsInLevel,
  levelVisits,
  eliminated = false,
  clearedAll = false,
  p1LevelIndex,
  p1HitsInLevel,
  p1LevelVisits,
  p1Eliminated = false,
  p1ClearedAll = false,
  p2LevelIndex,
  p2HitsInLevel,
  p2LevelVisits,
  p2Eliminated = false,
  p2ClearedAll = false,
  currentTime,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicScoringLeiterProps) {
  const levelsCount = SCORING_LEITER_LEVELS.length;

  // Spielername immer dynamisch aus dem laufenden Spiel (niemals hardcoded!)
  const cleanName = (activeName || '').trim() || 'Spieler';
  const nameParts = cleanName.split(/\s+/).filter(Boolean);
  const longestPartLen = Math.max(...nameParts.map((p) => p.length), 0);
  const isCompactName = longestPartLen > 12 || nameParts.length > 2;

  const activeLevelIdx = is1vs1
    ? activePlayer === 1
      ? p1LevelIndex ?? currentLevelIndex
      : p2LevelIndex ?? 0
    : currentLevelIndex;

  const safeLevelIdx = Math.max(0, Math.min(activeLevelIdx, levelsCount - 1));

  const activeHits = is1vs1
    ? activePlayer === 1
      ? p1HitsInLevel ?? hitsInLevel
      : p2HitsInLevel ?? 0
    : hitsInLevel;

  const activeVisits = is1vs1
    ? activePlayer === 1
      ? p1LevelVisits ?? levelVisits
      : p2LevelVisits ?? []
    : levelVisits;

  const activeEliminated = is1vs1
    ? activePlayer === 1
      ? p1Eliminated
      : p2Eliminated
    : eliminated;

  const activeClearedAll = is1vs1
    ? activePlayer === 1
      ? p1ClearedAll
      : p2ClearedAll
    : clearedAll;

  const otherName = activePlayer === 1 ? p2Name : p1Name;
  const otherLevelIdx = Math.max(
    0,
    Math.min(
      activePlayer === 1 ? p2LevelIndex ?? 0 : p1LevelIndex ?? 0,
      levelsCount - 1
    )
  );
  const otherEliminated = activePlayer === 1 ? p2Eliminated : p1Eliminated;
  const otherCleared = activePlayer === 1 ? p2ClearedAll : p1ClearedAll;

  const displayVisit = Math.min(activeVisits.length + 1, MAX_VISITS_PER_LEVEL);

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

  return (
    <main className="sl-screen" aria-label="Scoring-Leiter">
      <div className="sl-canvas">
        {/* Textfreie 1:1 Arena-Clean-Plate */}
        <img
          className="sl-stage-img"
          src="/images/scoring-leiter-stage.jpg"
          alt=""
        />

        {/* Obere Header-Kapsel */}
        <header className="sl-header-pill">
          <span>{boardLabel || `BOARD ${boardId}`}</span>
          <i />
          <span>SCORING-LEITER</span>
          <i />
          <span>
            STUFE {safeLevelIdx + 1}/{levelsCount}
          </span>
        </header>

        {/* Oben rechts: Uhrzeit & Vollbild */}
        <div className="sl-top-right">
          {currentTime && <span className="sl-clock">{currentTime}</span>}
          <button
            type="button"
            className="sl-fullscreen-btn"
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

        {/* Linker 3D-Glasflügel: Aktiver Spieler aus dem Spiel */}
        <section className="sl-left-wing" aria-label="Aktiver Spieler">
          <h1
            className={`sl-player-name ${isCompactName ? 'sl-name-compact' : ''}`}
          >
            {nameParts.map((part, idx) => (
              <span key={`${part}-${idx}`}>{part}</span>
            ))}
          </h1>
          <div className="sl-throw-pill">
            {is1vs1 ? `SPIELER ${activePlayer} · AM WURF` : 'AM WURF'}
          </div>
          {is1vs1 && (
            <div className="sl-opponent-pill">
              GEGNER: {otherName} ·{' '}
              {otherCleared
                ? 'FERTIG'
                : otherEliminated
                ? 'K.O.'
                : `STUFE ${SCORING_LEITER_LEVELS[otherLevelIdx]}`}
            </div>
          )}
        </section>

        {/* 8 perspektivische Stufen zwischen den leuchtenden Cyan-Holmen */}
        {SCORING_LEITER_LEVELS.map((stepValue, stepIdx) => {
          const layout = RUNG_LAYOUTS[stepIdx] || RUNG_LAYOUTS[0];
          const isCleared = activeClearedAll || stepIdx < safeLevelIdx;
          const isActive = !activeClearedAll && stepIdx === safeLevelIdx;
          const rungCls = isActive
            ? activeEliminated
              ? 'sl-rung sl-rung-active sl-rung-eliminated'
              : 'sl-rung sl-rung-active'
            : isCleared
            ? 'sl-rung sl-rung-cleared'
            : 'sl-rung';

          return (
            <div
              key={stepValue}
              className={rungCls}
              style={{
                top: layout.top,
                height: layout.height,
                width: layout.width,
              }}
            >
              <span className="sl-rung-left" />
              <div className="sl-rung-center">
                {isActive && (
                  <span className="sl-rung-stage-label">
                    STUFE {stepIdx + 1}
                  </span>
                )}
                <strong
                  className="sl-rung-value"
                  style={{
                    fontSize: isActive ? layout.activeFontSize : layout.fontSize,
                  }}
                >
                  {stepValue}
                </strong>
              </div>
              <span className="sl-rung-right">
                {isActive ? (
                  <span className="sl-target-badge">
                    {activeEliminated ? '✕ K.O.' : '◎ ZIEL'}
                  </span>
                ) : isCleared ? (
                  <span className="sl-cleared-check">✓</span>
                ) : (
                  <Lock />
                )}
              </span>
            </div>
          );
        })}

        {/* Rechter 3D-Glasflügel: Treffer für Aufstieg & 10 vertikale Kapseln */}
        <section className="sl-right-wing" aria-label="Aufstieg und Aufnahmen">
          <div className="sl-hits-big">{activeHits} / 2</div>
          <div className="sl-hits-label">
            {activeClearedAll
              ? 'ALLE STUFEN GESCHAFFT!'
              : activeEliminated
              ? 'AUSGESCHIEDEN'
              : 'TREFFER FÜR AUFSTIEG'}
          </div>
          <div className="sl-divider" />
          <div className="sl-visit-label">
            AUFNAHME {displayVisit} / {MAX_VISITS_PER_LEVEL}
          </div>
          <div className="sl-capsules">
            {Array.from({ length: MAX_VISITS_PER_LEVEL }, (_, i) => {
              const v = activeVisits[i];
              const cls =
                v === true
                  ? 'sl-capsule sl-cap-hit'
                  : v === false
                  ? 'sl-capsule sl-cap-miss'
                  : !activeEliminated &&
                    !activeClearedAll &&
                    i === activeVisits.length
                  ? 'sl-capsule sl-cap-current'
                  : 'sl-capsule';
              return <i className={cls} key={i} />;
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
