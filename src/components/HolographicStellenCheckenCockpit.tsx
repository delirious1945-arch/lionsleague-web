'use client';

import React from 'react';
import LionsDartboardArenaShell, {
  parseCheckoutRouteTargets,
} from '@/components/LionsDartboardArenaShell';

export interface HolographicStellenCheckenProps {
  boardId: string;
  boardLabel?: string;
  activeName: string;
  is1vs1?: boolean;
  activePlayer?: 1 | 2;
  currentVisit: number; // z. B. 4
  totalVisits?: number; // z. B. 15
  currentNumber: number; // z. B. 64
  recommendedRoute: string; // z. B. "T16 ➔ D8"
  checksCount: number; // z. B. 5
  currentTime?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  stageImageSrc?: string;
}

export default function HolographicStellenCheckenCockpit({
  boardId,
  boardLabel,
  activeName,
  is1vs1 = false,
  activePlayer = 1,
  currentVisit,
  totalVisits = 15,
  currentNumber,
  recommendedRoute,
  checksCount,
  currentTime,
  isFullscreen = false,
  onToggleFullscreen,
  stageImageSrc,
}: HolographicStellenCheckenProps) {
  // Spielername immer dynamisch aus dem laufenden Spiel (niemals hardcoded!)
  const cleanName = (activeName || '').trim() || 'Spieler';
  const nameParts = cleanName.split(/\s+/).filter(Boolean);
  const longestPartLen = Math.max(...nameParts.map((p) => p.length), 0);
  const isCompactName = longestPartLen > 12 || nameParts.length > 2;

  const safeTotal = Math.max(1, totalVisits);
  const safeVisit = Math.max(1, Math.min(currentVisit, safeTotal));
  const quote =
    currentVisit > 1 || checksCount > 0
      ? Math.min(100, (checksCount / safeVisit) * 100)
      : 0;

  const formattedRoute = (recommendedRoute || '-')
    .replace(/➔/g, '→')
    .replace(/\s+→\s+/g, ' → ');

  const parsedRoute = parseCheckoutRouteTargets(recommendedRoute);
  const primaryTarget =
    parsedRoute.primary.mode !== 'none'
      ? parsedRoute.primary
      : currentNumber >= 1 && currentNumber <= 20
      ? { mode: 'wedge' as const, number: currentNumber }
      : { mode: 'none' as const, number: null };

  return (
    <LionsDartboardArenaShell
      ariaLabel="Stellen & Checken"
      gameTitle="STELLEN & CHECKEN"
      headerItems={[
        boardLabel || `BOARD ${boardId}`,
        'LIONS WEYHAUSEN',
        `AUFNAHME ${safeVisit}/${safeTotal}`,
      ]}
      currentTime={currentTime}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
      stageImageSrc={stageImageSrc}
      centerLabel="REST"
      centerValue={String(currentNumber)}
      primaryTarget={primaryTarget}
      secondaryTarget={parsedRoute.secondary}
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
      rightWingRich
      rightAriaLabel="Checks und Quote"
      rightWingContent={
        <>
          <div style={{ width: '100%' }}>
            <span className="lda-kicker">CHECKS</span>
            <div className="lda-divider" />
            <div className="lda-main-row">
              <div className="lda-main-value lda-main-value-md">
                {checksCount}
              </div>
              <span className="lda-main-suffix">/ {safeTotal}</span>
            </div>
            <div className="lda-sub-meta">
              {quote.toFixed(1)}% · VERWANDELT
            </div>
          </div>

          <div className="lda-check-grid" aria-label="Rundenverlauf">
            {Array.from({ length: safeTotal }, (_, idx) => {
              const stateCls =
                idx < safeVisit - 1
                  ? 'lda-ring-hit'
                  : idx === safeVisit - 1
                  ? 'lda-ring-current'
                  : '';
              return (
                <div className={`lda-check-ring ${stateCls}`} key={idx}>
                  {idx + 1}
                </div>
              );
            })}
          </div>
        </>
      }
      bottomPill={
        <>
          <span>CHECKROUTE</span>
          <i />
          <em>{formattedRoute}</em>
        </>
      }
    />
  );
}
