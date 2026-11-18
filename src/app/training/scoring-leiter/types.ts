export const SCORING_LEITER_LEVELS = [41, 60, 65, 80, 100, 120, 140] as const;
export const MAX_VISITS_PER_LEVEL = 10;
export const REQUIRED_HITS_PER_LEVEL = 2;

export const LEVEL_BASE_POINTS: Record<number, number> = {
  41: 10,
  60: 15,
  65: 20,
  80: 25,
  100: 35,
  120: 45,
  140: 60,
};

export interface ScoringLeiterLevelDetail {
  levelIndex: number;      // 0 bis 6
  target: number;          // 41, 60, 65, 80, 100, 120, 140
  visits: boolean[];       // true = geschafft (>= target), false = miss
  hits: number;            // Anzahl Treffer in dieser Stufe
  cleared: boolean;        // true wenn 2 Treffer erreicht
  eliminated: boolean;     // true wenn ausgeschieden (inkl. rechnerisches Aus)
  pointsEarned: number;    // Stufen-Basispunkte + Effizienz-Bonus
}

export interface ScoringLeiterSessionSavePayload {
  session_id: string;
  player_id?: number | null;
  player_name: string;
  opponent_name?: string | null;
  game_mode: 'solo' | '1vs1';
  highest_cleared_level: number;   // 0 wenn 41 nicht geschafft, sonst 41..140
  reached_level: number;           // Stufe, auf der das Spiel endete (41..140)
  levels_cleared_count: number;    // 0 bis 7
  total_score: number;             // Leiter-Score inkl. Effizienz-Bonus
  total_hits: number;
  total_visits: number;
  hit_quote: number;               // 0.0 .. 1.0
  is_winner: number;
  level_details: ScoringLeiterLevelDetail[];
  training_date: string;
}

export interface ScoringLeiterHistoryItem {
  id: number;
  session_id: string;
  player_name: string;
  opponent_name: string | null;
  game_mode: 'solo' | '1vs1';
  highest_cleared_level: number;
  reached_level: number;
  levels_cleared_count: number;
  total_score: number;
  total_hits: number;
  total_visits: number;
  hit_quote: number;
  is_winner: number;
  level_details: ScoringLeiterLevelDetail[];
  training_date: string;
  created_at: string;
}

/**
 * Berechnet die Punkte für eine abgeschlossene Stufe:
 * Basispunkte für die Stufe + Effizienz-Bonus (+1 Punkt pro eingesparter Aufnahme unter 10).
 */
export function calculateLevelPoints(target: number, visitsCount: number, cleared: boolean): number {
  if (!cleared) return 0;
  const base = LEVEL_BASE_POINTS[target] ?? 10;
  const efficiencyBonus = Math.max(0, MAX_VISITS_PER_LEVEL - visitsCount);
  return base + efficiencyBonus;
}
