'use client';

import React from 'react';
import TrainingMonitorShell, {
  extractTargetNumber,
} from '@/components/TrainingMonitorShell';

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
}: HolographicPdcChallengeProps) {
  const centerLabel =
    currentPart === 2 ? 'DOPPEL' : currentPart === 3 ? 'SHANGHAI' : 'ZIEL';
  const safeVisit = Math.max(1, Math.min(currentVisit, totalVisits));

  return (
    <TrainingMonitorShell
      boardId={boardId}
      boardLabel={boardLabel}
      gameName={`PDC CHALLENGE${currentPart ? ` · TEIL ${currentPart}` : ''}`}
      headerTitle="PDC CHALLENGE"
      counter={`AUFNAHME ${safeVisit}/${totalVisits}`}
      kind="board"
      playerName={activeName}
      playerTop={is1vs1 ? `SPIELER ${activePlayer} · AM OCHE` : 'SPIELER AM OCHE'}
      centerLabel={centerLabel}
      centerValue={currentTarget}
      highlightNumber={extractTargetNumber(currentTarget)}
      statsTitle="PUNKTESTAND"
      statsValue={String(currentScore)}
      statsSuffix="/ 100"
      currentTime={currentTime}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
    />
  );
}
