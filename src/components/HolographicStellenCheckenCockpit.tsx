'use client';

import React from 'react';
import TrainingMonitorShell, {
  TrainingMonitorDotState,
  extractTargetNumber,
} from '@/components/TrainingMonitorShell';

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
}: HolographicStellenCheckenProps) {
  const safeTotal = Math.max(1, totalVisits);
  const safeVisit = Math.max(1, Math.min(currentVisit, safeTotal));
  const quote =
    currentVisit > 1 || checksCount > 0
      ? Math.min(100, (checksCount / safeVisit) * 100)
      : 0;

  const formattedRoute = recommendedRoute
    .replace(/➔/g, '→')
    .replace(/\s+→\s+/g, '  →  ');

  const progressDots: TrainingMonitorDotState[] = Array.from(
    { length: safeTotal },
    (_, idx) => {
      if (idx < safeVisit - 1) return 'hit';
      if (idx === safeVisit - 1) return 'current';
      return 'pending';
    }
  );

  return (
    <TrainingMonitorShell
      boardId={boardId}
      boardLabel={boardLabel}
      gameName="STELLEN & CHECKEN"
      headerTitle="STELLEN & CHECKEN"
      counter={`AUFNAHME ${safeVisit}/${safeTotal}`}
      kind="board"
      playerName={activeName}
      playerTop={is1vs1 ? `SPIELER ${activePlayer} · AM OCHE` : undefined}
      centerLabel="ZIELZAHL"
      centerValue={String(currentNumber)}
      highlightNumber={extractTargetNumber(recommendedRoute)}
      route={formattedRoute}
      statsTitle="CHECKS"
      statsValue={String(checksCount)}
      statsSuffix={`/ ${safeTotal}`}
      statsDetail="CHECKS VERWANDELT"
      secondary={`${quote.toFixed(1)}%`}
      progressDots={progressDots}
      progressStyle="circles"
      currentTime={currentTime}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
    />
  );
}
