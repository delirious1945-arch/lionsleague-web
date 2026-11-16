import { sql } from './db';
import {
  calculateMatchPerformance,
  getShortName,
  Settings,
} from './scoring';

export interface Player {
  id: number;
  name: string;
  team: string;
  role: string;
  estimated_double_quote?: number | null;
}

export interface MatchRow {
  id: number;
  player_id: number;
  match_date: string;
  opponent: string;
  legs_won: number;
  legs_lost: number;
  avg_total: number;
  avg_9: number;
  avg_18: number;
  scores_80: number;
  scores_100: number;
  scores_140: number;
  scores_180: number;
  high_finishes: number;
  short_legs: number;
  specials_count: number;
  season: string;
  team: string;
  player_name: string;
  player_team: string;
}

export interface DoublesMatchRow {
  id: number;
  player1_id: number;
  player2_id: number;
  match_date: string;
  opponent: string;
  legs_won: number;
  legs_lost: number;
  avg_total: number;
  avg_9: number;
  avg_18: number;
  scores_80: number;
  scores_100: number;
  scores_140: number;
  scores_180: number;
  high_finishes: number;
  short_legs: number;
  specials_count: number;
  season: string;
  team: string;
  p1_name: string;
  player_team: string;
  p2_name: string;
  player1_darts?: number | null;
  player2_darts?: number | null;
  player1_avg?: number | null;
  player2_avg?: number | null;
  player1_first9_avg?: number | null;
  player2_first9_avg?: number | null;
  player1_scores_80?: number | null;
  player2_scores_80?: number | null;
  player1_scores_100?: number | null;
  player2_scores_100?: number | null;
  player1_scores_140?: number | null;
  player2_scores_140?: number | null;
  player1_scores_180?: number | null;
  player2_scores_180?: number | null;
  player1_checkouts?: number | null;
  player2_checkouts?: number | null;
}

export interface DoublesSpecialRow {
  id: number;
  player_id: number;
  partner_name: string;
  opponent_team: string;
  match_date: string;
  special_type: string;
  description: string;
  season: string;
  player_name: string;
  team: string;
}

export type PlayerSpecialCategory =
  | '180'
  | 'high_score'
  | 'high_finish'
  | 'short_leg'
  | 'other';

export interface PlayerSpecialItem {
  id: string;
  player_name: string;
  team: string;
  match_date: string; // YYYY-MM-DD
  formatted_date: string; // DD.MM.YYYY
  mode: 'Einzel' | 'Doppel';
  partner_name?: string;
  opponent: string;
  category: PlayerSpecialCategory;
  badge_label: string;
  value_label: string;
  description: string;
  bonus_points: number;
}

export interface Top26Player {
  player_id: number;
  player_name: string;
  team: string;
  count_26: number;
}

export interface LeaderboardEntry {
  rank: number;
  player_name: string;
  team: string;
  match_count: number;
  wins: number;
  legs_won: number;
  legs_lost: number;
  avg_total: number;
  avg_9: number;
  avg_18: number;
  specials_count: number;
  doppel_bonus: number;
  base_rating: number;
  final_rating: number;
  pts_win_w: number;
  pts_avg_w: number;
  pts_9_18_w: number;
  pts_scores_w: number;
  total_specials_bonus: number;
}

export interface TeamBattleStats {
  avg_a: number;
  avg_b: number;
  avg9_a: number;
  avg9_b: number;
  avg18_a: number;
  avg18_b: number;
  hf_a: number;
  hf_b: number;
  specials_a: number;
  specials_b: number;
  sets_won_a: number;
  sets_won_b: number;
  single_legs_a: number;
  single_legs_b: number;
  double_legs_a: number;
  double_legs_b: number;
  total_legs_a: number;
  total_legs_b: number;
}

export interface DashboardKPIs {
  highest_avg: { player: string; value: number };
  most_180s: { player: string; count: number };
  highest_finish: { player: string; value: number };
  best_short_game: { player: string; count: number };
  best_double: { pair: string; avg: number };
}

export async function getSettings(): Promise<Settings> {
  try {
    const rows = await sql`
      SELECT win_weight, avg_weight, avg9_weight, avg18_weight, scores_weight
      FROM settings WHERE id = 1
    `;
    if (rows.length > 0) {
      return {
        win_weight: Number(rows[0].win_weight) || 20,
        avg_weight: Number(rows[0].avg_weight) || 20,
        avg9_weight: Number(rows[0].avg9_weight) || 20,
        avg18_weight: Number(rows[0].avg18_weight) || 20,
        scores_weight: Number(rows[0].scores_weight) || 20,
      };
    }
  } catch (err) {
    console.error('Error fetching settings:', err);
  }
  return {
    win_weight: 20,
    avg_weight: 20,
    avg9_weight: 20,
    avg18_weight: 20,
    scores_weight: 20,
  };
}

export async function getAvailableSeasons(): Promise<string[]> {
  try {
    const rows = await sql`
      SELECT DISTINCT season FROM matches WHERE season IS NOT NULL AND season != '' AND season != '2025/2026'
      UNION
      SELECT DISTINCT season FROM doubles_matches WHERE season IS NOT NULL AND season != '' AND season != '2025/2026'
      UNION
      SELECT DISTINCT season FROM doubles_specials WHERE season IS NOT NULL AND season != '' AND season != '2025/2026'
    `;
    const seasons = rows.map((r) => r.season).filter(Boolean);
    if (!seasons.includes('2026/2027')) {
      seasons.unshift('2026/2027');
    }
    return seasons;
  } catch (err) {
    console.error('Error fetching seasons:', err);
    return ['2026/2027'];
  }
}

export async function getTop26Players(season = '2026/2027'): Promise<Top26Player[]> {
  try {
    const rows = await sql`
      SELECT p.id as player_id, p.name as player_name, p.team, COUNT(v.id)::int as count_26
      FROM analytics_visits v
      JOIN analytics_legs l ON v.leg_id = l.id
      JOIN analytics_matches m ON l.match_id = m.id
      JOIN players p ON v.player_id = p.id
      WHERE v.score = 26 
        AND m.season = ${season}
        AND m.player_a_name NOT LIKE '%&%'
        AND m.player_b_name NOT LIKE '%&%'
        AND v.rest_score > 0
        AND (v.rest_score + v.score) > 170
        AND p.team IN ('A-Team', 'B-Team')
      GROUP BY p.id, p.name, p.team
      ORDER BY count_26 DESC, p.name ASC
      LIMIT 10
    `;
    return rows.map((r) => ({
      player_id: Number(r.player_id),
      player_name: r.player_name,
      team: r.team,
      count_26: Number(r.count_26),
    }));
  } catch (err) {
    console.error('Error fetching 26er players:', err);
    return [];
  }
}

export async function getDashboardData(season = '2026/2027') {
  const settings = await getSettings();
  const seasons = await getAvailableSeasons();

  // 1. Matches
  const matchesRows = await sql`
    SELECT m.id, m.player_id, m.match_date, m.opponent, m.legs_won, m.legs_lost, 
           m.avg_total, m.avg_9, m.avg_18, m.scores_80, m.scores_100, m.scores_140, 
           m.scores_180, m.high_finishes, m.short_legs, m.specials_count, m.season, 
           COALESCE(m.team, p.team) as team,
           p.name as player_name, p.team as player_team
    FROM matches m
    JOIN players p ON m.player_id = p.id
    WHERE m.season = ${season}
      AND p.team IN ('A-Team', 'B-Team')
    ORDER BY m.match_date DESC, m.id DESC
  `;

  // 2. Doubles Matches
  const doublesMatchesRows = await sql`
    SELECT m.id, m.player1_id, m.player2_id, m.match_date, m.opponent, m.legs_won, m.legs_lost,
           m.avg_total, m.avg_9, m.avg_18, m.scores_80, m.scores_100, m.scores_140,
           m.scores_180, m.high_finishes, m.short_legs, m.specials_count, m.season,
           COALESCE(m.team, p1.team) as team,
           p1.name as p1_name, p1.team as player_team, p2.name as p2_name
    FROM doubles_matches m
    JOIN players p1 ON m.player1_id = p1.id
    JOIN players p2 ON m.player2_id = p2.id
    WHERE m.season = ${season}
      AND p1.team IN ('A-Team', 'B-Team')
      AND p2.team IN ('A-Team', 'B-Team')
    ORDER BY m.match_date DESC, m.id DESC
  `;

  // 3. Doubles Specials
  const doublesSpecialsRows = await sql`
    SELECT d.id, d.player_id, d.partner_name, d.opponent_team, d.match_date, d.special_type, d.description, d.season,
           p.name as player_name, p.team
    FROM doubles_specials d
    JOIN players p ON d.player_id = p.id
    WHERE d.season = ${season}
      AND p.team IN ('A-Team', 'B-Team')
    ORDER BY d.match_date DESC, d.id DESC
  `;

  // 4. Top 26er
  const top26 = await getTop26Players(season);

  // Doppel-Bonus pro Spieler berechnen
  const doublesBonusMap: Record<string, number> = {};
  for (const row of doublesSpecialsRows) {
    const pName = row.player_name;
    doublesBonusMap[pName] = (doublesBonusMap[pName] || 0) + 0.5;
  }

  // Leistungsdaten für Einzelmatches
  interface MatchWithPerf extends MatchRow {
    perf: ReturnType<typeof calculateMatchPerformance>;
  }

  const matchesWithPerf: MatchWithPerf[] = matchesRows.map((row) => ({
    id: Number(row.id),
    player_id: Number(row.player_id),
    match_date: row.match_date,
    opponent: row.opponent,
    legs_won: Number(row.legs_won),
    legs_lost: Number(row.legs_lost),
    avg_total: Number(row.avg_total),
    avg_9: Number(row.avg_9),
    avg_18: Number(row.avg_18),
    scores_80: Number(row.scores_80),
    scores_100: Number(row.scores_100),
    scores_140: Number(row.scores_140),
    scores_180: Number(row.scores_180),
    high_finishes: Number(row.high_finishes),
    short_legs: Number(row.short_legs),
    specials_count: Number(row.specials_count) || 0,
    season: row.season,
    team: String(row.team).trim(),
    player_name: String(row.player_name).trim(),
    player_team: String(row.player_team).trim(),
    perf: calculateMatchPerformance(
      {
        legs_won: Number(row.legs_won),
        legs_lost: Number(row.legs_lost),
        avg_total: Number(row.avg_total),
        avg_9: Number(row.avg_9),
        avg_18: Number(row.avg_18),
        scores_80: Number(row.scores_80),
        scores_100: Number(row.scores_100),
        scores_140: Number(row.scores_140),
        scores_180: Number(row.scores_180),
        specials_count: Number(row.specials_count) || 0,
      },
      settings
    ),
  }));

  // Aggregation für Leaderboard (gruppiert nach Spieler & Stammteam)
  const playerGroups: Record<
    string,
    {
      player_name: string;
      player_team: string;
      matches: MatchWithPerf[];
    }
  > = {};

  for (const m of matchesWithPerf) {
    const key = `${m.player_name}__${m.player_team}`;
    if (!playerGroups[key]) {
      playerGroups[key] = {
        player_name: m.player_name,
        player_team: m.player_team,
        matches: [],
      };
    }
    playerGroups[key].matches.push(m);
  }

  const leaderboardUnsorted: Omit<LeaderboardEntry, 'rank'>[] = Object.values(
    playerGroups
  ).map((group) => {
    const count = group.matches.length;
    const wins = group.matches.filter((m) => m.legs_won > m.legs_lost).length;
    const legsWon = group.matches.reduce((acc, m) => acc + m.legs_won, 0);
    const legsLost = group.matches.reduce((acc, m) => acc + m.legs_lost, 0);

    const avgTotal =
      count > 0
        ? group.matches.reduce((acc, m) => acc + m.avg_total, 0) / count
        : 0;
    const avg9 =
      count > 0
        ? group.matches.reduce((acc, m) => acc + m.avg_9, 0) / count
        : 0;
    const avg18 =
      count > 0
        ? group.matches.reduce((acc, m) => acc + m.avg_18, 0) / count
        : 0;

    const ptsWinW =
      count > 0
        ? group.matches.reduce((acc, m) => acc + m.perf.weighted_win, 0) / count
        : 0;
    const ptsAvgW =
      count > 0
        ? group.matches.reduce((acc, m) => acc + m.perf.weighted_avg, 0) / count
        : 0;
    const pts918W =
      count > 0
        ? group.matches.reduce((acc, m) => acc + m.perf.weighted_9_18, 0) / count
        : 0;
    const ptsScoresW =
      count > 0
        ? group.matches.reduce((acc, m) => acc + m.perf.weighted_scores, 0) / count
        : 0;

    const baseRatingMean = ptsWinW + ptsAvgW + pts918W + ptsScoresW;

    const specialsSum = group.matches.reduce(
      (acc, m) => acc + m.specials_count,
      0
    );
    const doppelBonus = doublesBonusMap[group.player_name] || 0;
    const totalSpecialsBonus = specialsSum * 0.5 + doppelBonus;
    const finalRating = baseRatingMean + totalSpecialsBonus;

    return {
      player_name: group.player_name,
      team: group.player_team,
      match_count: count,
      wins,
      legs_won: legsWon,
      legs_lost: legsLost,
      avg_total: Math.round(avgTotal * 10) / 10,
      avg_9: Math.round(avg9 * 10) / 10,
      avg_18: Math.round(avg18 * 10) / 10,
      specials_count: specialsSum,
      doppel_bonus: doppelBonus,
      base_rating: Math.round(baseRatingMean * 100) / 100,
      final_rating: Math.round(finalRating * 100) / 100,
      pts_win_w: Math.round(ptsWinW * 100) / 100,
      pts_avg_w: Math.round(ptsAvgW * 100) / 100,
      pts_9_18_w: Math.round(pts918W * 100) / 100,
      pts_scores_w: Math.round(ptsScoresW * 100) / 100,
      total_specials_bonus: Math.round(totalSpecialsBonus * 100) / 100,
    };
  });

  const leaderboard: LeaderboardEntry[] = leaderboardUnsorted
    .sort((a, b) => b.final_rating - a.final_rating)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const topMonth = leaderboard.slice(0, 3);

  // TEAM BATTLE (Matches für A-Team vs. B-Team)
  const teamAMatches = matchesWithPerf.filter((m) => m.team === 'A-Team');
  const teamBMatches = matchesWithPerf.filter((m) => m.team === 'B-Team');

  const avg_a =
    teamAMatches.length > 0
      ? teamAMatches.reduce((acc, m) => acc + m.avg_total, 0) /
        teamAMatches.length
      : 0;
  const avg_b =
    teamBMatches.length > 0
      ? teamBMatches.reduce((acc, m) => acc + m.avg_total, 0) /
        teamBMatches.length
      : 0;

  const avg9_a =
    teamAMatches.length > 0
      ? teamAMatches.reduce((acc, m) => acc + m.avg_9, 0) / teamAMatches.length
      : 0;
  const avg9_b =
    teamBMatches.length > 0
      ? teamBMatches.reduce((acc, m) => acc + m.avg_9, 0) / teamBMatches.length
      : 0;

  const avg18_a =
    teamAMatches.length > 0
      ? teamAMatches.reduce((acc, m) => acc + m.avg_18, 0) /
        teamAMatches.length
      : 0;
  const avg18_b =
    teamBMatches.length > 0
      ? teamBMatches.reduce((acc, m) => acc + m.avg_18, 0) /
        teamBMatches.length
      : 0;

  const hf_single_a = teamAMatches.filter((m) => m.high_finishes >= 101).length;
  const hf_single_b = teamBMatches.filter((m) => m.high_finishes >= 101).length;
  const hf_double_a = doublesSpecialsRows.filter(
    (d) => d.team === 'A-Team' && d.special_type?.includes('High Finish')
  ).length;
  const hf_double_b = doublesSpecialsRows.filter(
    (d) => d.team === 'B-Team' && d.special_type?.includes('High Finish')
  ).length;

  const specials_single_a = teamAMatches.reduce(
    (acc, m) => acc + m.specials_count,
    0
  );
  const specials_single_b = teamBMatches.reduce(
    (acc, m) => acc + m.specials_count,
    0
  );
  const specials_double_a = doublesSpecialsRows.filter(
    (d) => d.team === 'A-Team'
  ).length;
  const specials_double_b = doublesSpecialsRows.filter(
    (d) => d.team === 'B-Team'
  ).length;

  const single_wins_a = teamAMatches.filter(
    (m) => m.legs_won > m.legs_lost
  ).length;
  const single_wins_b = teamBMatches.filter(
    (m) => m.legs_won > m.legs_lost
  ).length;

  const double_wins_a = doublesMatchesRows.filter(
    (m) => m.team === 'A-Team' && Number(m.legs_won) > Number(m.legs_lost)
  ).length;
  const double_wins_b = doublesMatchesRows.filter(
    (m) => m.team === 'B-Team' && Number(m.legs_won) > Number(m.legs_lost)
  ).length;

  const single_legs_a = teamAMatches.reduce((acc, m) => acc + m.legs_won, 0);
  const single_legs_b = teamBMatches.reduce((acc, m) => acc + m.legs_won, 0);

  const double_legs_a = doublesMatchesRows
    .filter((m) => m.team === 'A-Team')
    .reduce((acc, m) => acc + Number(m.legs_won), 0);
  const double_legs_b = doublesMatchesRows
    .filter((m) => m.team === 'B-Team')
    .reduce((acc, m) => acc + Number(m.legs_won), 0);

  const teamBattle: TeamBattleStats = {
    avg_a: Math.round(avg_a * 10) / 10,
    avg_b: Math.round(avg_b * 10) / 10,
    avg9_a: Math.round(avg9_a * 10) / 10,
    avg9_b: Math.round(avg9_b * 10) / 10,
    avg18_a: Math.round(avg18_a * 10) / 10,
    avg18_b: Math.round(avg18_b * 10) / 10,
    hf_a: hf_single_a + hf_double_a,
    hf_b: hf_single_b + hf_double_b,
    specials_a: specials_single_a + specials_double_a,
    specials_b: specials_single_b + specials_double_b,
    sets_won_a: single_wins_a + double_wins_a,
    sets_won_b: single_wins_b + double_wins_b,
    single_legs_a,
    single_legs_b,
    double_legs_a,
    double_legs_b,
    total_legs_a: single_legs_a + double_legs_a,
    total_legs_b: single_legs_b + double_legs_b,
  };

  // KPIs
  let highestAvg = { player: '-', value: 0 };
  if (matchesWithPerf.length > 0) {
    const sortedAvg = [...matchesWithPerf].sort(
      (a, b) => b.avg_total - a.avg_total
    );
    highestAvg = {
      player: sortedAvg[0].player_name,
      value: sortedAvg[0].avg_total,
    };
  }

  // 180s pro Spieler
  const count180Map: Record<string, number> = {};
  for (const m of matchesWithPerf) {
    count180Map[m.player_name] =
      (count180Map[m.player_name] || 0) + m.scores_180;
  }
  for (const ds of doublesSpecialsRows) {
    if (ds.special_type?.includes('180')) {
      count180Map[ds.player_name] = (count180Map[ds.player_name] || 0) + 1;
    }
  }

  let most180s = { player: 'Noch offen', count: 0 };
  for (const [p, cnt] of Object.entries(count180Map)) {
    if (cnt > most180s.count) {
      most180s = { player: p, count: cnt };
    }
  }

  // High Finish
  let highestFinish = { player: 'Noch offen', value: 0 };
  for (const m of matchesWithPerf) {
    if (m.high_finishes > highestFinish.value) {
      highestFinish = { player: m.player_name, value: m.high_finishes };
    }
  }

  // Best Short Game
  const shortGameMap: Record<string, number> = {};
  for (const m of matchesWithPerf) {
    if (m.short_legs > 0) {
      shortGameMap[m.player_name] =
        (shortGameMap[m.player_name] || 0) + m.short_legs;
    }
  }
  for (const ds of doublesSpecialsRows) {
    if (ds.special_type?.toLowerCase().includes('short')) {
      shortGameMap[ds.player_name] = (shortGameMap[ds.player_name] || 0) + 1;
    }
  }

  let bestShortGame = { player: 'Noch offen', count: 0 };
  for (const [p, cnt] of Object.entries(shortGameMap)) {
    if (cnt > bestShortGame.count) {
      bestShortGame = { player: p, count: cnt };
    }
  }

  // Bestes Doppel
  let bestDouble = { pair: 'Noch offen', avg: 0 };
  if (doublesMatchesRows.length > 0) {
    const sortedDoubles = [...doublesMatchesRows].sort(
      (a, b) => Number(b.avg_total) - Number(a.avg_total)
    );
    bestDouble = {
      pair: `${getShortName(sortedDoubles[0].p1_name)} & ${getShortName(
        sortedDoubles[0].p2_name
      )}`,
      avg: Math.round(Number(sortedDoubles[0].avg_total) * 10) / 10,
    };
  }

  const kpis: DashboardKPIs = {
    highest_avg: highestAvg,
    most_180s: most180s,
    highest_finish: highestFinish,
    best_short_game: bestShortGame,
    best_double: bestDouble,
  };

  return {
    season,
    seasons,
    leaderboard,
    topMonth,
    teamBattle,
    top26,
    kpis,
    matches: matchesWithPerf,
  };
}

export async function getPlayers(): Promise<Player[]> {
  try {
    const rows = await sql`
      SELECT id, name, team, role, estimated_double_quote
      FROM players
      WHERE name NOT LIKE 'Board %'
        AND name != 'User_Test'
        AND name != 'Normal'
      ORDER BY name ASC
    `;
    return rows.map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      team: String(r.team),
      role: String(r.role || 'player'),
      estimated_double_quote:
        r.estimated_double_quote !== null && r.estimated_double_quote !== undefined
          ? Number(r.estimated_double_quote)
          : null,
    }));
  } catch (err) {
    console.error('Error fetching players:', err);
    return [];
  }
}

export async function getAllMatches(season?: string): Promise<MatchRow[]> {
  try {
    const rows = season && season !== 'Alle Saisons'
      ? await sql`
          SELECT m.id, m.player_id, m.match_date, m.opponent, m.legs_won, m.legs_lost, 
                 m.avg_total, m.avg_9, m.avg_18, m.scores_80, m.scores_100, m.scores_140, 
                 m.scores_180, m.high_finishes, m.short_legs, m.specials_count, m.season, 
                 COALESCE(m.team, p.team) as team,
                 p.name as player_name, p.team as player_team
          FROM matches m
          JOIN players p ON m.player_id = p.id
          WHERE m.season = ${season}
            AND p.team IN ('A-Team', 'B-Team')
          ORDER BY m.match_date DESC, m.id DESC
        `
      : await sql`
          SELECT m.id, m.player_id, m.match_date, m.opponent, m.legs_won, m.legs_lost, 
                 m.avg_total, m.avg_9, m.avg_18, m.scores_80, m.scores_100, m.scores_140, 
                 m.scores_180, m.high_finishes, m.short_legs, m.specials_count, m.season, 
                 COALESCE(m.team, p.team) as team,
                 p.name as player_name, p.team as player_team
          FROM matches m
          JOIN players p ON m.player_id = p.id
          WHERE p.team IN ('A-Team', 'B-Team')
          ORDER BY m.match_date DESC, m.id DESC
        `;
    return rows.map((r) => ({
      id: Number(r.id),
      player_id: Number(r.player_id),
      match_date: String(r.match_date),
      opponent: String(r.opponent),
      legs_won: Number(r.legs_won),
      legs_lost: Number(r.legs_lost),
      avg_total: Number(r.avg_total),
      avg_9: Number(r.avg_9),
      avg_18: Number(r.avg_18),
      scores_80: Number(r.scores_80),
      scores_100: Number(r.scores_100),
      scores_140: Number(r.scores_140),
      scores_180: Number(r.scores_180),
      high_finishes: Number(r.high_finishes),
      short_legs: Number(r.short_legs),
      specials_count: Number(r.specials_count || 0),
      season: String(r.season),
      team: String(r.team).trim(),
      player_name: String(r.player_name).trim(),
      player_team: String(r.player_team).trim(),
    }));
  } catch (err) {
    console.error('Error fetching all matches:', err);
    return [];
  }
}

export async function getDoublesSpecials(season?: string): Promise<DoublesSpecialRow[]> {
  try {
    const rows = season && season !== 'Alle Saisons'
      ? await sql`
          SELECT d.id, d.player_id, d.partner_name, d.opponent_team, d.match_date, d.special_type, d.description, d.season,
                 p.name as player_name, p.team
          FROM doubles_specials d
          JOIN players p ON d.player_id = p.id
          WHERE d.season = ${season}
            AND p.team IN ('A-Team', 'B-Team')
          ORDER BY d.match_date DESC, d.id DESC
        `
      : await sql`
          SELECT d.id, d.player_id, d.partner_name, d.opponent_team, d.match_date, d.special_type, d.description, d.season,
                 p.name as player_name, p.team
          FROM doubles_specials d
          JOIN players p ON d.player_id = p.id
          WHERE p.team IN ('A-Team', 'B-Team')
          ORDER BY d.match_date DESC, d.id DESC
        `;
    return rows.map((r) => ({
      id: Number(r.id),
      player_id: Number(r.player_id),
      partner_name: String(r.partner_name),
      opponent_team: String(r.opponent_team),
      match_date: String(r.match_date),
      special_type: String(r.special_type),
      description: String(r.description || ''),
      season: String(r.season),
      player_name: String(r.player_name),
      team: String(r.team),
    }));
  } catch (err) {
    console.error('Error fetching doubles specials:', err);
    return [];
  }
}

function toNullableNum(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export async function getAllDoublesMatches(season?: string): Promise<DoublesMatchRow[]> {
  try {
    const rows = season && season !== 'Alle Saisons'
      ? await sql`
          SELECT m.id, m.player1_id, m.player2_id, m.match_date, m.opponent, m.legs_won, m.legs_lost,
                 m.avg_total, m.avg_9, m.avg_18, m.scores_80, m.scores_100, m.scores_140,
                 m.scores_180, m.high_finishes, m.short_legs, m.specials_count, m.season,
                 COALESCE(m.team, p1.team) as team,
                 p1.name as p1_name, p1.team as player_team, p2.name as p2_name,
                 m.player1_darts, m.player2_darts,
                 m.player1_avg, m.player2_avg,
                 m.player1_first9_avg, m.player2_first9_avg,
                 m.player1_scores_80, m.player2_scores_80,
                 m.player1_scores_100, m.player2_scores_100,
                 m.player1_scores_140, m.player2_scores_140,
                 m.player1_scores_180, m.player2_scores_180,
                 m.player1_checkouts, m.player2_checkouts
          FROM doubles_matches m
          JOIN players p1 ON m.player1_id = p1.id
          JOIN players p2 ON m.player2_id = p2.id
          WHERE m.season = ${season}
            AND (p1.team IN ('A-Team', 'B-Team') OR p2.team IN ('A-Team', 'B-Team'))
          ORDER BY m.match_date DESC, m.id DESC
        `
      : await sql`
          SELECT m.id, m.player1_id, m.player2_id, m.match_date, m.opponent, m.legs_won, m.legs_lost,
                 m.avg_total, m.avg_9, m.avg_18, m.scores_80, m.scores_100, m.scores_140,
                 m.scores_180, m.high_finishes, m.short_legs, m.specials_count, m.season,
                 COALESCE(m.team, p1.team) as team,
                 p1.name as p1_name, p1.team as player_team, p2.name as p2_name,
                 m.player1_darts, m.player2_darts,
                 m.player1_avg, m.player2_avg,
                 m.player1_first9_avg, m.player2_first9_avg,
                 m.player1_scores_80, m.player2_scores_80,
                 m.player1_scores_100, m.player2_scores_100,
                 m.player1_scores_140, m.player2_scores_140,
                 m.player1_scores_180, m.player2_scores_180,
                 m.player1_checkouts, m.player2_checkouts
          FROM doubles_matches m
          JOIN players p1 ON m.player1_id = p1.id
          JOIN players p2 ON m.player2_id = p2.id
          WHERE (p1.team IN ('A-Team', 'B-Team') OR p2.team IN ('A-Team', 'B-Team'))
          ORDER BY m.match_date DESC, m.id DESC
        `;

    return rows.map((r) => ({
      id: Number(r.id),
      player1_id: Number(r.player1_id),
      player2_id: Number(r.player2_id),
      match_date: String(r.match_date),
      opponent: String(r.opponent),
      legs_won: Number(r.legs_won),
      legs_lost: Number(r.legs_lost),
      avg_total: Number(r.avg_total),
      avg_9: Number(r.avg_9),
      avg_18: Number(r.avg_18),
      scores_80: Number(r.scores_80),
      scores_100: Number(r.scores_100),
      scores_140: Number(r.scores_140),
      scores_180: Number(r.scores_180),
      high_finishes: Number(r.high_finishes),
      short_legs: Number(r.short_legs),
      specials_count: Number(r.specials_count || 0),
      season: String(r.season),
      team: String(r.team).trim(),
      p1_name: String(r.p1_name).trim(),
      player_team: String(r.player_team).trim(),
      p2_name: String(r.p2_name).trim(),
      player1_darts: toNullableNum(r.player1_darts),
      player2_darts: toNullableNum(r.player2_darts),
      player1_avg: toNullableNum(r.player1_avg),
      player2_avg: toNullableNum(r.player2_avg),
      player1_first9_avg: toNullableNum(r.player1_first9_avg),
      player2_first9_avg: toNullableNum(r.player2_first9_avg),
      player1_scores_80: toNullableNum(r.player1_scores_80),
      player2_scores_80: toNullableNum(r.player2_scores_80),
      player1_scores_100: toNullableNum(r.player1_scores_100),
      player2_scores_100: toNullableNum(r.player2_scores_100),
      player1_scores_140: toNullableNum(r.player1_scores_140),
      player2_scores_140: toNullableNum(r.player2_scores_140),
      player1_scores_180: toNullableNum(r.player1_scores_180),
      player2_scores_180: toNullableNum(r.player2_scores_180),
      player1_checkouts: toNullableNum(r.player1_checkouts),
      player2_checkouts: toNullableNum(r.player2_checkouts),
    }));
  } catch (err) {
    console.error('Error fetching all doubles matches:', err);
    return [];
  }
}

export interface AnalyticsMatchItem {
  id: number;
  player_a_name: string;
  player_b_name: string;
  match_date: string;
  duration_min: number;
  season: string;
  round_name: string;
  best_of_legs: number;
  winner_id?: number;
}

export async function getAnalyticsMatches(season?: string): Promise<AnalyticsMatchItem[]> {
  try {
    const rows = season && season !== 'Alle Saisons'
      ? await sql`
          SELECT id, player_a_name, player_b_name, match_date, duration_min, season, round_name, best_of_legs, winner_id
          FROM analytics_matches
          WHERE season = ${season}
          ORDER BY match_date DESC, id DESC
        `
      : await sql`
          SELECT id, player_a_name, player_b_name, match_date, duration_min, season, round_name, best_of_legs, winner_id
          FROM analytics_matches
          ORDER BY match_date DESC, id DESC
        `;
    return rows.map((r) => ({
      id: Number(r.id),
      player_a_name: String(r.player_a_name),
      player_b_name: String(r.player_b_name),
      match_date: String(r.match_date),
      duration_min: Number(r.duration_min || 0),
      season: String(r.season),
      round_name: String(r.round_name || 'Liga-Spiel'),
      best_of_legs: Number(r.best_of_legs || 5),
      winner_id: r.winner_id ? Number(r.winner_id) : undefined,
    }));
  } catch (err) {
    console.error('Error fetching analytics matches:', err);
    return [];
  }
}

export interface RawLegVisit {
  id: number;
  leg_id: number;
  visit_order: number;
  score: number;
  rest_score: number;
  opponent_rest: number;
  leg_num: number;
  match_id: number;
  starter_player_id: number;
  winner_player_id: number;
  darts_thrown: number | null;
  checkout: number | null;
  is_break: boolean;
  match_date: string;
  season?: string;
}

export async function getAllAnalyticsLegVisits(
  season?: string
): Promise<Record<number, RawLegVisit[][]>> {
  try {
    const rows = season && season !== 'Alle Saisons'
      ? await sql`
          SELECT v.id, v.leg_id, v.player_id, v.visit_order, v.score, v.rest_score, v.opponent_rest_at_visit,
                 l.leg_num, l.starter_player_id, l.winner_player_id, l.darts_thrown_a, l.darts_thrown_b,
                 l.checkout_a, l.checkout_b, l.is_break,
                 m.id as match_id, m.player_a_id, m.player_b_id, m.match_date, m.season
          FROM analytics_visits v
          JOIN analytics_legs l ON v.leg_id = l.id
          JOIN analytics_matches m ON l.match_id = m.id
          JOIN players p ON v.player_id = p.id
          WHERE (m.season = ${season} OR m.season = '2025/2026')
            AND p.team IN ('A-Team', 'B-Team')
            AND m.player_a_name NOT LIKE '%&%'
            AND m.player_b_name NOT LIKE '%&%'
          ORDER BY v.player_id ASC, m.match_date ASC, m.id ASC, l.leg_num ASC, v.visit_order ASC
        `
      : await sql`
          SELECT v.id, v.leg_id, v.player_id, v.visit_order, v.score, v.rest_score, v.opponent_rest_at_visit,
                 l.leg_num, l.starter_player_id, l.winner_player_id, l.darts_thrown_a, l.darts_thrown_b,
                 l.checkout_a, l.checkout_b, l.is_break,
                 m.id as match_id, m.player_a_id, m.player_b_id, m.match_date, m.season
          FROM analytics_visits v
          JOIN analytics_legs l ON v.leg_id = l.id
          JOIN analytics_matches m ON l.match_id = m.id
          JOIN players p ON v.player_id = p.id
          WHERE p.team IN ('A-Team', 'B-Team')
            AND m.player_a_name NOT LIKE '%&%'
            AND m.player_b_name NOT LIKE '%&%'
          ORDER BY v.player_id ASC, m.match_date ASC, m.id ASC, l.leg_num ASC, v.visit_order ASC
        `;

    const playerLegsMap: Record<number, Record<number, RawLegVisit[]>> = {};

    for (const row of rows) {
      const pid = Number(row.player_id);
      const legId = Number(row.leg_id);
      const isPlayerA = Number(row.player_a_id) === pid;
      const dartsThrown = isPlayerA ? Number(row.darts_thrown_a) : Number(row.darts_thrown_b);
      const co = isPlayerA ? Number(row.checkout_a) : Number(row.checkout_b);

      if (!playerLegsMap[pid]) {
        playerLegsMap[pid] = {};
      }
      if (!playerLegsMap[pid][legId]) {
        playerLegsMap[pid][legId] = [];
      }

      playerLegsMap[pid][legId].push({
        id: Number(row.id),
        leg_id: legId,
        visit_order: Number(row.visit_order),
        score: Number(row.score),
        rest_score: Number(row.rest_score),
        opponent_rest: row.opponent_rest_at_visit != null ? Number(row.opponent_rest_at_visit) : 501,
        leg_num: Number(row.leg_num),
        match_id: Number(row.match_id),
        starter_player_id: Number(row.starter_player_id),
        winner_player_id: Number(row.winner_player_id),
        darts_thrown: dartsThrown > 0 ? dartsThrown : null,
        checkout: co > 0 ? co : null,
        is_break: Boolean(row.is_break),
        match_date: String(row.match_date),
        season: row.season ? String(row.season) : '',
      });
    }

    const result: Record<number, RawLegVisit[][]> = {};
    for (const [pidStr, legGroup] of Object.entries(playerLegsMap)) {
      result[Number(pidStr)] = Object.values(legGroup);
    }

    return result;
  } catch (err) {
    console.error('Error fetching all analytics leg visits:', err);
    return {};
  }
}

function formatIsoDateToDe(raw: string): string {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split('-');
    return `${d}.${m}.${y}`;
  }
  return raw;
}

export async function getAllPlayerSpecials(
  season = '2026/2027'
): Promise<Record<string, PlayerSpecialItem[]>> {
  try {
    const useSeasonFilter = Boolean(season && season !== 'Alle Saisons');

    const [doublesSpecials, singleMatchesRows, specialLegsRows, highVisitRows] =
      await Promise.all([
        getDoublesSpecials(season),
        useSeasonFilter
          ? sql`
              SELECT m.id, m.player_id, m.match_date, m.opponent, m.scores_180,
                     m.high_finishes, m.short_legs, m.specials_count, m.season,
                     COALESCE(m.team, p.team) as team, p.name as player_name
              FROM matches m
              JOIN players p ON m.player_id = p.id
              WHERE m.season = ${season}
                AND p.team IN ('A-Team', 'B-Team')
                AND (m.specials_count > 0 OR m.scores_180 > 0 OR m.high_finishes > 0 OR m.short_legs > 0)
              ORDER BY m.match_date DESC, m.id DESC
            `
          : sql`
              SELECT m.id, m.player_id, m.match_date, m.opponent, m.scores_180,
                     m.high_finishes, m.short_legs, m.specials_count, m.season,
                     COALESCE(m.team, p.team) as team, p.name as player_name
              FROM matches m
              JOIN players p ON m.player_id = p.id
              WHERE p.team IN ('A-Team', 'B-Team')
                AND (m.specials_count > 0 OR m.scores_180 > 0 OR m.high_finishes > 0 OR m.short_legs > 0)
              ORDER BY m.match_date DESC, m.id DESC
            `,
        useSeasonFilter
          ? sql`
              SELECT am.id as am_id, am.league_match_id, am.match_date,
                     am.player_a_id, am.player_b_id, am.player_a_name, am.player_b_name,
                     l.leg_num, l.winner_player_id, l.darts_thrown_a, l.darts_thrown_b,
                     l.checkout_a, l.checkout_b
              FROM analytics_legs l
              JOIN analytics_matches am ON l.match_id = am.id
              WHERE am.season = ${season}
                AND am.player_a_name NOT LIKE '%&%'
                AND am.player_b_name NOT LIKE '%&%'
                AND (
                  (l.darts_thrown_a > 0 AND l.darts_thrown_a <= 18)
                  OR (l.darts_thrown_b > 0 AND l.darts_thrown_b <= 18)
                  OR l.checkout_a >= 101
                  OR l.checkout_b >= 101
                )
              ORDER BY l.leg_num ASC
            `
          : sql`
              SELECT am.id as am_id, am.league_match_id, am.match_date,
                     am.player_a_id, am.player_b_id, am.player_a_name, am.player_b_name,
                     l.leg_num, l.winner_player_id, l.darts_thrown_a, l.darts_thrown_b,
                     l.checkout_a, l.checkout_b
              FROM analytics_legs l
              JOIN analytics_matches am ON l.match_id = am.id
              WHERE am.player_a_name NOT LIKE '%&%'
                AND am.player_b_name NOT LIKE '%&%'
                AND (
                  (l.darts_thrown_a > 0 AND l.darts_thrown_a <= 18)
                  OR (l.darts_thrown_b > 0 AND l.darts_thrown_b <= 18)
                  OR l.checkout_a >= 101
                  OR l.checkout_b >= 101
                )
              ORDER BY l.leg_num ASC
            `,
        useSeasonFilter
          ? sql`
              SELECT am.id as am_id, am.league_match_id, am.match_date,
                     am.player_a_id, am.player_b_id, am.player_a_name, am.player_b_name,
                     l.leg_num, v.player_id, v.score
              FROM analytics_visits v
              JOIN analytics_legs l ON v.leg_id = l.id
              JOIN analytics_matches am ON l.match_id = am.id
              WHERE am.season = ${season}
                AND am.player_a_name NOT LIKE '%&%'
                AND am.player_b_name NOT LIKE '%&%'
                AND v.score >= 141
              ORDER BY l.leg_num ASC, v.visit_order ASC
            `
          : sql`
              SELECT am.id as am_id, am.league_match_id, am.match_date,
                     am.player_a_id, am.player_b_id, am.player_a_name, am.player_b_name,
                     l.leg_num, v.player_id, v.score
              FROM analytics_visits v
              JOIN analytics_legs l ON v.leg_id = l.id
              JOIN analytics_matches am ON l.match_id = am.id
              WHERE am.player_a_name NOT LIKE '%&%'
                AND am.player_b_name NOT LIKE '%&%'
                AND v.score >= 141
              ORDER BY l.leg_num ASC, v.visit_order ASC
            `,
      ]);

    const result: Record<string, PlayerSpecialItem[]> = {};
    const addSpecial = (item: PlayerSpecialItem) => {
      if (!result[item.player_name]) {
        result[item.player_name] = [];
      }
      result[item.player_name].push(item);
    };

    // 1. Doppel-Specials aus doubles_specials
    for (const d of doublesSpecials) {
      const tLower = d.special_type.toLowerCase();
      const dLower = d.description.toLowerCase();

      let category: PlayerSpecialCategory = 'other';
      let badgeLabel = d.special_type || 'Doppel-Special ⭐';
      let valueLabel = d.description || d.special_type;

      if (tLower.includes('180') || dLower.includes('180')) {
        category = '180';
        badgeLabel = '180er Maximum 🎯';
        valueLabel = '180 Pkt';
      } else if (
        tLower.includes('high finish') ||
        tLower.includes('101') ||
        tLower.includes('bull') ||
        dLower.includes('finish')
      ) {
        category = 'high_finish';
        badgeLabel = 'High Finish 🏁';
        const mFinish = d.description.match(/\b(1[0-7]\d)\b/);
        valueLabel = mFinish ? `${mFinish[1]} Checkout` : 'High Finish (101+)';
      } else if (tLower.includes('short') || dLower.includes('dart')) {
        category = 'short_leg';
        badgeLabel = 'Short Game ⚡';
        const mDarts = d.description.match(/\b([9]|1[0-8])\b/);
        valueLabel = mDarts ? `${mDarts[1]} Darts` : '≤ 18 Darts';
      } else if (
        tLower.includes('high score') ||
        tLower.includes('141') ||
        tLower.includes('171') ||
        /\b1[4-7]\d\b/.test(dLower)
      ) {
        category = 'high_score';
        badgeLabel = 'High Score 💥';
        const mScore = d.description.match(/\b(1[4-7]\d)\b/);
        valueLabel = mScore ? `${mScore[1]} Pkt` : 'High Score (141–177)';
      }

      addSpecial({
        id: `d-${d.id}`,
        player_name: d.player_name.trim(),
        team: d.team.trim(),
        match_date: String(d.match_date),
        formatted_date: formatIsoDateToDe(String(d.match_date)),
        mode: 'Doppel',
        partner_name: d.partner_name.trim(),
        opponent: d.opponent_team.trim(),
        category,
        badge_label: badgeLabel,
        value_label: valueLabel,
        description: d.description || `${valueLabel} im Doppel mit ${d.partner_name}`,
        bonus_points: 0.5,
      });
    }

    // Helper: Analytics-Zeile zu einem Einzelmatch zuordnen
    const isRowForMatch = (
      row: Record<string, unknown>,
      matchId: number,
      playerId: number,
      matchDate: string,
      opponent: string
    ) => {
      if (row.league_match_id != null && Number(row.league_match_id) === matchId) {
        return true;
      }
      if (
        String(row.match_date) === matchDate &&
        (Number(row.player_a_id) === playerId || Number(row.player_b_id) === playerId)
      ) {
        const oppNorm = opponent.trim().toLowerCase();
        const aNorm = String(row.player_a_name || '').trim().toLowerCase();
        const bNorm = String(row.player_b_name || '').trim().toLowerCase();
        return aNorm === oppNorm || bNorm === oppNorm;
      }
      return false;
    };

    // 2. Einzel-Specials aus matches + exakten Analytics-Legs/-Visits
    for (const m of singleMatchesRows) {
      const matchId = Number(m.id);
      const playerId = Number(m.player_id);
      const playerName = String(m.player_name).trim();
      const team = String(m.team).trim();
      const matchDate = String(m.match_date);
      const formattedDate = formatIsoDateToDe(matchDate);
      const opponent = String(m.opponent).trim();

      const scores180 = Number(m.scores_180 || 0);
      const highFinishes = Number(m.high_finishes || 0);
      const shortLegs = Number(m.short_legs || 0);
      const specialsCount = Number(m.specials_count || 0);

      const matchLegs = specialLegsRows.filter((l) =>
        isRowForMatch(l, matchId, playerId, matchDate, opponent)
      );
      const matchVisits = highVisitRows.filter(
        (v) =>
          Number(v.player_id) === playerId &&
          isRowForMatch(v, matchId, playerId, matchDate, opponent)
      );

      const built: PlayerSpecialItem[] = [];

      // a) 180er
      const visits180 = matchVisits.filter((v) => Number(v.score) === 180);
      for (let i = 0; i < visits180.length; i++) {
        const v = visits180[i];
        built.push({
          id: `s-${matchId}-180-${i}`,
          player_name: playerName,
          team,
          match_date: matchDate,
          formatted_date: formattedDate,
          mode: 'Einzel',
          opponent,
          category: '180',
          badge_label: '180er Maximum 🎯',
          value_label: `180 Pkt (Leg ${Number(v.leg_num)})`,
          description: `Maximum 180 im Einzel gegen ${opponent} (Leg ${Number(v.leg_num)})`,
          bonus_points: 0.5,
        });
      }
      for (let i = visits180.length; i < scores180; i++) {
        built.push({
          id: `s-${matchId}-180-fb-${i}`,
          player_name: playerName,
          team,
          match_date: matchDate,
          formatted_date: formattedDate,
          mode: 'Einzel',
          opponent,
          category: '180',
          badge_label: '180er Maximum 🎯',
          value_label: '180 Pkt',
          description: `Maximum 180 im Einzel gegen ${opponent}`,
          bonus_points: 0.5,
        });
      }

      // b) High Finishes (>= 101)
      const hfLegs = matchLegs.filter((l) => {
        if (Number(l.winner_player_id) !== playerId) return false;
        const isA = Number(l.player_a_id) === playerId;
        const co = Number(isA ? l.checkout_a : l.checkout_b);
        return co >= 101;
      });
      for (let i = 0; i < hfLegs.length; i++) {
        const l = hfLegs[i];
        const isA = Number(l.player_a_id) === playerId;
        const co = Number(isA ? l.checkout_a : l.checkout_b);
        built.push({
          id: `s-${matchId}-hf-${i}`,
          player_name: playerName,
          team,
          match_date: matchDate,
          formatted_date: formattedDate,
          mode: 'Einzel',
          opponent,
          category: 'high_finish',
          badge_label: 'High Finish 🏁',
          value_label: `${co} Checkout (Leg ${Number(l.leg_num)})`,
          description: `${co}er High Finish im Einzel gegen ${opponent} (Leg ${Number(l.leg_num)})`,
          bonus_points: 0.5,
        });
      }
      if (hfLegs.length === 0 && highFinishes > 0) {
        built.push({
          id: `s-${matchId}-hf-fb`,
          player_name: playerName,
          team,
          match_date: matchDate,
          formatted_date: formattedDate,
          mode: 'Einzel',
          opponent,
          category: 'high_finish',
          badge_label: 'High Finish 🏁',
          value_label: highFinishes >= 101 ? `${highFinishes} Checkout` : 'High Finish (101+)',
          description:
            highFinishes >= 101
              ? `${highFinishes}er High Finish im Einzel gegen ${opponent}`
              : `High Finish im Einzel gegen ${opponent}`,
          bonus_points: 0.5,
        });
      }

      // c) Short Legs (<= 18 Darts gewonnen)
      const slLegs = matchLegs.filter((l) => {
        if (Number(l.winner_player_id) !== playerId) return false;
        const isA = Number(l.player_a_id) === playerId;
        const darts = Number(isA ? l.darts_thrown_a : l.darts_thrown_b);
        return darts > 0 && darts <= 18;
      });
      for (let i = 0; i < slLegs.length; i++) {
        const l = slLegs[i];
        const isA = Number(l.player_a_id) === playerId;
        const darts = Number(isA ? l.darts_thrown_a : l.darts_thrown_b);
        built.push({
          id: `s-${matchId}-sl-${i}`,
          player_name: playerName,
          team,
          match_date: matchDate,
          formatted_date: formattedDate,
          mode: 'Einzel',
          opponent,
          category: 'short_leg',
          badge_label: 'Short Game ⚡',
          value_label: `${darts} Darts (Leg ${Number(l.leg_num)})`,
          description: `${darts}-Dart Short Leg im Einzel gegen ${opponent} (Leg ${Number(l.leg_num)})`,
          bonus_points: 0.5,
        });
      }
      for (let i = slLegs.length; i < shortLegs; i++) {
        built.push({
          id: `s-${matchId}-sl-fb-${i}`,
          player_name: playerName,
          team,
          match_date: matchDate,
          formatted_date: formattedDate,
          mode: 'Einzel',
          opponent,
          category: 'short_leg',
          badge_label: 'Short Game ⚡',
          value_label: '≤ 18 Darts',
          description: `Short Game im Einzel gegen ${opponent}`,
          bonus_points: 0.5,
        });
      }

      // d) High Scores 141-177 (nur wenn specials_count weitere Specials ausweist)
      if (built.length < specialsCount) {
        const hiScoreVisits = matchVisits
          .filter((v) => {
            const sc = Number(v.score);
            return sc >= 141 && sc < 180;
          })
          .sort((a, b) => Number(b.score) - Number(a.score));

        const needed = specialsCount - built.length;
        for (let i = 0; i < Math.min(needed, hiScoreVisits.length); i++) {
          const v = hiScoreVisits[i];
          const sc = Number(v.score);
          built.push({
            id: `s-${matchId}-hs-${i}`,
            player_name: playerName,
            team,
            match_date: matchDate,
            formatted_date: formattedDate,
            mode: 'Einzel',
            opponent,
            category: 'high_score',
            badge_label: 'High Score 💥',
            value_label: `${sc} Pkt (Leg ${Number(v.leg_num)})`,
            description: `${sc}er High Score im Einzel gegen ${opponent} (Leg ${Number(v.leg_num)})`,
            bonus_points: 0.5,
          });
        }
      }

      // e) Letzter Fallback, falls specials_count immer noch groesser ist
      while (built.length < specialsCount) {
        built.push({
          id: `s-${matchId}-other-${built.length}`,
          player_name: playerName,
          team,
          match_date: matchDate,
          formatted_date: formattedDate,
          mode: 'Einzel',
          opponent,
          category: 'other',
          badge_label: 'Special ⭐',
          value_label: 'Special im Einzel',
          description: `Offizielles Special im Einzel gegen ${opponent}`,
          bonus_points: 0.5,
        });
      }

      for (const item of built) {
        addSpecial(item);
      }
    }

    // Chronologisch absteigend sortieren
    for (const key of Object.keys(result)) {
      result[key].sort((a, b) => {
        const dateCmp = b.match_date.localeCompare(a.match_date);
        if (dateCmp !== 0) return dateCmp;
        return b.id.localeCompare(a.id);
      });
    }

    return result;
  } catch (err) {
    console.error('Error fetching all player specials:', err);
    return {};
  }
}


