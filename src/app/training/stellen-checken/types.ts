export interface StellenCheckenRoundDetail {
  round: number;            // 1 bis 15
  target: number;           // 3 bis 101
  pointsPossible: 1 | 2 | 3;
  checked: boolean;
  pointsEarned: number;     // 0, 1, 2 oder 3
}

export interface StellenCheckenPreset {
  id: number;               // 1 bis 200
  code: string;             // z.B. "#001" bis "#200"
  targets: number[];        // 15 Zahlen zwischen 3 und 101
  maxPoints: number;        // Summe der möglichen Punkte dieser 15 Zahlen
}

export interface StellenCheckenSessionSavePayload {
  session_id: string;
  player_id?: number | null;
  player_name: string;
  opponent_name?: string | null;
  game_mode: 'solo' | '1vs1';
  preset_id: number;
  points_scored: number;
  max_possible_points: number;
  checks_count: number;
  total_rounds: number;
  check_quote: number;
  is_winner: number;
  round_details: StellenCheckenRoundDetail[];
  training_date: string;
}

export interface StellenCheckenHistoryItem {
  id: number;
  session_id: string;
  player_name: string;
  opponent_name: string | null;
  game_mode: 'solo' | '1vs1';
  preset_id: number;
  points_scored: number;
  max_possible_points: number;
  checks_count: number;
  total_rounds: number;
  check_quote: number;
  is_winner: number;
  round_details: StellenCheckenRoundDetail[];
  training_date: string;
  created_at: string;
}

/**
 * Berechnet die Punktewertigkeit einer Zielzahl (3 bis 101):
 * - 3 bis 60 (inkl. direkte Doppel): 1 Punkt
 * - 61 bis 80: 2 Punkte
 * - 81 bis 101: 3 Punkte
 */
export function getPointsForTarget(target: number): 1 | 2 | 3 {
  if (target >= 81) return 3;
  if (target >= 61) return 2;
  return 1;
}

/**
 * Gibt eine farbliche Beschreibung & Kategorie-Bezeichnung für die Zielzahl zurück.
 */
export function getTargetTierInfo(target: number): {
  points: 1 | 2 | 3;
  label: string;
  badgeClass: string;
  glowClass: string;
} {
  const pts = getPointsForTarget(target);
  if (pts === 3) {
    return {
      points: 3,
      label: 'High Finish (81–101) • 3 Punkte',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
      glowClass: 'from-rose-500/25 via-purple-500/15 to-slate-900 border-rose-500/50',
    };
  }
  if (pts === 2) {
    return {
      points: 2,
      label: 'Mid Setup (61–80) • 2 Punkte',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
      glowClass: 'from-amber-500/25 via-yellow-500/10 to-slate-900 border-amber-500/50',
    };
  }
  const isDirectDouble = (target <= 40 && target % 2 === 0) || target === 50;
  return {
    points: 1,
    label: isDirectDouble
      ? 'Direktes Doppel / Basis (3–60) • 1 Punkt'
      : 'Basis-Stellen (3–60) • 1 Punkt',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    glowClass: 'from-emerald-500/25 via-teal-500/10 to-slate-900 border-emerald-500/50',
  };
}
