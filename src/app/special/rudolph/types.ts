export type RudolphFinalTarget = 'BULL' | 'D20';

export const RUDOLPH_TOTAL_STEPS = 12;

export interface RudolphCheckpoint {
  step: number; // 1 bis 12
  location: string;
  title: string;
  icon: string;
  targetLabel: string;
  ruleHint: string;
  specialType?: 'thaw' | 'trap' | 'shield' | 'finish';
  specialBadge?: string;
  turboHint?: string;
}

export function getRudolphCheckpoints(finalTarget: RudolphFinalTarget): RudolphCheckpoint[] {
  return [
    {
      step: 1,
      location: 'Nordpol',
      title: 'Startrampe',
      icon: '🛫',
      targetLabel: '20',
      ruleHint: 'Single, Double oder Triple 20 — Schlitten anschmeißen!',
      turboHint: 'T20 = +2 Etappen',
    },
    {
      step: 2,
      location: 'Wichtel-Werkstatt',
      title: 'Geschenke aufladen',
      icon: '🧝',
      targetLabel: '19',
      ruleHint: '19 treffen — die Wichtel beladen deinen Schlitten!',
      turboHint: 'T19 = +2 Etappen',
    },
    {
      step: 3,
      location: 'Lebkuchen-Bäckerei',
      title: 'Plätzchen-Proviant',
      icon: '🍪',
      targetLabel: '18',
      ruleHint: '18 treffen — Proviant für die Rentiere einsacken!',
      turboHint: 'T18 = +2 Etappen',
    },
    {
      step: 4,
      location: 'Glühwein-Tanke',
      title: 'Heißer Boxenstopp',
      icon: '🍷',
      targetLabel: 'ROT',
      ruleHint: 'Beliebiges rotes Feld (Doppel, Triple oder Bullseye) — taut vereiste Kufen sofort auf!',
      specialType: 'thaw',
      specialBadge: '🍷 TAUT EIS AUF',
      turboHint: 'Rotes Triple / Bullseye = +2',
    },
    {
      step: 5,
      location: 'Eisregen-Gipfel',
      title: 'Glatte Wolken',
      icon: '❄️',
      targetLabel: '17',
      ruleHint: '17 treffen — Kufen festhalten, es wird rutschig!',
      turboHint: 'T17 = +2 Etappen',
    },
    {
      step: 6,
      location: 'Knecht Ruprecht',
      title: 'Ruten-Kontrolle',
      icon: '🧦',
      targetLabel: '16',
      ruleHint: '16 treffen! Achtung: 3× Miss in einer Aufnahme = -1 Etappe zurück!',
      specialType: 'trap',
      specialBadge: '⚠️ 3× MISS = -1',
      turboHint: 'T16 = +2 Etappen',
    },
    {
      step: 7,
      location: 'Tannenwald',
      title: 'Baumspitzen-Slalom',
      icon: '🎄',
      targetLabel: 'GRÜN',
      ruleHint: 'Beliebiges grünes Feld (Doppel, Triple oder 25) — nicht in die Tanne krachen!',
      turboHint: 'Grünes Triple = +2',
    },
    {
      step: 8,
      location: 'Schneemann-Kreisel',
      title: 'Eisige Kurve',
      icon: '☃️',
      targetLabel: '15',
      ruleHint: '15 treffen — einmal quer um den dicken Schneemann!',
      turboHint: 'T15 = +2 Etappen',
    },
    {
      step: 9,
      location: 'Wichtel-Schleuder',
      title: 'Schild-Bonus',
      icon: '🎁',
      targetLabel: '14',
      ruleHint: '14 treffen — schenkt dir sofort ein 🛡️ Wichtel-Schild!',
      specialType: 'shield',
      specialBadge: '🛡️ GIBT SCHILD',
      turboHint: 'T14 = +2 & 🛡️',
    },
    {
      step: 10,
      location: 'Grinch-Hinterhalt',
      title: 'Grinch-Falle',
      icon: '👹',
      targetLabel: 'DOPPEL',
      ruleHint: 'Beliebiges Doppel (D1–D20)! Achtung: 3× Miss = Grinch schubst dich -1 zurück!',
      specialType: 'trap',
      specialBadge: '⚠️ 3× MISS = -1',
      turboHint: 'D20 / Bullseye = +2',
    },
    {
      step: 11,
      location: 'Pechvogel-Wolke',
      title: 'An der 13 vorbei',
      icon: '⚡',
      targetLabel: '13',
      ruleHint: '13 treffen — die Unglückszahl vor dem finalen Landeanflug!',
      turboHint: 'T13 = Landeanflug + 🛡️',
    },
    {
      step: 12,
      location: 'Weyhausen',
      title: 'Lions-Landebahn',
      icon: '🏟️',
      targetLabel: finalTarget === 'D20' ? 'D20' : 'BULL',
      ruleHint:
        finalTarget === 'D20'
          ? 'Doppel 20 (Tops) für die Landung im Vereinsheim!'
          : 'Bullseye oder Single Bull für die Landung im Vereinsheim!',
      specialType: 'finish',
      specialBadge: '🏆 ZIEL',
    },
  ];
}

export interface RudolphDartEvent {
  kind: 'hit' | 'turbo' | 'sabotage' | 'crash' | 'trap' | 'shield' | 'win' | 'miss';
  checkpointStep?: number;
  label: string;
  subLabel: string;
}

export interface RudolphPlayerState {
  completedSteps: number; // 0 bis 12 (12 = Landung in Weyhausen)
  dartsThrown: number;
  roundsPlayed: number;
  bestTurnSteps: number;
  currentTurnDarts: RudolphDartEvent[];
  isFrozen: boolean;
  hasShield: boolean;
  sabotagesLanded: number;
  crashesCaused: number;
  sabotagedThisTurn: boolean;
}

export interface RudolphLastActionBanner {
  id: number;
  tone: 'hit' | 'turbo' | 'sabotage' | 'crash' | 'trap' | 'shield' | 'win' | 'miss' | 'info';
  icon: string;
  headline: string;
  subline: string;
  actorPlayer: 1 | 2;
}

export interface RudolphLiveData {
  finalTarget: RudolphFinalTarget;
  chaosEnabled: boolean;
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
    isFrozen: false,
    hasShield: false,
    sabotagesLanded: 0,
    crashesCaused: 0,
    sabotagedThisTurn: false,
  };
}

export function cloneRudolphPlayerState(s: RudolphPlayerState): RudolphPlayerState {
  return {
    completedSteps: s.completedSteps ?? 0,
    dartsThrown: s.dartsThrown ?? 0,
    roundsPlayed: s.roundsPlayed ?? 0,
    bestTurnSteps: s.bestTurnSteps ?? 0,
    currentTurnDarts: Array.isArray(s.currentTurnDarts)
      ? s.currentTurnDarts.map((ev) => ({ ...ev }))
      : [],
    isFrozen: Boolean(s.isFrozen),
    hasShield: Boolean(s.hasShield),
    sabotagesLanded: s.sabotagesLanded ?? 0,
    crashesCaused: s.crashesCaused ?? 0,
    sabotagedThisTurn: Boolean(s.sabotagedThisTurn),
  };
}
