'use client';

import React from 'react';
import {
  Darts99LivePlayerStats,
  MAX_POINTS_99,
  TOTAL_DARTS_99,
  TOTAL_ROUNDS_99,
} from '@/app/training/99-darts/types';
import LionsDartboardArenaShell from '@/components/LionsDartboardArenaShell';

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
  stageImageSrc?: string;
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
  stageImageSrc,
}: HolographicDarts99Props) {
  // Spielername immer dynamisch aus dem laufenden Spiel (niemals hardcoded!)
  const cleanName = (activeName || '').trim() || 'Spieler';
  const nameParts = cleanName.split(/\s+/).filter(Boolean);
  const longestPartLen = Math.max(...nameParts.map((p) => p.length), 0);
  const isCompactName = longestPartLen > 12 || nameParts.length > 2;

  const activeStats =
    is1vs1 && activePlayer === 2 && p2Stats ? p2Stats : p1Stats;

  const displayRound = Math.min(
    Math.max(1, activeStats.currentRound || 1),
    TOTAL_ROUNDS_99
  );
  const safeTarget = [20, 19, 18].includes(targetNumber) ? targetNumber : 20;

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

  return (
    <LionsDartboardArenaShell
      ariaLabel="99 Darts Challenge"
      gameTitle="99 DARTS CHALLENGE"
      headerItems={[
        boardLabel || `BOARD ${boardId}`,
        `ZIEL ${safeTarget}`,
        `AUFNAHME ${displayRound}/${TOTAL_ROUNDS_99}`,
      ]}
      currentTime={currentTime}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
      stageImageSrc={stageImageSrc}
      centerLabel="ZIELZAHL"
      centerValue={String(safeTarget)}
      primaryTarget={{ mode: 'wedge', number: safeTarget }}
      leftWingRich
      leftAriaLabel="Aktiver Spieler"
      leftWingContent={
        <>
          <div style={{ width: '100%' }}>
            <span className="lda-kicker">
              {is1vs1 ? `SPIELER ${activePlayer} AM OCHE` : 'SPIELER AM OCHE'}
            </span>
            <div className="lda-divider" style={{ margin: '0.4cqw 0 0.7cqw' }} />
            <h1
              className={`lda-player-name ${isCompactName ? 'lda-name-compact' : ''}`}
              style={{
                marginBottom: '0.75cqw',
                fontSize: isCompactName ? '2.55cqw' : '3.3cqw',
              }}
              title={cleanName}
            >
              {nameParts.map((part, idx) => (
                <span key={`${part}-${idx}`}>{part}</span>
              ))}
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.45cqw' }}>
              <span className="lda-throw-pill lda-throw-pill-sm">AM WURF</span>
              <div className="lda-round-sub">
                AUFNAHME {displayRound} / {TOTAL_ROUNDS_99}
              </div>
            </div>
          </div>

          {is1vs1 && otherStats && (
            <div className="lda-opponent-bar">
              GEGNER: {otherName} · {otherStats.totalPoints} PKT
            </div>
          )}

          <div className="lda-left-kpis">
            <div className="lda-kpi-item">
              <small>TREFFERQUOTE</small>
              <strong>{activeStats.hitQuote.toFixed(1)}%</strong>
            </div>
            <div className="lda-kpi-sep" />
            <div className="lda-kpi-item">
              <small>PKT / DART</small>
              <strong>{activeStats.pointsPerDart.toFixed(2)}</strong>
            </div>
          </div>
        </>
      }
      rightWingRich
      rightAriaLabel="Punktestand und Statistik"
      rightWingContent={
        <>
          <div style={{ width: '100%' }}>
            <span className="lda-kicker">PUNKTESTAND</span>
            <div className="lda-divider" />
            <div className="lda-main-value lda-main-value-sm">
              {activeStats.totalPoints} / {MAX_POINTS_99}
            </div>
            <div className="lda-darts-pill">
              <span>🎯</span>
              <span>
                Darts {activeStats.dartsThrown} / {TOTAL_DARTS_99}
              </span>
            </div>
          </div>

          <div className="lda-stat-list">
            <div className="lda-stat-row">
              <div className="lda-stat-top">
                <span className="lda-stat-label">
                  Triple (T{safeTarget}) · {activeStats.triples}×
                </span>
                <span className="lda-stat-meta">{triplePct}%</span>
              </div>
              <div className="lda-stat-track">
                <div
                  className="lda-stat-fill lda-fill-gold"
                  style={{ width: `${triplePct}%` }}
                />
              </div>
            </div>

            <div className="lda-stat-row">
              <div className="lda-stat-top">
                <span className="lda-stat-label">
                  Double (D{safeTarget}) · {activeStats.doubles}×
                </span>
                <span className="lda-stat-meta">{doublePct}%</span>
              </div>
              <div className="lda-stat-track">
                <div
                  className="lda-stat-fill lda-fill-cyan"
                  style={{ width: `${doublePct}%` }}
                />
              </div>
            </div>

            <div className="lda-stat-row">
              <div className="lda-stat-top">
                <span className="lda-stat-label">
                  Single (S{safeTarget}) · {activeStats.singles}×
                </span>
                <span className="lda-stat-meta">{singlePct}%</span>
              </div>
              <div className="lda-stat-track">
                <div
                  className="lda-stat-fill lda-fill-green"
                  style={{ width: `${singlePct}%` }}
                />
              </div>
            </div>

            <div className="lda-stat-row">
              <div className="lda-stat-top">
                <span className="lda-stat-label">
                  Miss (0 Pkt) · {activeStats.misses}×
                </span>
                <span className="lda-stat-meta">{missPct}%</span>
              </div>
              <div className="lda-stat-track">
                <div
                  className="lda-stat-fill lda-fill-red"
                  style={{ width: `${missPct}%` }}
                />
              </div>
            </div>

            <div className="lda-stat-row">
              <div className="lda-stat-top">
                <span className="lda-stat-label">FORTSCHRITT</span>
                <span className="lda-stat-meta">{progressPct}%</span>
              </div>
              <div className="lda-stat-track">
                <div
                  className="lda-stat-fill lda-fill-cyan"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </>
      }
      bottomPill={
        <>
          <span>S{safeTarget}: 1P</span>
          <i />
          <span>D{safeTarget}: 2P</span>
          <i />
          <span>T{safeTarget}: 3P</span>
          <i />
          <span>{TOTAL_DARTS_99} DARTS</span>
        </>
      }
    />
  );
}
