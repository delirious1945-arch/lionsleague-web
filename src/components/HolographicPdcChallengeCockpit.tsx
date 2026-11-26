'use client';

import React from 'react';
import LionsDartboardArenaShell, {
  parseDartToken,
} from '@/components/LionsDartboardArenaShell';

export interface HolographicPdcChallengeProps {
  boardId: string;
  boardLabel?: string;
  activeName: string;
  is1vs1?: boolean;
  activePlayer?: 1 | 2;
  currentPart?: 1 | 2 | 3;
  currentTarget: string;
  currentScore: number;
  currentVisit: number;
  totalVisits?: number;
  currentTime?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  stageImageSrc?: string;
}

export default function HolographicPdcChallengeCockpit({
  boardId,
  boardLabel,
  activeName,
  is1vs1 = false,
  activePlayer = 1,
  currentPart,
  currentTarget,
  currentScore,
  currentVisit,
  totalVisits = 26,
  currentTime,
  isFullscreen = false,
  onToggleFullscreen,
  stageImageSrc,
}: HolographicPdcChallengeProps) {
  // Spielername immer dynamisch aus dem laufenden Spiel (niemals hardcoded!)
  const cleanName = (activeName || '').trim() || 'Spieler';
  const nameParts = cleanName.split(/\s+/).filter(Boolean);
  const longestPartLen = Math.max(...nameParts.map((p) => p.length), 0);
  const isCompactName = longestPartLen > 12 || nameParts.length > 2;

  const safeTotal = Math.max(1, totalVisits);
  const safeVisit = Math.max(1, Math.min(currentVisit, safeTotal));
  const visitProgressPct = Math.round((safeVisit / safeTotal) * 100);
  const goldBarWidth = Math.max(14, Math.min(100, visitProgressPct));

  const centerLabel =
    currentPart === 2 ? 'DOPPEL' : currentPart === 3 ? 'SHANGHAI' : 'ZIEL';
  const safeTarget = (currentTarget || '-').trim().toUpperCase();
  const parsed = parseDartToken(safeTarget);

  const primaryTarget =
    currentPart === 2 && parsed.mode === 'wedge' && parsed.number
      ? { mode: 'double' as const, number: parsed.number }
      : (currentPart === 1 || currentPart === 3) &&
        parsed.mode !== 'bull' &&
        parsed.number
      ? { mode: 'wedge' as const, number: parsed.number }
      : parsed;

  const partLabel =
    currentPart === 1
      ? 'TEIL 1 · SCORING'
      : currentPart === 2
      ? 'TEIL 2 · DOPPEL'
      : currentPart === 3
      ? 'TEIL 3 · SHANGHAI'
      : undefined;

  return (
    <LionsDartboardArenaShell
      ariaLabel="PDC Challenge"
      gameTitle={`PDC CHALLENGE${currentPart ? ` · TEIL ${currentPart}` : ''}`}
      headerItems={[
        boardLabel || `BOARD ${boardId}`,
        'LIONS WEYHAUSEN',
        `AUFNAHME ${safeVisit}/${safeTotal}`,
      ]}
      currentTime={currentTime}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
      stageImageSrc={stageImageSrc}
      centerLabel={centerLabel}
      centerValue={safeTarget}
      primaryTarget={primaryTarget}
      leftAriaLabel="Aktiver Spieler"
      leftWingContent={
        <>
          <span className="lda-kicker">
            {is1vs1 ? `SPIELER ${activePlayer} AM OCHE` : 'SPIELER AM OCHE'}
          </span>
          <div className="lda-divider" />
          <h1
            className={`lda-player-name ${isCompactName ? 'lda-name-compact' : ''}`}
          >
            {nameParts.map((part, idx) => (
              <span key={`${part}-${idx}`}>{part}</span>
            ))}
          </h1>
          <div className="lda-throw-pill">AM WURF</div>
          {partLabel && <div className="lda-sub-pill">{partLabel}</div>}
        </>
      }
      rightAriaLabel="Punktestand"
      rightWingContent={
        <>
          <span className="lda-kicker">PUNKTESTAND</span>
          <div className="lda-divider" />
          <div className="lda-main-row">
            <div className="lda-main-value">{currentScore}</div>
            <span className="lda-main-suffix">/ 100</span>
          </div>
          <div className="lda-sub-meta">
            AUFNAHME {safeVisit} VON {safeTotal}
          </div>
          <div className="lda-gold-bar">
            <div
              className="lda-gold-bar-fill"
              style={{ width: `${goldBarWidth}%` }}
            />
          </div>
        </>
      }
    />
  );
}
