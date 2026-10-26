export type UnifiedTvViewMode = 'both' | 'doppelquote' | 'pdc' | 'fussball' | 'stellen_checken' | 'archive';

export type UnifiedTvTimeframe = 'today' | 'month' | 'all' | 'archive';

export interface TvDoppelquoteRow {
  session_id: string;
  player_name: string;
  attempt_nr: number;
  attempt_label: string;
  time_label: string;
  total_hits: number;
  total_darts: number;
  quote_percent: number;
  best_double: string;
  rank: number;
  isShared: boolean;
  d20_quote: number;
  d10_quote: number;
  d16_quote: number;
  d8_quote: number;
  d4_quote: number;
  opponent_name?: string | null;
}

export interface TvPdcRow {
  session_id: string;
  player_name: string;
  attempt_nr: number;
  attempt_label: string;
  time_label: string;
  best_score: number;
  score_part1: number;
  score_part2: number;
  score_part3: number;
  best_badge: string;
  total_shanghais: number;
  best_doubles_hit: number;
  rank: number;
  isShared: boolean;
  opponent_name?: string | null;
}

export interface TvFussballRow {
  player_name: string;
  matches_count: number;
  wins: number;
  losses: number;
  win_rate: number;
  goals_scored: number;
  goals_conceded: number;
  goal_diff: number;
  bull_hits: number;
  bull_attempts: number;
  bull_quote: number;
  double_hits: number;
  double_attempts: number;
  double_quote: number;
  darts_thrown: number;
  rank: number;
  isShared: boolean;
  last_time: string;
}

export interface TvFussballMatch {
  id: string;
  session_id: string;
  player1_name: string;
  player2_name: string;
  player1_goals: number;
  player2_goals: number;
  winner_name: string;
  darts_thrown: number;
  time_label: string;
}

export interface TvStellenCheckenRow {
  session_id: string;
  player_name: string;
  opponent_name?: string | null;
  game_mode: 'solo' | '1vs1';
  preset_id: number;
  attempt_nr: number;
  attempt_label: string;
  time_label: string;
  points_scored: number;
  max_possible_points: number;
  checks_count: number;
  total_rounds: number;
  quote_percent: number;
  rank: number;
  isShared: boolean;
}

export interface ArchiveTrainingDaySummary {
  dateStr: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Donnerstag, 22. Okt."
  totalSessions: number;
  uniquePlayersCount: number;
  gamesList: ('doppelquote' | 'pdc' | 'fussball' | 'stellen_checken')[];
}

export interface ArchiveDayDetail {
  dateStr: string;
  fullDateLabel: string;
  totalSessions: number;
  activePlayers: string[];
  doppelGames: {
    id: string;
    playerName: string;
    opponentName?: string | null;
    hits: number;
    darts: number;
    quotePercent: number;
    bestDouble: string;
    time: string;
  }[];
  pdcGames: {
    id: string;
    playerName: string;
    opponentName?: string | null;
    score: number;
    badge: string;
    shanghais: number;
    doubles: number;
    time: string;
  }[];
  fussballGames: {
    id: string;
    playerName: string;
    opponentName: string;
    isWinner: boolean;
    goalsScored: number;
    goalsConceded: number;
    dartsThrown: number;
    time: string;
  }[];
  stellenCheckenGames: {
    id: string;
    playerName: string;
    opponentName?: string | null;
    gameMode: string;
    presetId: number;
    pointsScored: number;
    maxPossiblePoints: number;
    checksCount: number;
    totalRounds: number;
    quotePercent: number;
    time: string;
  }[];
}

export interface UnifiedTvBoardData {
  timeframe: UnifiedTvTimeframe;
  selectedDateStr: string; // YYYY-MM-DD
  monthLabel: string;
  todayDoppelLeaderboard: TvDoppelquoteRow[];
  todayPdcLeaderboard: TvPdcRow[];
  todayFussballLeaderboard: TvFussballRow[];
  todayFussballMatches: TvFussballMatch[];
  todayStellenCheckenLeaderboard: TvStellenCheckenRow[];
  hasTodayData: boolean;
  hasMonthData: boolean;
  availableArchiveDays: ArchiveTrainingDaySummary[];
  currentArchiveDayDetail?: ArchiveDayDetail | null;
  lastUpdate: string;
}
