export const TANNENBAUM_BALL_NUMBERS = [20, 19, 18, 17, 16, 15, 14, 13, 12] as const;

export type TannenbaumBallNumber = (typeof TANNENBAUM_BALL_NUMBERS)[number];

export const TANNENBAUM_ROWS: readonly (readonly TannenbaumBallNumber[])[] = [
  [20, 19],
  [18, 17, 16],
  [15, 14, 13, 12],
];

export type TannenbaumStarTarget = 'BULL' | 'D20';

export type TannenbaumWinCondition = 'all_11' | 'majority_6';

export type TannenbaumNodeId =
  | 'STAR'
  | 'TRUNK'
  | '20'
  | '19'
  | '18'
  | '17'
  | '16'
  | '15'
  | '14'
  | '13'
  | '12';

export interface TannenbaumTreeState {
  balls: Record<TannenbaumBallNumber, boolean>;
  trunk: boolean;
  star: boolean;
}

export interface TannenbaumDartEvent {
  kind:
    | 'ball_lit'
    | 'ball_already_lit'
    | 'ball_blocked_single'
    | 'ball_stolen'
    | 'triple_extinguish'
    | 'triple_double_hit'
    | 'trunk_lit'
    | 'trunk_stolen'
    | 'trunk_already_lit'
    | 'star_lit'
    | 'star_stolen'
    | 'star_already_lit'
    | 'star_win'
    | 'miss';
  label: string;
  target?: TannenbaumNodeId;
  isTriple?: boolean;
  isDouble?: boolean;
  extinguishedOpponentBall?: TannenbaumBallNumber | null;
}

export interface TannenbaumPlayerState {
  tree: TannenbaumTreeState;
  dartsThrown: number;
  roundsPlayed: number;
  lightsLitCount: number;
  extinguishedCount: number;
  timesExtinguished: number;
  currentTurnDarts: TannenbaumDartEvent[];
}

export interface TannenbaumLastActionBanner {
  id: number;
  type: 'lit' | 'extinguish' | 'trunk' | 'star_unlocked' | 'win' | 'miss' | 'info';
  headline: string;
  subline: string;
  actorPlayer: 1 | 2;
  affectedNode?: TannenbaumNodeId;
}

export interface TannenbaumLiveData {
  tripleExtinguishEnabled: boolean;
  starTarget: TannenbaumStarTarget;
  winCondition?: TannenbaumWinCondition;
  roundNumber: number;
  p1: TannenbaumPlayerState;
  p2: TannenbaumPlayerState;
  lastAction?: TannenbaumLastActionBanner | null;
  winnerPlayer?: 1 | 2 | null;
  winnerName?: string | null;
}

export function createEmptyTree(): TannenbaumTreeState {
  return {
    balls: {
      20: false,
      19: false,
      18: false,
      17: false,
      16: false,
      15: false,
      14: false,
      13: false,
      12: false,
    },
    trunk: false,
    star: false,
  };
}

export function createInitialPlayerState(): TannenbaumPlayerState {
  return {
    tree: createEmptyTree(),
    dartsThrown: 0,
    roundsPlayed: 0,
    lightsLitCount: 0,
    extinguishedCount: 0,
    timesExtinguished: 0,
    currentTurnDarts: [],
  };
}

/**
 * Zählt alle Basis-Elemente am Baum (9 Christbaumkugeln + Baumstamm), Wert 0 bis 10.
 */
export function countLitBaseElements(tree: TannenbaumTreeState): number {
  let count = 0;
  for (const num of TANNENBAUM_BALL_NUMBERS) {
    if (tree.balls[num]) count += 1;
  }
  if (tree.trunk) count += 1;
  return count;
}

/**
 * Zählt sämtliche erleuchteten Elemente am Baum inklusive Stern, Wert 0 bis 11.
 */
export function countTotalLit(tree: TannenbaumTreeState): number {
  return countLitBaseElements(tree) + (tree.star ? 1 : 0);
}

/**
 * Prüft, ob alle 9 Kugeln und der Baumstamm brennen und der Stern zum Sieg freigeschaltet ist.
 */
export function isStarUnlocked(tree: TannenbaumTreeState): boolean {
  return countLitBaseElements(tree) === 10;
}

/**
 * Liefert die benötigte Anzahl erleuchteter Exklusiv-Elemente zum Sieg (6 von 11 oder 11 von 11).
 */
export function getRequiredLitToWin(
  winCondition: TannenbaumWinCondition,
  is1vs1: boolean
): number {
  return is1vs1 && winCondition === 'majority_6' ? 6 : 11;
}

/**
 * Prüft anhand der gewählten Siegbedingung, ob der Spieler den Tannenbaum gewonnen hat.
 */
export function hasPlayerWonTree(
  tree: TannenbaumTreeState,
  winCondition: TannenbaumWinCondition,
  is1vs1: boolean
): boolean {
  return countTotalLit(tree) >= getRequiredLitToWin(winCondition, is1vs1);
}

/**
 * Erstellt eine tiefe Kopie des Spielerstatus für unveränderliche Updates und den Undo-Verlauf.
 */
export function clonePlayerState(s: TannenbaumPlayerState): TannenbaumPlayerState {
  return {
    tree: {
      balls: { ...s.tree.balls },
      trunk: s.tree.trunk,
      star: s.tree.star,
    },
    dartsThrown: s.dartsThrown,
    roundsPlayed: s.roundsPlayed,
    lightsLitCount: s.lightsLitCount,
    extinguishedCount: s.extinguishedCount,
    timesExtinguished: s.timesExtinguished,
    currentTurnDarts: s.currentTurnDarts.map((ev) => ({ ...ev })),
  };
}
