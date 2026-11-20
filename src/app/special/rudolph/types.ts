export type RudolphFinalTarget = 'BULL' | 'D20';

export interface RudolphCheckpoint {
  step: number; // 1 bis 5
  location: string;
  title: string;
  icon: string;
  targetLabel: string;
  ruleHint: string;
}

export function getRudolphCheckpoints(finalTarget: RudolphFinalTarget): RudolphCheckpoint[] {
  return [
    {
      step: 1,
      location: 'Nordpol',
      title: 'Startrampe',
      icon: '🛫',
      targetLabel: '20',
      ruleHint: 'Single, Double oder Triple 20 treffen',
    },
    {
      step: 2,
      location: 'Hamburg',
      title: 'Schneesturm',
      icon: '🌩️',
      targetLabel: 'GRÜN',
      ruleHint: 'Beliebiges grünes Segment treffen',
    },
    {
      step: 3,
      location: 'Hannover',
      title: 'Geschenke-Abwurf',
      icon: '🎁',
      targetLabel: '19 · 17 · 15',
      ruleHint: '19, 17 oder 15 treffen',
    },
    {
      step: 4,
      location: 'Wolfsburg',
      title: 'Turbulenzen',
      icon: '🌪️',
      targetLabel: 'DOPPEL',
      ruleHint: 'Beliebiges Doppel-Feld (D1–D20) treffen',
    },
    {
      step: 5,
      location: 'Weyhausen',
      title: 'Landebahn Lions',
      icon: '🏟️',
      targetLabel: finalTarget === 'D20' ? 'D20' : 'BULL',
      ruleHint:
        finalTarget === 'D20'
          ? 'Doppel 20 (Tops) für die Landung!'
          : 'Bullseye oder Single Bull für die Landung!',
    },
  ];
}

export interface RudolphDartEvent {
  kind: 'hit' | 'win' | 'miss';
  checkpointStep?: number;
  label: string;
  subLabel: string;
}

export interface RudolphPlayerState {
  completedSteps: number; // 0 bis 5 (5 = Landung in Weyhausen)
  dartsThrown: number;
  roundsPlayed: number;
  bestTurnSteps: number;
  currentTurnDarts: RudolphDartEvent[];
}

export interface RudolphLastActionBanner {
  id: number;
  tone: 'hit' | 'turbo' | 'win' | 'miss' | 'info';
  icon: string;
  headline: string;
  subline: string;
  actorPlayer: 1 | 2;
}

export interface RudolphLiveData {
  finalTarget: RudolphFinalTarget;
  roundNumber: number;
  p1: RudolphPlayerState;
  p2: RudolphPlayerState;
  lastAction?: RudolphLastActionBanner | null;
  winnerPlayer?: 1 | 2 | null;
  winnerName?: string | null;
}

export function createInitialRudolphPlayerState(): RudolphPlayerState {
  return {
    completedSteps: 0,
    dartsThrown: 0,
    roundsPlayed: 0,
    bestTurnSteps: 0,
    currentTurnDarts: [],
  };
}

export function cloneRudolphPlayerState(s: RudolphPlayerState): RudolphPlayerState {
  return {
    completedSteps: s.completedSteps,
    dartsThrown: s.dartsThrown,
    roundsPlayed: s.roundsPlayed,
    bestTurnSteps: s.bestTurnSteps,
    currentTurnDarts: s.currentTurnDarts.map((ev) => ({ ...ev })),
  };
}
