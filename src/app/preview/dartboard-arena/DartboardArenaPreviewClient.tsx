'use client';

import React, { useState } from 'react';
import HolographicCheckoutBattleCockpit from '@/components/HolographicCheckoutBattleCockpit';
import HolographicDarts99Cockpit from '@/components/HolographicDarts99Cockpit';
import HolographicPdcChallengeCockpit from '@/components/HolographicPdcChallengeCockpit';
import HolographicStellenCheckenCockpit from '@/components/HolographicStellenCheckenCockpit';
import { Darts99LivePlayerStats } from '@/app/training/99-darts/types';

type PreviewGame = 'checkout-battle' | 'darts-99' | 'pdc-challenge' | 'stellen-checken';
type PreviewScenario = 'standard' | 'duel-long-name' | 'bull-endgame';

const GAME_OPTIONS: { id: PreviewGame; label: string }[] = [
  { id: 'checkout-battle', label: '1. Checkout Battle' },
  { id: 'darts-99', label: '2. 99 Darts Challenge' },
  { id: 'pdc-challenge', label: '3. PDC Challenge' },
  { id: 'stellen-checken', label: '4. Stellen & Checken' },
];

const SCENARIO_OPTIONS: { id: PreviewScenario; label: string }[] = [
  { id: 'standard', label: 'Standard (André Rathje)' },
  { id: 'duel-long-name', label: '1vs1 · Langer Name' },
  { id: 'bull-endgame', label: 'Bull / Endphase' },
];

export default function DartboardArenaPreviewClient() {
  const [activeGame, setActiveGame] = useState<PreviewGame>('checkout-battle');
  const [scenario, setScenario] = useState<PreviewScenario>('standard');
  const [toolbarHidden, setToolbarHidden] = useState(false);

  const playerName =
    scenario === 'duel-long-name'
      ? 'Alexander-Maximilian Schmidt'
      : scenario === 'bull-endgame'
      ? 'Marcel Meyer'
      : 'André Rathje';

  const is1vs1 = scenario === 'duel-long-name';
  const activePlayer: 1 | 2 = scenario === 'duel-long-name' ? 2 : 1;

  const darts99StatsStandard: Darts99LivePlayerStats = {
    totalPoints: 142,
    dartsThrown: 42,
    currentRound: 15,
    currentTurnDarts: [3, 1, 0],
    singles: 21,
    doubles: 6,
    triples: 9,
    misses: 6,
    hitQuote: 85.7,
    pointsPerDart: 3.38,
    finished: false,
  };

  const darts99StatsLong: Darts99LivePlayerStats = {
    totalPoints: 98,
    dartsThrown: 36,
    currentRound: 13,
    currentTurnDarts: [2, 3],
    singles: 15,
    doubles: 5,
    triples: 6,
    misses: 10,
    hitQuote: 72.2,
    pointsPerDart: 2.72,
    finished: false,
  };

  const darts99StatsEndgame: Darts99LivePlayerStats = {
    totalPoints: 214,
    dartsThrown: 96,
    currentRound: 33,
    currentTurnDarts: [3, 2, 1],
    singles: 44,
    doubles: 14,
    triples: 18,
    misses: 20,
    hitQuote: 79.2,
    pointsPerDart: 2.23,
    finished: false,
  };

  const active99Stats =
    scenario === 'duel-long-name'
      ? darts99StatsLong
      : scenario === 'bull-endgame'
      ? darts99StatsEndgame
      : darts99StatsStandard;

  const target99 =
    scenario === 'duel-long-name' ? 19 : scenario === 'bull-endgame' ? 18 : 20;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {activeGame === 'checkout-battle' && (
        <HolographicCheckoutBattleCockpit
          boardId="4"
          boardLabel="BOARD 4"
          activeName={playerName}
          is1vs1={is1vs1}
          activePlayer={activePlayer}
          currentTarget={
            scenario === 'duel-long-name'
              ? 'D16'
              : scenario === 'bull-endgame'
              ? 'BULL'
              : 'D20'
          }
          currentRound={scenario === 'bull-endgame' ? 10 : scenario === 'duel-long-name' ? 6 : 3}
          totalRounds={10}
          quote={scenario === 'bull-endgame' ? 40.0 : scenario === 'duel-long-name' ? 27.8 : 33.3}
          hits={scenario === 'bull-endgame' ? 12 : scenario === 'duel-long-name' ? 5 : 3}
          thrown={scenario === 'bull-endgame' ? 30 : scenario === 'duel-long-name' ? 18 : 9}
          currentTime="19:42"
        />
      )}

      {activeGame === 'darts-99' && (
        <HolographicDarts99Cockpit
          boardId="4"
          boardLabel="BOARD 4"
          p1Name="André Rathje"
          p2Name="Alexander-Maximilian Schmidt"
          activeName={playerName}
          is1vs1={is1vs1}
          activePlayer={activePlayer}
          targetNumber={target99}
          p1Stats={darts99StatsStandard}
          p2Stats={active99Stats}
          currentTime="19:42"
        />
      )}

      {activeGame === 'pdc-challenge' && (
        <HolographicPdcChallengeCockpit
          boardId="4"
          boardLabel="BOARD 4"
          activeName={playerName}
          is1vs1={is1vs1}
          activePlayer={activePlayer}
          currentPart={
            scenario === 'duel-long-name'
              ? 2
              : scenario === 'bull-endgame'
              ? 3
              : 1
          }
          currentTarget={
            scenario === 'duel-long-name'
              ? 'D8'
              : scenario === 'bull-endgame'
              ? '15'
              : '19'
          }
          currentScore={
            scenario === 'bull-endgame' ? 84 : scenario === 'duel-long-name' ? 52 : 38
          }
          currentVisit={
            scenario === 'bull-endgame' ? 24 : scenario === 'duel-long-name' ? 14 : 7
          }
          totalVisits={26}
          currentTime="19:42"
        />
      )}

      {activeGame === 'stellen-checken' && (
        <HolographicStellenCheckenCockpit
          boardId="4"
          boardLabel="BOARD 4"
          activeName={playerName}
          is1vs1={is1vs1}
          activePlayer={activePlayer}
          currentVisit={
            scenario === 'bull-endgame' ? 15 : scenario === 'duel-long-name' ? 8 : 4
          }
          totalVisits={15}
          currentNumber={
            scenario === 'bull-endgame' ? 50 : scenario === 'duel-long-name' ? 43 : 64
          }
          recommendedRoute={
            scenario === 'bull-endgame'
              ? 'BULL'
              : scenario === 'duel-long-name'
              ? 'S11 ➔ D16'
              : 'T16 ➔ D8'
          }
          checksCount={
            scenario === 'bull-endgame' ? 11 : scenario === 'duel-long-name' ? 5 : 3
          }
          currentTime="19:42"
        />
      )}

      {/* Schwebende lokale Prüf-Toolbar (nur lokal auf Feature-Branch) */}
      {toolbarHidden ? (
        <button
          type="button"
          onClick={() => setToolbarHidden(false)}
          style={{
            position: 'fixed',
            right: '14px',
            bottom: '14px',
            zIndex: 120,
            padding: '8px 14px',
            borderRadius: '999px',
            border: '1px solid rgba(44, 227, 255, 0.7)',
            background: 'rgba(3, 15, 28, 0.88)',
            color: '#e6f7ff',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
        >
          🎛️ Vorschau-Menü einblenden
        </button>
      ) : (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: '12px',
            transform: 'translateX(-50%)',
            zIndex: 120,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            maxWidth: '96vw',
            padding: '8px 12px',
            borderRadius: '14px',
            border: '1px solid rgba(44, 227, 255, 0.55)',
            background: 'rgba(3, 14, 26, 0.88)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '999px',
              background: 'rgba(250, 204, 21, 0.16)',
              border: '1px solid rgba(250, 204, 21, 0.55)',
              color: '#fde047',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            LOKALE VORSCHAU · NICHT LIVE
          </span>

          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {GAME_OPTIONS.map((opt) => {
              const active = activeGame === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setActiveGame(opt.id)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    border: active
                      ? '1px solid #2ce3ff'
                      : '1px solid rgba(148, 198, 224, 0.28)',
                    background: active
                      ? 'rgba(0, 180, 224, 0.35)'
                      : 'rgba(10, 28, 46, 0.7)',
                    color: active ? '#ffffff' : '#b8dff2',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <span style={{ color: 'rgba(148,198,224,0.35)' }}>|</span>

          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {SCENARIO_OPTIONS.map((opt) => {
              const active = scenario === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setScenario(opt.id)}
                  style={{
                    padding: '5px 9px',
                    borderRadius: '8px',
                    border: active
                      ? '1px solid #00ed79'
                      : '1px solid rgba(148, 198, 224, 0.25)',
                    background: active
                      ? 'rgba(0, 237, 121, 0.22)'
                      : 'rgba(10, 28, 46, 0.65)',
                    color: active ? '#b7ffda' : '#b8dff2',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setToolbarHidden(true)}
            style={{
              padding: '5px 9px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#d9f5ff',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Ausblenden
          </button>
        </div>
      )}
    </div>
  );
}
