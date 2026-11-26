'use client';

import React from 'react';
import './HolographicFussballCockpit.css';

export interface HolographicFussballProps {
  boardId: string;
  boardLabel?: string;
  p1Name?: string;
  p2Name?: string;
  activeName?: string;
  is1vs1?: boolean;
  activePlayer?: 1 | 2;
  scoreP1: number;
  scoreP2: number;
  targetGoals?: number;
  ballPossession?: 1 | 2 | null;
  fussballStats?: {
    p1Darts?: number;
    p1DoubleHits?: number;
    p1DoubleAttempts?: number;
    p1BullHits?: number;
    p1BullAttempts?: number;
  };
  activeTarget?: string;
  gameMode?: string;
  aiLevel?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const LEAGUE_LABELS: Record<string, string> = {
  kreisliga: 'Kreisliga',
  bezirksliga: 'Bezirksliga',
  landesliga: 'Landesliga',
  bundesliga: 'Bundesliga',
  pdc_pro: 'PDC Pro',
};

function FootballIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="#eafaff" />
      <path
        d="m16 9 4 3-1.5 5h-5L12 12l4-3Zm4 3 4-1m-5.5 6 3.5 4m-8.5-4L10 21m2-9-4-1m2 10 1 3m11-3-1 3"
        stroke="#1685d9"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function ExpandIcon({ isFullscreen }: { isFullscreen?: boolean }) {
  if (isFullscreen) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 9h5V4m11 5h-5V4M4 15h5v5m11-5h-5v5"
          stroke="currentColor"
          strokeWidth="1.8"
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
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlayerName({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    <>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`}>{part}</span>
      ))}
    </>
  );
}

function isLongPlayerName(name: string): boolean {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const longestPart = Math.max(...parts.map((p) => p.length), 0);
  return longestPart > 12 || parts.length > 2;
}

function parseOpponentName(rawName: string, aiLevel?: string) {
  const trimmed = rawName.trim() || 'Gegner';
  const bracketMatch = trimmed.match(/^(.+?)\s*\(([^)]+)\)$/);
  const baseName = bracketMatch ? bracketMatch[1].trim() : trimmed;
  const leagueFromName = bracketMatch ? bracketMatch[2].trim() : null;
  const leagueFromProp = aiLevel
    ? LEAGUE_LABELS[aiLevel.toLowerCase()] || aiLevel
    : null;
  return {
    baseName,
    detail: leagueFromProp || leagueFromName,
  };
}

export default function HolographicFussballCockpit({
  boardId,
  boardLabel,
  p1Name = 'Spieler 1',
  p2Name = 'Gegner',
  activePlayer = 1,
  scoreP1,
  scoreP2,
  targetGoals = 5,
  ballPossession = null,
  fussballStats,
  gameMode,
  aiLevel,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicFussballProps) {
  const cleanP1 = (p1Name || '').trim() || 'Spieler 1';
  const opponent = parseOpponentName(p2Name, aiLevel);

  const isComputerMatch =
    gameMode === '1vsComputer' ||
    gameMode === 'bot' ||
    p2Name.toLowerCase().includes('computer') ||
    p2Name.toLowerCase().includes('bot');

  const modeLabel = isComputerMatch ? '1 VS COMPUTER' : '1 VS 1 DUELL';

  const normalizedPossession: 1 | 2 | null =
    ballPossession === 1 || ballPossession === 2 ? ballPossession : null;
  const normalizedActivePlayer: 1 | 2 = activePlayer === 2 ? 2 : 1;

  const p1HasBall = normalizedPossession === 1;
  const p2HasBall = normalizedPossession === 2;
  const p1Throws = normalizedActivePlayer === 1;
  const p2Throws = normalizedActivePlayer === 2;

  const hasP1Stats = (fussballStats?.p1Darts ?? 0) > 0;
  const bullHits = fussballStats?.p1BullHits ?? 0;
  const bullAttempts = fussballStats?.p1BullAttempts ?? 0;
  const doubleHits = fussballStats?.p1DoubleHits ?? 0;
  const doubleAttempts = fussballStats?.p1DoubleAttempts ?? 0;

  const handleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
      return;
    }
    if (typeof document !== 'undefined') {
      if (!document.fullscreenElement) {
        void document.documentElement.requestFullscreen();
      } else {
        void document.exitFullscreen();
      }
    }
  };

  return (
    <main className="fb-screen" aria-label="Fußball Darts">
      <div className="fb-canvas">
        <img
          className="fb-arena-background"
          src="/images/soccer-darts-arena.png"
          alt=""
        />
        <div className="fb-cinematic-grade" />
        <div className="fb-light-sweep left" />
        <div className="fb-light-sweep right" />

        <header className="fb-match-header" aria-label="Spieldetails">
          <strong>{boardLabel || `BOARD ${boardId}`}</strong>
          <i />
          <span>FUSSBALL DARTS</span>
          <i />
          <strong>{modeLabel}</strong>
        </header>

        <button
          type="button"
          className="fb-fullscreen-button"
          aria-label={isFullscreen ? 'Vollbild schließen' : 'Vollbild öffnen'}
          onClick={handleFullscreen}
        >
          <ExpandIcon isFullscreen={isFullscreen} />
        </button>

        {/* Linker Glasflügel: Spieler 1 (mittig zentriert) */}
        <section className="fb-player-panel fb-player-one" aria-label="Spieler eins">
          <span className="fb-player-kicker">SPIELER 1</span>
          <div className="fb-wing-divider" />
          <h1
            className={`fb-player-name ${isLongPlayerName(cleanP1) ? 'fb-name-compact' : ''}`}
          >
            <PlayerName name={cleanP1} />
          </h1>

          {p1HasBall ? (
            <>
              <div className="fb-possession-badge">
                <FootballIcon />
                <span>BALLBESITZ</span>
              </div>
              <div className="fb-target-hint">ZIEL: DOPPEL FÜR TOR</div>
            </>
          ) : p1Throws ? (
            <>
              <div className="fb-turn-badge">AM WURF</div>
              <div className="fb-target-hint fb-target-hint-neutral">
                {normalizedPossession === null
                  ? 'ZIEL: BULL FÜR BALLBESITZ'
                  : 'ZIEL: BULL FÜR BALLGEWINN'}
              </div>
            </>
          ) : null}

          {hasP1Stats && (
            <div className="fb-wing-stats">
              <div className="fb-wing-stat-item">
                <small>BULL</small>
                <strong>
                  {bullHits}/{bullAttempts}
                </strong>
              </div>
              <div className="fb-wing-stat-sep" />
              <div className="fb-wing-stat-item">
                <small>DOPPEL</small>
                <strong>
                  {doubleHits}/{doubleAttempts}
                </strong>
              </div>
            </div>
          )}
        </section>

        {/* Rechter Glasflügel: Gegner / Computer (mittig zentriert) */}
        <section className="fb-player-panel fb-player-two" aria-label="Spieler zwei">
          <span className="fb-player-kicker">GEGNER</span>
          <div className="fb-wing-divider" />
          <h2
            className={`fb-player-name ${isLongPlayerName(opponent.baseName) ? 'fb-name-compact' : ''}`}
          >
            <PlayerName name={opponent.baseName} />
          </h2>
          {opponent.detail && (
            <div className="fb-opponent-league">{opponent.detail}</div>
          )}

          {p2HasBall ? (
            <>
              <div className="fb-possession-badge">
                <FootballIcon />
                <span>BALLBESITZ</span>
              </div>
              <div className="fb-target-hint">ZIEL: DOPPEL FÜR TOR</div>
            </>
          ) : p2Throws ? (
            <>
              <div className="fb-turn-badge">AM WURF</div>
              <div className="fb-target-hint fb-target-hint-neutral">
                {normalizedPossession === null
                  ? 'ZIEL: BULL FÜR BALLBESITZ'
                  : 'ZIEL: BULL FÜR BALLGEWINN'}
              </div>
            </>
          ) : null}
        </section>

        {/* Zentrales Scoreboard unten mittig */}
        <section
          className="fb-scoreboard"
          aria-label={`Spielstand ${scoreP1} zu ${scoreP2}`}
        >
          <div className="fb-scoreline">
            <strong className="fb-score-home">{scoreP1}</strong>
            <span>:</span>
            <strong>{scoreP2}</strong>
          </div>
          <div className="fb-score-divider" />
          <p>ZIEL: {targetGoals} TORE</p>
          {normalizedPossession === null && (
            <div className="fb-kickoff-hint">ANSTOSS · KEIN BALLBESITZ</div>
          )}
        </section>

        <div className="fb-live-indicator">
          <i /> LIVE
        </div>
      </div>
    </main>
  );
}
