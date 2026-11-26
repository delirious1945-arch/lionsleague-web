'use client';

import React from 'react';
import LionsDartboardArenaShell, {
  parseDartToken,
} from '@/components/LionsDartboardArenaShell';

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
  stageImageSrc?: string;
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
  stageImageSrc,
}: HolographicCheckoutBattleProps) {
  // Spielername immer dynamisch aus dem laufenden Spiel (niemals hardcoded!)
  const cleanName = (activeName || '').trim() || 'Spieler';
  const nameParts = cleanName.split(/\s+/).filter(Boolean);
  const longestPartLen = Math.max(...nameParts.map((p) => p.length), 0);
  const isCompactName = longestPartLen > 12 || nameParts.length > 2;

  const safeTotal = Math.max(1, totalRounds);
  const safeRound = Math.max(1, Math.min(currentRound, safeTotal));
  const safeTarget = (currentTarget || 'D20').trim().toUpperCase();

  const parsedTarget = parseDartToken(safeTarget);
  const primaryTarget =
    parsedTarget.mode === 'wedge' && parsedTarget.number
      ? { mode: 'double' as const, number: parsedTarget.number }
      : parsedTarget;

  const roundProgressPct = Math.round((safeRound / safeTotal) * 100);
  const goldBarWidth = Math.max(14, Math.min(100, roundProgressPct));

  return (
    <LionsDartboardArenaShell
      ariaLabel="Checkout Battle"
      gameTitle="CHECKOUT BATTLE"
      headerItems={[
        boardLabel || `BOARD ${boardId}`,
        'LIONS WEYHAUSEN',
        `AUFNAHME ${safeRound}/${safeTotal}`,
      ]}
      currentTime={currentTime}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
      stageImageSrc={stageImageSrc}
      centerLabel="DOPPEL"
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
        </>
      }
      rightAriaLabel="Doppelquote"
      rightWingContent={
        <>
          <span className="lda-kicker">DOPPELQUOTE</span>
          <div className="lda-divider" />
          <div className="lda-main-value">{quote.toFixed(1)}%</div>
          {thrown > 0 && (
            <div className="lda-sub-meta">
              {hits} TREFFER / {thrown} DARTS
            </div>
          )}
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
