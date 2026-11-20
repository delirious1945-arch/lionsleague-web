export const BINGO_WIN_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export interface BingoCell {
  id: string;
  icon: string;
  label: string;
  shortHint: string;
  stamped: boolean;
  stampedInRound: number | null;
}

export interface BingoPlayerState {
  cells: BingoCell[]; // Immer genau 9 Felder (3x3)
  roundsPlayed: number;
  stampsCount: number;
  hasBingo: boolean;
  winningLine: number[] | null;
}

export interface BingoLastActionBanner {
  id: number;
  tone: 'stamp' | 'alarm' | 'bingo' | 'miss' | 'info';
  icon: string;
  headline: string;
  subline: string;
  actorPlayer: 1 | 2;
}

export interface BingoLiveData {
  sharedCardMode: boolean;
  roundNumber: number;
  p1: BingoPlayerState;
  p2: BingoPlayerState;
  lastAction?: BingoLastActionBanner | null;
  winnerPlayer?: 1 | 2 | null;
  winnerName?: string | null;
}

interface BingoPoolItem {
  id: string;
  icon: string;
  label: string;
  shortHint: string;
}

export const OUTER_BINGO_POOL: BingoPoolItem[] = [
  { id: 'num_20', icon: '🎯', label: 'Zahl 20', shortHint: 'S / D / T 20' },
  { id: 'num_19', icon: '🎯', label: 'Zahl 19', shortHint: 'S / D / T 19' },
  { id: 'num_18', icon: '🎯', label: 'Zahl 18', shortHint: 'S / D / T 18' },
  { id: 'num_17', icon: '🎯', label: 'Zahl 17', shortHint: 'S / D / T 17' },
  { id: 'num_16', icon: '🎯', label: 'Zahl 16', shortHint: 'S / D / T 16' },
  { id: 'any_double', icon: '💍', label: 'Beliebiges Doppel', shortHint: 'D1 – D20' },
  { id: 'any_triple', icon: '🔥', label: 'Beliebiges Triple', shortHint: 'T1 – T20' },
  { id: 'red_seg', icon: '🔴', label: 'Rotes Segment', shortHint: 'Rot (D/T/DBull)' },
  { id: 'green_seg', icon: '🟢', label: 'Grünes Segment', shortHint: 'Grün (D/T/25)' },
  { id: 'score_60', icon: '💥', label: 'Aufnahme ≥ 60', shortHint: '3-Dart-Summe 60+' },
  { id: 'neighbor_1_5', icon: '🧭', label: 'Nachbar 1 oder 5', shortHint: '1 oder 5 treffen' },
  { id: 'even_low', icon: '🔢', label: 'Gerade Zahl', shortHint: '2 bis 14 gerade' },
  { id: 'under_10', icon: '❄️', label: 'Zahl ≤ 10', shortHint: '1 bis 10 treffen' },
];

const CENTER_BULL_ITEM: BingoPoolItem = {
  id: 'center_bull',
  icon: '🐂',
  label: 'BULL (25 / 50)',
  shortHint: 'Single oder Double Bull',
};

/**
 * Erstellt eine 3x3 Bingo-Karte: 8 gemischte Felder aus OUTER_BINGO_POOL außen + BULL im Zentrum (Index 4).
 */
export function createBingoCard(): BingoCell[] {
  const pool = OUTER_BINGO_POOL.map((item) => ({ ...item }));
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }

  const chosenOuter = pool.slice(0, 8);
  const fullItems: BingoPoolItem[] = [
    chosenOuter[0],
    chosenOuter[1],
    chosenOuter[2],
    chosenOuter[3],
    CENTER_BULL_ITEM,
    chosenOuter[4],
    chosenOuter[5],
    chosenOuter[6],
    chosenOuter[7],
  ];

  return fullItems.map((item) => ({
    id: item.id,
    icon: item.icon,
    label: item.label,
    shortHint: item.shortHint,
    stamped: false,
    stampedInRound: null,
  }));
}

export function cloneBingoCells(cells: BingoCell[]): BingoCell[] {
  return cells.map((c) => ({ ...c }));
}

export function createInitialBingoPlayerState(cells: BingoCell[]): BingoPlayerState {
  return {
    cells: cloneBingoCells(cells),
    roundsPlayed: 0,
    stampsCount: 0,
    hasBingo: false,
    winningLine: null,
  };
}

export function cloneBingoPlayerState(s: BingoPlayerState): BingoPlayerState {
  return {
    cells: cloneBingoCells(s.cells),
    roundsPlayed: s.roundsPlayed,
    stampsCount: s.stampsCount,
    hasBingo: s.hasBingo,
    winningLine: s.winningLine ? [...s.winningLine] : null,
  };
}

/**
 * Prüft alle 8 Linien und liefert die Indizes der ersten vollständigen 3er-Reihe oder null.
 */
export function findWinningLine(cells: BingoCell[]): number[] | null {
  if (!Array.isArray(cells) || cells.length !== 9) return null;
  for (const [a, b, c] of BINGO_WIN_LINES) {
    if (cells[a]?.stamped && cells[b]?.stamped && cells[c]?.stamped) {
      return [a, b, c];
    }
  }
  return null;
}

/**
 * Liefert alle ungestempelten Zell-Indizes, mit denen der Spieler sofort ein Bingo vollenden würde.
 */
export function findAlmostBingoIndices(cells: BingoCell[]): number[] {
  if (!Array.isArray(cells) || cells.length !== 9) return [];
  if (findWinningLine(cells) !== null) return [];

  const result = new Set<number>();
  for (const [a, b, c] of BINGO_WIN_LINES) {
    const trio = [a, b, c];
    const stampedCount = trio.filter((idx) => cells[idx]?.stamped).length;
    if (stampedCount === 2) {
      for (const idx of trio) {
        if (!cells[idx]?.stamped) {
          result.add(idx);
        }
      }
    }
  }
  return Array.from(result);
}
