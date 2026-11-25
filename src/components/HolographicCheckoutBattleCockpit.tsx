'use client';

import React from 'react';
import TrainingMonitorShell, {
  extractTargetNumber,
} from '@/components/TrainingMonitorShell';

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
}: HolographicCheckoutBattleProps) {
  const safeRound = Math.max(1, Math.min(currentRound, totalRounds));
  const roundProgressPct = Math.round((safeRound / Math.max(1, totalRounds)) * 100);

  return (
    <TrainingMonitorShell
      boardId={boardId}
      boardLabel={boardLabel}
      gameName="CHECKOUT BATTLE"
      headerTitle=""
      counter={`AUFNAHME ${safeRound}/${totalRounds}`}
      kind="board"
      playerName={activeName}
      playerTop={is1vs1 ? `SPIELER ${activePlayer} · AM OCHE` : 'SPIELER AM OCHE'}
      centerLabel="DOPPEL"
      centerValue={currentTarget}
      highlightNumber={extractTargetNumber(currentTarget)}
      statsTitle="DOPPELQUOTE"
      statsValue={`${quote.toFixed(1)}%`}
      statsDetail={thrown > 0 ? `${hits} TREFFER / ${thrown} DARTS` : undefined}
      goldProgressPct={roundProgressPct}
      currentTime={currentTime}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
    />
  );
}
