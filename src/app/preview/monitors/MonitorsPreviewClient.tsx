'use client';

import React, { useState } from 'react';
import HolographicFussballCockpit from '@/components/HolographicFussballCockpit';
import HolographicCheckoutBattleCockpit from '@/components/HolographicCheckoutBattleCockpit';
import HolographicDarts99Cockpit from '@/components/HolographicDarts99Cockpit';
import HolographicPdcChallengeCockpit from '@/components/HolographicPdcChallengeCockpit';
import HolographicStellenCheckenCockpit from '@/components/HolographicStellenCheckenCockpit';
import HolographicScoringLeiterCockpit from '@/components/HolographicScoringLeiterCockpit';
import { Darts99LivePlayerStats } from '@/app/training/99-darts/types';

type MonitorGame =
  | 'fussball'
  | 'checkout-battle'
  | 'darts-99'
  | 'pdc-challenge'
  | 'stellen-checken'
  | 'scoring-leiter';

type FootballScenario = 'kickoff' | 'p1-possession' | 'p2-long-possession';

const GAME_TABS: { id: MonitorGame; label: string }[] = [
  { id: 'fussball', label: '1. Fußball Darts' },
  { id: 'checkout-battle', label: '2. Checkout Battle' },
  { id: 'darts-99', label: '3. 99 Darts' },
  { id: 'pdc-challenge', label: '4. PDC Challenge' },
  { id: 'stellen-checken', label: '5. Stellen & Checken' },
  { id: 'scoring-leiter', label: '6. Scoring-Leiter' },
];

const FOOTBALL_SCENARIOS: { id: FootballScenario; label: string }[] = [
  { id: 'kickoff', label: 'Anstoß (Kein Ballbesitz · 0:0)' },
  { id: 'p1-possession', label: 'Spieler 1 Ballbesitz (2:1 + Stats)' },
  { id: 'p2-long-possession', label: 'Gegner/Bot Ballbesitz (1:3 · Langer Name)' },
];

const DARTS99_SAMPLE_STATS: Darts99LivePlayerStats = {
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

export default function MonitorsPreviewClient() {
  const [activeGame, setActiveGame] = useState<MonitorGame>('fussball');
  const [footballScenario, setFootballScenario] =
    useState<FootballScenario>('kickoff');
  const [toolbarHidden, setToolbarHidden] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {activeGame === 'fussball' && (
        <HolographicFussballCockpit
          boardId="4"
          boardLabel="BOARD 4"
          p1Name={
            footballScenario === 'p2-long-possession'
              ? 'Alexander-Maximilian Schmidt'
              : 'André Rathje'
          }
          p2Name={
            footballScenario === 'p2-long-possession'
              ? 'Computer (PDC Pro)'
              : footballScenario === 'p1-possession'
              ? 'Marcel Meyer'
              : 'Computer (Kreisliga)'
          }
          is1vs1
          activePlayer={
            footballScenario === 'p2-long-possession' ? 2 : 1
          }
          scoreP1={
            footballScenario === 'p1-possession'
              ? 2
              : footballScenario === 'p2-long-possession'
              ? 1
              : 0
          }
          scoreP2={
            footballScenario === 'p1-possession'
              ? 1
              : footballScenario === 'p2-long-possession'
              ? 3
              : 0
          }
          targetGoals={5}
          ballPossession={
            footballScenario === 'p1-possession'
              ? 1
              : footballScenario === 'p2-long-possession'
              ? 2
              : null
          }
          fussballStats={
            footballScenario === 'kickoff'
              ? {
                  p1Darts: 0,
                  p1BullHits: 0,
                  p1BullAttempts: 0,
                  p1DoubleHits: 0,
                  p1DoubleAttempts: 0,
                }
              : {
                  p1Darts: 14,
                  p1BullHits: 3,
                  p1BullAttempts: 6,
                  p1DoubleHits: 2,
                  p1DoubleAttempts: 8,
                }
          }
          gameMode={
            footballScenario === 'p1-possession' ? '1vs1' : '1vsComputer'
          }
        />
      )}

      {activeGame === 'checkout-battle' && (
        <HolographicCheckoutBattleCockpit
          boardId="4"
          boardLabel="BOARD 4"
          activeName="André Rathje"
          currentTarget="D20"
          currentRound={3}
          totalRounds={10}
          quote={33.3}
          hits={3}
          thrown={9}
          currentTime="17:55"
        />
      )}

      {activeGame === 'darts-99' && (
        <HolographicDarts99Cockpit
          boardId="4"
          boardLabel="BOARD 4"
          activeName="André Rathje"
          targetNumber={20}
          p1Stats={DARTS99_SAMPLE_STATS}
          currentTime="17:55"
        />
      )}

      {activeGame === 'pdc-challenge' && (
        <HolographicPdcChallengeCockpit
          boardId="4"
          boardLabel="BOARD 4"
          activeName="André Rathje"
          currentPart={1}
          currentTarget="19"
          currentScore={44}
          currentVisit={8}
          totalVisits={26}
          currentTime="17:55"
        />
      )}

      {activeGame === 'stellen-checken' && (
        <HolographicStellenCheckenCockpit
          boardId="4"
          boardLabel="BOARD 4"
          activeName="André Rathje"
          currentVisit={4}
          totalVisits={15}
          currentNumber={64}
          recommendedRoute="T16 ➔ D8"
          checksCount={3}
          currentTime="17:55"
        />
      )}

      {activeGame === 'scoring-leiter' && (
        <HolographicScoringLeiterCockpit
          boardId="4"
          boardLabel="BOARD 4"
          activeName="André Rathje"
          currentLevelIndex={2}
          currentNumber={70}
          hitsInLevel={1}
          levelVisits={[true, false, true, false]}
          currentVisit={5}
          currentTime="17:55"
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
            maxWidth: '98vw',
            padding: '8px 12px',
            borderRadius: '14px',
            border: '1px solid rgba(44, 227, 255, 0.55)',
            background: 'rgba(3, 14, 26, 0.9)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.78)',
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
            {GAME_TABS.map((tab) => {
              const active = activeGame === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveGame(tab.id)}
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
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeGame === 'fussball' && (
            <>
              <span style={{ color: 'rgba(148,198,224,0.35)' }}>|</span>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {FOOTBALL_SCENARIOS.map((sc) => {
                  const active = footballScenario === sc.id;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setFootballScenario(sc.id)}
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
                      {sc.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

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
