export const ADVENTS_DOOR_NUMBERS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
] as const;

export type AdventsDoorNumber = (typeof ADVENTS_DOOR_NUMBERS)[number];

export type AdventsCurseType =
  | 'wrong_hand'
  | 'two_darts'
  | 'one_dart'
  | 'sitting'
  | 'skip_round'
  | 'spin_360';

export type AdventsRewardKind =
  // Punkte
  | 'points_25'
  | 'points_35'
  | 'points_40'
  | 'points_50'
  | 'points_55'
  | 'points_65'
  | 'points_75'
  | 'bell_bless_30'
  | 'bell_bless_45'
  | 'double_star'
  // Interaktion / Steal
  | 'steal_25'
  | 'steal_50'
  | 'grinch_swap'
  | 'roulette_duel'
  | 'shield_angel'
  // Flüche / Bestrafungen
  | 'curse_wrong_hand'
  | 'curse_two_darts'
  | 'curse_one_dart'
  | 'curse_sitting'
  | 'curse_skip_round'
  | 'curse_spin_360'
  // Fallen & Nieten
  | 'grinch_trap_30'
  | 'grinch_trap_50'
  | 'niete_0'
  // Legacy / Solo
  | 'points_30'
  | 'points_60'
  | 'bell_bless_35'
  | 'solo_gamble'
  | 'solo_bonus_45';

export interface AdventsDoorReward {
  kind: AdventsRewardKind;
  icon: string;
  title: string;
  shortBadge: string;
  tone: 'good' | 'jackpot' | 'grinch' | 'curse' | 'niete';
}

export interface AdventsDoorState {
  number: AdventsDoorNumber;
  isOpen: boolean;
  openedBy: 1 | 2 | null;
  openedInRound: number | null;
  reward: AdventsDoorReward;
}

export interface AdventsDartEvent {
  kind: 'door_opened' | 'door_empty' | 'miss';
  doorNumber?: AdventsDoorNumber;
  label: string;
  subLabel: string;
  tone: 'good' | 'jackpot' | 'grinch' | 'curse' | 'niete' | 'miss';
}

export interface AdventsPlayerState {
  score: number;
  doorsOpened: number;
  dartsThrown: number;
  roundsPlayed: number;
  grinchHits: number;
  shieldsCount?: number;
  activeCurses: AdventsCurseType[];
  pendingCurses: AdventsCurseType[];
  currentTurnDarts: AdventsDartEvent[];
}

export interface AdventsLastActionBanner {
  id: number;
  doorNumber?: AdventsDoorNumber | null;
  tone: 'good' | 'jackpot' | 'grinch' | 'curse' | 'niete' | 'miss' | 'win' | 'info';
  icon: string;
  headline: string;
  subline: string;
  actorPlayer: 1 | 2;
}

export interface AdventsLiveData {
  maxRounds: number | null;
  roundNumber: number;
  isSuddenDeath: boolean;
  doors: AdventsDoorState[];
  p1: AdventsPlayerState;
  p2: AdventsPlayerState;
  lastAction?: AdventsLastActionBanner | null;
  winnerPlayer?: 1 | 2 | 'draw' | null;
  winnerName?: string | null;
}

const DUEL_REWARD_POOL: AdventsDoorReward[] = [
  // 10x Punkte & Boni
  { kind: 'points_25', icon: '🍫', title: 'Schoko-Nikolaus', shortBadge: '+25', tone: 'good' },
  { kind: 'points_35', icon: '🍪', title: 'Zimtstern-Teller', shortBadge: '+35', tone: 'good' },
  { kind: 'points_40', icon: '🥐', title: 'Vanillekipferl', shortBadge: '+40', tone: 'good' },
  { kind: 'points_50', icon: '🎁', title: 'Weihnachtsgeschenk', shortBadge: '+50', tone: 'good' },
  { kind: 'points_55', icon: '🧸', title: 'Wichtel-Überraschung', shortBadge: '+55', tone: 'good' },
  { kind: 'points_65', icon: '🍷', title: 'Heißer Glühwein', shortBadge: '+65', tone: 'jackpot' },
  { kind: 'points_75', icon: '🛷', title: 'Rentier-Schlitten', shortBadge: '+75', tone: 'jackpot' },
  { kind: 'bell_bless_30', icon: '🔔', title: 'Glöckchen-Segen I', shortBadge: '+30 · HEILT', tone: 'good' },
  { kind: 'bell_bless_45', icon: '🔔', title: 'Glöckchen-Segen II', shortBadge: '+45 · HEILT', tone: 'good' },
  { kind: 'double_star', icon: '🌟', title: 'Weihnachtsstern', shortBadge: '×2 PUNKTE', tone: 'jackpot' },
  // 5x Steal, Tausch & Schutz
  { kind: 'steal_25', icon: '🎅', title: 'Wichtel-Dieb', shortBadge: 'KLAUT 25', tone: 'good' },
  { kind: 'steal_50', icon: '🧳', title: 'Geschenke-Räuber', shortBadge: 'KLAUT 50', tone: 'good' },
  { kind: 'grinch_swap', icon: '👹', title: 'DER GRINCH!', shortBadge: '⇄ TAUSCH!', tone: 'grinch' },
  { kind: 'roulette_duel', icon: '🎲', title: 'Wichtel-Roulette', shortBadge: '+60 / -30', tone: 'grinch' },
  { kind: 'shield_angel', icon: '🛡️', title: 'Schutz-Engel', shortBadge: '2× SCHILD', tone: 'good' },
  // 6x Flüche & Bestrafungen
  { kind: 'curse_wrong_hand', icon: '🧦', title: 'Knecht Ruprecht', shortBadge: 'FALSCHE HAND', tone: 'curse' },
  { kind: 'curse_two_darts', icon: '❄️', title: 'Schneesturm', shortBadge: 'NUR 2 DARTS', tone: 'curse' },
  { kind: 'curse_one_dart', icon: '🎯', title: 'Einarmiger Bandit', shortBadge: 'NUR 1 DART!', tone: 'curse' },
  { kind: 'curse_sitting', icon: '🪑', title: 'Opa Hoppenstedt', shortBadge: 'IM SITZEN!', tone: 'curse' },
  { kind: 'curse_skip_round', icon: '⛄', title: 'In der Schneewehe', shortBadge: 'AUSSETZEN!', tone: 'curse' },
  { kind: 'curse_spin_360', icon: '🌪️', title: 'Glühwein-Drehwurm', shortBadge: '360° DREHUNG', tone: 'curse' },
  // 3x Fallen & Nieten
  { kind: 'grinch_trap_30', icon: '😈', title: 'Kleine Grinch-Falle', shortBadge: '-30 PKT', tone: 'grinch' },
  { kind: 'grinch_trap_50', icon: '🥶', title: 'Eiszapfen-Schock', shortBadge: '-50 PKT', tone: 'grinch' },
  { kind: 'niete_0', icon: '🔥', title: 'Verbrannte Plätzchen', shortBadge: '0 PKT NIETE', tone: 'niete' },
];

const SOLO_REWARD_POOL: AdventsDoorReward[] = [
  // 10x Punkte & Boni
  { kind: 'points_25', icon: '🍫', title: 'Schoko-Nikolaus', shortBadge: '+25', tone: 'good' },
  { kind: 'points_35', icon: '🍪', title: 'Zimtstern-Teller', shortBadge: '+35', tone: 'good' },
  { kind: 'points_40', icon: '🥐', title: 'Vanillekipferl', shortBadge: '+40', tone: 'good' },
  { kind: 'points_50', icon: '🎁', title: 'Weihnachtsgeschenk', shortBadge: '+50', tone: 'good' },
  { kind: 'points_55', icon: '🧸', title: 'Wichtel-Überraschung', shortBadge: '+55', tone: 'good' },
  { kind: 'points_65', icon: '🍷', title: 'Heißer Glühwein', shortBadge: '+65', tone: 'jackpot' },
  { kind: 'points_75', icon: '🛷', title: 'Rentier-Schlitten', shortBadge: '+75', tone: 'jackpot' },
  { kind: 'bell_bless_30', icon: '🔔', title: 'Glöckchen-Segen I', shortBadge: '+30 · HEILT', tone: 'good' },
  { kind: 'bell_bless_45', icon: '🔔', title: 'Glöckchen-Segen II', shortBadge: '+45 · HEILT', tone: 'good' },
  { kind: 'double_star', icon: '🌟', title: 'Weihnachtsstern', shortBadge: '×2 PUNKTE', tone: 'jackpot' },
  // 5x Solo-Boni / Gamble
  { kind: 'solo_bonus_45', icon: '🎅', title: 'Nikolaus-Stiefel', shortBadge: '+45 PKT', tone: 'good' },
  { kind: 'points_50', icon: '🧳', title: 'Goldener Sack', shortBadge: '+50 PKT', tone: 'good' },
  { kind: 'solo_gamble', icon: '🎲', title: 'Grinch-Roulette', shortBadge: '½ ODER +80', tone: 'grinch' },
  { kind: 'points_65', icon: '🎄', title: 'Lions Tannenbaum', shortBadge: '+65 PKT', tone: 'jackpot' },
  { kind: 'shield_angel', icon: '🛡️', title: 'Schutz-Engel', shortBadge: '2× SCHILD', tone: 'good' },
  // 6x Flüche & Bestrafungen
  { kind: 'curse_wrong_hand', icon: '🧦', title: 'Knecht Ruprecht', shortBadge: 'FALSCHE HAND', tone: 'curse' },
  { kind: 'curse_two_darts', icon: '❄️', title: 'Schneesturm', shortBadge: 'NUR 2 DARTS', tone: 'curse' },
  { kind: 'curse_one_dart', icon: '🎯', title: 'Einarmiger Bandit', shortBadge: 'NUR 1 DART!', tone: 'curse' },
  { kind: 'curse_sitting', icon: '🪑', title: 'Opa Hoppenstedt', shortBadge: 'IM SITZEN!', tone: 'curse' },
  { kind: 'curse_skip_round', icon: '⛄', title: 'In der Schneewehe', shortBadge: 'AUSSETZEN!', tone: 'curse' },
  { kind: 'curse_spin_360', icon: '🌪️', title: 'Glühwein-Drehwurm', shortBadge: '360° DREHUNG', tone: 'curse' },
  // 3x Fallen & Nieten
  { kind: 'grinch_trap_30', icon: '😈', title: 'Kleine Grinch-Falle', shortBadge: '-30 PKT', tone: 'grinch' },
  { kind: 'grinch_trap_50', icon: '🥶', title: 'Eiszapfen-Schock', shortBadge: '-50 PKT', tone: 'grinch' },
  { kind: 'niete_0', icon: '🔥', title: 'Verbrannte Plätzchen', shortBadge: '0 PKT NIETE', tone: 'niete' },
];

/**
 * Gibt das Dart-Ziel für das jeweilige Türchen 1..24 zurück.
 */
export function getDoorTargetLabel(doorNum: AdventsDoorNumber): {
  label: string;
  subLabel: string;
  isSpecial: boolean;
} {
  if (doorNum <= 20) {
    return {
      label: String(doorNum),
      subLabel: 'Single / D / T',
      isSpecial: false,
    };
  }
  if (doorNum === 21) {
    return {
      label: 'DOPPEL',
      subLabel: 'Beliebiges D',
      isSpecial: true,
    };
  }
  if (doorNum === 22) {
    return {
      label: 'TRIPLE',
      subLabel: 'Beliebiges T',
      isSpecial: true,
    };
  }
  if (doorNum === 23) {
    return {
      label: 'BULL 25',
      subLabel: 'Single Bull',
      isSpecial: true,
    };
  }
  return {
    label: 'BULL 50',
    subLabel: 'Bullseye / D20',
    isSpecial: true,
  };
}

/**
 * Mischt das 12er-Deck mit Fisher-Yates und ordnet jedem Türchen 1..12 zufällig eine Überraschung zu.
 */
export function createShuffledDoors(mode: '1vs1' | 'solo'): AdventsDoorState[] {
  const pool = (mode === 'solo' ? SOLO_REWARD_POOL : DUEL_REWARD_POOL).map((r) => ({ ...r }));
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }

  return ADVENTS_DOOR_NUMBERS.map((num, idx) => ({
    number: num,
    isOpen: false,
    openedBy: null,
    openedInRound: null,
    reward: pool[idx],
  }));
}

export function createInitialAdventsPlayerState(): AdventsPlayerState {
  return {
    score: 0,
    doorsOpened: 0,
    dartsThrown: 0,
    roundsPlayed: 0,
    grinchHits: 0,
    shieldsCount: 0,
    activeCurses: [],
    pendingCurses: [],
    currentTurnDarts: [],
  };
}

export function cloneAdventsPlayerState(s: AdventsPlayerState): AdventsPlayerState {
  return {
    score: s.score,
    doorsOpened: s.doorsOpened,
    dartsThrown: s.dartsThrown,
    roundsPlayed: s.roundsPlayed,
    grinchHits: s.grinchHits,
    shieldsCount: s.shieldsCount ?? 0,
    activeCurses: [...s.activeCurses],
    pendingCurses: [...s.pendingCurses],
    currentTurnDarts: s.currentTurnDarts.map((ev) => ({ ...ev })),
  };
}

export function cloneDoors(doors: AdventsDoorState[]): AdventsDoorState[] {
  return doors.map((d) => ({
    number: d.number,
    isOpen: d.isOpen,
    openedBy: d.openedBy,
    openedInRound: d.openedInRound,
    reward: { ...d.reward },
  }));
}

export function countOpenDoors(doors: AdventsDoorState[]): number {
  let count = 0;
  for (const d of doors) {
    if (d.isOpen) count += 1;
  }
  return count;
}
