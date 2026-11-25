'use client';

import React from 'react';
import TrainingMonitorShell, {
  TrainingMonitorDartSlot,
} from '@/components/TrainingMonitorShell';
import {
  DartHitValue,
  Darts99LivePlayerStats,
  MAX_POINTS_99,
  TOTAL_DARTS_99,
  TOTAL_ROUNDS_99,
} from '@/app/training/99-darts/types';

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
}

function mapDartSlot(
  val: DartHitValue | undefined,
  idx: number,
  targetNumber: number
): TrainingMonitorDartSlot {
  const label = `Dart ${idx + 1}`;
  if (val === 3) return { label, value: `T${targetNumber}`, tone: 'hit' };
  if (val === 2) return { label, value: `D${targetNumber}`, tone: 'hit' };
  if (val === 1) return { label, value: `S${targetNumber}`, tone: 'hit' };
  if (val === 0) return { label, value: 'MISS', tone: 'miss' };
  return { label, value: '?', tone: 'pending' };
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
}: HolographicDarts99Props) {
  const activeStats =
    is1vs1 && activePlayer === 2 && p2Stats ? p2Stats : p1Stats;

  const displayRound = Math.min(
    Math.max(1, activeStats.currentRound || 1),
    TOTAL_ROUNDS_99
  );
  const dartSlots: TrainingMonitorDartSlot[] = [0, 1, 2].map((idx) =>
    mapDartSlot(activeStats.currentTurnDarts?.[idx], idx, targetNumber)
  );

  const otherName = activePlayer === 1 ? p2Name : p1Name;
  const otherStats = activePlayer === 1 ? p2Stats : p1Stats;
  const opponentBanner =
    is1vs1 && otherStats
      ? `GEGNER: ${otherName} · ${otherStats.totalPoints} PKT`
      : undefined;

  const denom = Math.max(1, activeStats.dartsThrown);

  return (
    <TrainingMonitorShell
      boardId={boardId}
      boardLabel={boardLabel}
      gameName="99 DARTS CHALLENGE"
      headerTitle={`ZIEL ${targetNumber}`}
      counter={`AUFNAHME ${displayRound}/${TOTAL_ROUNDS_99}`}
      kind="board"
      playerName={activeName}
      playerTop={is1vs1 ? `SPIELER ${activePlayer} · AM OCHE` : undefined}
      playerDetail={`AUFNAHME ${displayRound} / ${TOTAL_ROUNDS_99}`}
      dartSlots={dartSlots}
      playerStats={[
        { label: 'TREFFERQUOTE', value: `${activeStats.hitQuote.toFixed(1)}%` },
        { label: 'PKT / DART', value: activeStats.pointsPerDart.toFixed(2) },
      ]}
      opponentBanner={opponentBanner}
      centerLabel="ZIELZAHL"
      centerValue={String(targetNumber)}
      highlightNumber={targetNumber}
      legend={`S${targetNumber}: 1P   •   D${targetNumber}: 2P   •   T${targetNumber}: 3P   •   ${TOTAL_DARTS_99} DARTS`}
      statsTitle="PUNKTESTAND"
      statsValue={String(activeStats.totalPoints)}
      statsSuffix={`/ ${MAX_POINTS_99}`}
      statsDetail={`DARTS ${activeStats.dartsThrown} / ${TOTAL_DARTS_99}`}
      statRows={[
        {
          label: `Triple (T${targetNumber})`,
          value: `${activeStats.triples}×  (${activeStats.triples * 3} Pkt)`,
          pct: (activeStats.triples / denom) * 100,
          tone: 'gold',
        },
        {
          label: `Double (D${targetNumber})`,
          value: `${activeStats.doubles}×  (${activeStats.doubles * 2} Pkt)`,
          pct: (activeStats.doubles / denom) * 100,
          tone: 'cyan',
        },
        {
          label: `Single (S${targetNumber})`,
          value: `${activeStats.singles}×  (${activeStats.singles} Pkt)`,
          pct: (activeStats.singles / denom) * 100,
          tone: 'green',
        },
        {
          label: 'Miss (0 Pkt)',
          value: `${activeStats.misses}×`,
          pct: (activeStats.misses / denom) * 100,
          tone: 'red',
        },
      ]}
      currentTime={currentTime}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
    />
  );
}
