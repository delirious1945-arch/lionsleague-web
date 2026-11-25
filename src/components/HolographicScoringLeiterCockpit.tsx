'use client';

import React from 'react';
import TrainingMonitorShell, {
  TrainingMonitorDotState,
} from '@/components/TrainingMonitorShell';
import {
  SCORING_LEITER_LEVELS,
  MAX_VISITS_PER_LEVEL,
} from '@/app/training/scoring-leiter/types';

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
  const opponentBanner = is1vs1
    ? `GEGNER: ${otherName} · ${
        otherCleared
          ? 'FERTIG'
          : otherEliminated
          ? 'K.O.'
          : `STUFE ${SCORING_LEITER_LEVELS[otherLevelIdx]}`
      }`
    : undefined;

  const progressDots: TrainingMonitorDotState[] = Array.from(
    { length: MAX_VISITS_PER_LEVEL },
    (_, i) => {
      const v = activeVisits[i];
      if (v === true) return 'hit';
      if (v === false) return 'miss';
      if (!activeEliminated && !activeClearedAll && i === activeVisits.length) {
        return 'current';
      }
      return 'pending';
    }
  );

  const displayVisit = Math.min(activeVisits.length + 1, MAX_VISITS_PER_LEVEL);

  return (
    <TrainingMonitorShell
      boardId={boardId}
      boardLabel={boardLabel}
      gameName="SCORING-LEITER"
      headerTitle="SCORING-LEITER"
      counter={`STUFE ${safeLevelIdx + 1}/${levelsCount}`}
      kind="ladder"
      playerName={activeName}
      playerTop={is1vs1 ? `SPIELER ${activePlayer} · AM OCHE` : undefined}
      opponentBanner={opponentBanner}
      ladderSteps={[...SCORING_LEITER_LEVELS]}
      activeLadderIndex={safeLevelIdx}
      clearedAll={activeClearedAll}
      eliminated={activeEliminated}
      statsTitle="AUFSTIEG"
      statsValue={String(activeHits)}
      statsSuffix="/ 2"
      statsDetail={
        activeClearedAll
          ? 'ALLE STUFEN GESCHAFFT!'
          : activeEliminated
          ? 'AUSGESCHIEDEN'
          : 'TREFFER FÜR AUFSTIEG'
      }
      secondary={`AUFNAHME ${displayVisit} / ${MAX_VISITS_PER_LEVEL}`}
      progressDots={progressDots}
      currentTime={currentTime}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
    />
  );
}
