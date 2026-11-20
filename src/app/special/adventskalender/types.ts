export const ADVENTS_DOOR_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export type AdventsDoorNumber = (typeof ADVENTS_DOOR_NUMBERS)[number];

export type AdventsCurseType = 'wrong_hand' | 'two_darts';

export type AdventsRewardKind =
  | 'points_30'
  | 'points_40'
  | 'points_50'
  | 'points_60'
  | 'steal_25'
  | 'bell_bless_35'
  | 'double_star'
  | 'grinch_swap'
  | 'grinch_trap_30'
  | 'curse_wrong_hand'
  | 'curse_two_darts'
  | 'niete_0'
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
  { kind: 'points_30', icon: '🍫', title: 'Schoko-Nikolaus', shortBadge: '+30', tone: 'good' },
  { kind: 'points_40', icon: '🍪', title: 'Zimtstern-Teller', shortBadge: '+40', tone: 'good' },
  { kind: 'points_50', icon: '🎁', title: 'Weihnachtsgeschenk', shortBadge: '+50', tone: 'good' },
  { kind: 'points_60', icon: '🍷', title: 'Heißer Glühwein', shortBadge: '+60', tone: 'jackpot' },
  { kind: 'steal_25', icon: '🎅', title: 'Wichtel-Dieb', shortBadge: 'KLAUT 25', tone: 'good' },
  { kind: 'bell_bless_35', icon: '🔔', title: 'Glöckchen-Segen', shortBadge: '+35 · HEILT', tone: 'good' },
  { kind: 'double_star', icon: '🌟', title: 'Weihnachtsstern', shortBadge: '×2 PUNKTE', tone: 'jackpot' },
  { kind: 'grinch_swap', icon: '👹', title: 'DER GRINCH!', shortBadge: '⇄ TAUSCH!', tone: 'grinch' },
  { kind: 'grinch_trap_30', icon: '😈', title: 'Grinch-Falle', shortBadge: '-30 PKT', tone: 'grinch' },
  { kind: 'curse_wrong_hand', icon: '🧦', title: 'Knecht Ruprecht', shortBadge: 'FALSCHE HAND', tone: 'curse' },
  { kind: 'curse_two_darts', icon: '❄️', title: 'Schneesturm', shortBadge: 'NUR 2 DARTS', tone: 'curse' },
  { kind: 'niete_0', icon: '🔥', title: 'Verbrannte Plätzchen', shortBadge: '0 PKT NIETE', tone: 'niete' },
];

const SOLO_REWARD_POOL: AdventsDoorReward[] = [
  { kind: 'points_30', icon: '🍫', title: 'Schoko-Nikolaus', shortBadge: '+30', tone: 'good' },
  { kind: 'points_40', icon: '🍪', title: 'Zimtstern-Teller', shortBadge: '+40', tone: 'good' },
  { kind: 'points_50', icon: '🎁', title: 'Weihnachtsgeschenk', shortBadge: '+50', tone: 'good' },
  { kind: 'points_60', icon: '🍷', title: 'Heißer Glühwein', shortBadge: '+60', tone: 'jackpot' },
  { kind: 'solo_bonus_45', icon: '🎅', title: 'Nikolaus-Stiefel', shortBadge: '+45', tone: 'good' },
  { kind: 'bell_bless_35', icon: '🔔', title: 'Glöckchen-Segen', shortBadge: '+35 · HEILT', tone: 'good' },
  { kind: 'double_star', icon: '🌟', title: 'Weihnachtsstern', shortBadge: '×2 PUNKTE', tone: 'jackpot' },
  { kind: 'solo_gamble', icon: '🎲', title: 'Grinch-Roulette', shortBadge: '½ ODER +80', tone: 'grinch' },
  { kind: 'grinch_trap_30', icon: '😈', title: 'Grinch-Falle', shortBadge: '-30 PKT', tone: 'grinch' },
  { kind: 'curse_wrong_hand', icon: '🧦', title: 'Knecht Ruprecht', shortBadge: 'FALSCHE HAND', tone: 'curse' },
  { kind: 'curse_two_darts', icon: '❄️', title: 'Schneesturm', shortBadge: 'NUR 2 DARTS', tone: 'curse' },
  { kind: 'niete_0', icon: '🔥', title: 'Verbrannte Plätzchen', shortBadge: '0 PKT NIETE', tone: 'niete' },
];

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
