export type ComputerDifficulty = 
  | 'kreisliga'
  | 'bezirksliga'
  | 'landesliga'
  | 'bundesliga'
  | 'pdc_pro';

export interface DifficultyConfig {
  id: ComputerDifficulty;
  name: string;
  badge: string;
  description: string;
  bullChance: number;   // z.B. 0.10 für 10%
  doubleChance: number; // z.B. 0.10 für 10%
  color: string;
}

export const DIFFICULTY_CONFIGS: Record<ComputerDifficulty, DifficultyConfig> = {
  kreisliga: {
    id: 'kreisliga',
    name: 'Kreisliga',
    badge: '⚽ Stufe 1',
    description: 'Kicken mit Freunden • Einsteiger',
    bullChance: 0.10,
    doubleChance: 0.10,
    color: 'from-emerald-700 to-green-800 border-green-600'
  },
  bezirksliga: {
    id: 'bezirksliga',
    name: 'Bezirksliga',
    badge: '⚽ Stufe 2',
    description: 'Solider Vereinsspieler • Hobbyniveau',
    bullChance: 0.20,
    doubleChance: 0.20,
    color: 'from-blue-700 to-cyan-800 border-cyan-600'
  },
  landesliga: {
    id: 'landesliga',
    name: 'Landesliga',
    badge: '⚽ Stufe 3',
    description: 'Erfahrener Ligaspieler • Gefährlich am Board',
    bullChance: 0.35,
    doubleChance: 0.30,
    color: 'from-amber-700 to-yellow-800 border-amber-600'
  },
  bundesliga: {
    id: 'bundesliga',
    name: 'Bundesliga',
    badge: '⚽ Stufe 4',
    description: 'Scharfschütze • Konstante Treffer',
    bullChance: 0.50,
    doubleChance: 0.45,
    color: 'from-purple-700 to-indigo-800 border-purple-600'
  },
  pdc_pro: {
    id: 'pdc_pro',
    name: 'PDC Pro',
    badge: '⚽ Stufe 5',
    description: 'Weltklasse-Profi • Eiskalt vor dem Tor',
    bullChance: 0.70,
    doubleChance: 0.60,
    color: 'from-rose-700 to-red-800 border-rose-600'
  }
};

export interface FussballSessionSavePayload {
  session_id: string;
  player_id?: number | null;
  player_name: string;
  opponent_name: string;
  is_computer: number;
  computer_level?: string | null;
  game_mode: string;
  target_goals: number;
  goals_scored: number;
  goals_conceded: number;
  darts_thrown: number;
  bull_hits: number;
  bull_attempts: number;
  double_hits: number;
  double_attempts: number;
  is_winner: number;
  training_date: string;
}
