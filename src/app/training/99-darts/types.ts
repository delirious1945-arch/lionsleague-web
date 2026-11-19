export const DARTS_99_TARGETS = [20, 19, 18] as const;
export type Darts99Target = (typeof DARTS_99_TARGETS)[number];

export const TOTAL_DARTS_99 = 99;
export const TOTAL_ROUNDS_99 = 33;
export const MAX_POINTS_99 = 297;

export type DartHitValue = 0 | 1 | 2 | 3;

export interface Darts99RoundDetail {
  round: number; // 1 bis 33
  darts: DartHitValue[]; // 3 Darts je Aufnahme
  points: number; // Summe 0 bis 9
}

export interface Darts99SessionSavePayload {
  session_id: string;
  player_id?: number | null;
  player_name: string;
  opponent_name?: string | null;
  game_mode: 'solo' | '1vs1';
  target_number: Darts99Target;
  total_points: number;
  total_darts: number;
  total_hits: number;
  singles_count: number;
  doubles_count: number;
  triples_count: number;
  misses_count: number;
  hit_quote: number; // 0.0 bis 1.0
  points_per_dart: number; // 0.0 bis 3.0
  is_winner: number;
  round_details: Darts99RoundDetail[];
  training_date: string;
}

export interface Darts99HistoryItem {
  id: number;
  session_id: string;
  player_name: string;
  opponent_name: string | null;
  game_mode: 'solo' | '1vs1';
  target_number: Darts99Target;
  total_points: number;
  total_darts: number;
  total_hits: number;
  singles_count: number;
  doubles_count: number;
  triples_count: number;
  misses_count: number;
  hit_quote: number;
  points_per_dart: number;
  is_winner: number;
  round_details: Darts99RoundDetail[];
  training_date: string;
  created_at: string;
}

export interface Darts99LivePlayerStats {
  totalPoints: number;
  dartsThrown: number;
  currentRound: number;
  currentTurnDarts: DartHitValue[];
  singles: number;
  doubles: number;
  triples: number;
  misses: number;
  hitQuote: number;
  pointsPerDart: number;
  finished: boolean;
}

/**
 * Zerlegt eine eingegebene 3-Dart-Aufnahmensumme (0 bis 9 Punkte)
 * deterministisch in 3 gültige Dart-Werte (0 = Miss, 1 = Single, 2 = Double, 3 = Triple).
 */
export function decomposeRoundPointsToDarts(
  points: number
): [DartHitValue, DartHitValue, DartHitValue] {
  const clamped = Math.max(0, Math.min(9, Math.round(points)));
  switch (clamped) {
    case 0:
      return [0, 0, 0];
    case 1:
      return [1, 0, 0];
    case 2:
      return [1, 1, 0];
    case 3:
      return [1, 1, 1];
    case 4:
      return [3, 1, 0];
    case 5:
      return [3, 1, 1];
    case 6:
      return [3, 3, 0];
    case 7:
      return [3, 3, 1];
    case 8:
      return [3, 3, 2];
    case 9:
    default:
      return [3, 3, 3];
  }
}
