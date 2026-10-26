'use server';

import { sql } from '@/lib/db';
import {
  UnifiedTvTimeframe,
  UnifiedTvBoardData,
  TvDoppelquoteRow,
  TvPdcRow,
  TvFussballRow,
  TvFussballMatch,
  TvStellenCheckenRow,
  ArchiveTrainingDaySummary,
  ArchiveDayDetail,
} from './types';
import { ensureStellenCheckenTable } from '../stellen-checken/actions';

function extractRowDate(row: any): string {
  if (row.training_date) {
    const s = String(row.training_date).trim();
    if (s.includes('T')) return s.split('T')[0];
    if (s.length >= 10 && s[4] === '-' && s[7] === '-') return s.slice(0, 10);
  }
  if (row.created_at) {
    try {
      const d = new Date(row.created_at);
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(d);
    } catch (e) {
      return String(row.created_at).slice(0, 10);
    }
  }
  return '';
}

function formatGermanDateLabel(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch (e) {
    return dateStr;
  }
}

function formatShortGermanDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(date);
  } catch (e) {
    return dateStr;
  }
}

function formatTime(val: any): string {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Berlin',
    }).format(d) + ' Uhr';
  } catch (e) {
    return '';
  }
}

function isHuman1vs1Fussball(r: any): boolean {
  if (Number(r.is_aborted || 0) !== 0) return false;
  if (Number(r.is_computer || 0) === 1) return false;
  if (r.game_mode && r.game_mode !== '1vs1') return false;
  const opp = String(r.opponent_name || '').toLowerCase();
  const p = String(r.player_name || '').toLowerCase();
  if (opp.includes('computer') || opp.includes('bot') || opp.includes('ki')) return false;
  if (p.includes('computer') || p.includes('bot') || p.includes('ki')) return false;
  return true;
}

export async function getUnifiedTvBoardDataAction(options?: {
  timeframe?: UnifiedTvTimeframe;
  customDate?: string;
}): Promise<UnifiedTvBoardData> {
  const timeframe = options?.timeframe || 'today';
  const now = new Date();
  const deTodayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(now);
  const deCurrentMonthStr = deTodayDateStr.slice(0, 7);
  const monthLabel = new Intl.DateTimeFormat('de-DE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  }).format(now);

  const selectedDateStr =
    timeframe === 'archive' && options?.customDate
      ? options.customDate
      : deTodayDateStr;

  try {
    await ensureStellenCheckenTable();

    // 1. Fetch raw data in parallel
    const [rawDoubles, rawPdc, rawFussball, rawStellenChecken] = await Promise.all([
      sql`SELECT * FROM training_doubles ORDER BY created_at ASC`,
      sql`SELECT * FROM training_pdc_challenge ORDER BY created_at ASC`,
      sql`SELECT * FROM training_fussball ORDER BY created_at ASC`,
      sql`SELECT * FROM training_stellen_checken ORDER BY created_at ASC`.catch(() => []),
    ]);

    // Streng reguläre Spiele filtern (Abgebrochene Spiele rausnehmen)
    const doublesRows = rawDoubles.filter((r: any) => Number(r.is_aborted || 0) === 0);
    const pdcRows = rawPdc.filter((r: any) => Number(r.is_aborted || 0) === 0);
    const fussballRows = rawFussball.filter((r: any) => Number(r.is_aborted || 0) === 0);
    const stellenCheckenRows = rawStellenChecken.filter((r: any) => Number(r.is_aborted || 0) === 0);

    // 2. Identify available archive days across all 4 game types
    const dayMap = new Map<string, {
      sessionsCount: number;
      players: Set<string>;
      games: Set<'doppelquote' | 'pdc' | 'fussball' | 'stellen_checken'>;
    }>();

    const registerDay = (row: any, game: 'doppelquote' | 'pdc' | 'fussball' | 'stellen_checken') => {
      const d = extractRowDate(row);
      if (!d || d.length !== 10) return;
      if (!dayMap.has(d)) {
        dayMap.set(d, { sessionsCount: 0, players: new Set(), games: new Set() });
      }
      const entry = dayMap.get(d)!;
      entry.sessionsCount += 1;
      if (row.player_name) entry.players.add(String(row.player_name).trim());
      if (row.opponent_name && !String(row.opponent_name).toLowerCase().includes('bot') && !String(row.opponent_name).toLowerCase().includes('computer')) {
        entry.players.add(String(row.opponent_name).trim());
      }
      entry.games.add(game);
    };

    doublesRows.forEach((r: any) => registerDay(r, 'doppelquote'));
    pdcRows.forEach((r: any) => registerDay(r, 'pdc'));
    fussballRows.forEach((r: any) => registerDay(r, 'fussball'));
    stellenCheckenRows.forEach((r: any) => registerDay(r, 'stellen_checken'));

    const availableArchiveDays: ArchiveTrainingDaySummary[] = Array.from(dayMap.entries())
      .map(([dStr, meta]) => ({
        dateStr: dStr,
        dayLabel: formatShortGermanDate(dStr),
        totalSessions: meta.sessionsCount,
        uniquePlayersCount: meta.players.size,
        gamesList: Array.from(meta.games),
      }))
      .sort((a, b) => b.dateStr.localeCompare(a.dateStr));

    const hasTodayData =
      doublesRows.some((r: any) => extractRowDate(r) === deTodayDateStr) ||
      pdcRows.some((r: any) => extractRowDate(r) === deTodayDateStr) ||
      stellenCheckenRows.some((r: any) => extractRowDate(r) === deTodayDateStr);

    const hasMonthData =
      doublesRows.some((r: any) => extractRowDate(r).slice(0, 7) === deCurrentMonthStr) ||
      pdcRows.some((r: any) => extractRowDate(r).slice(0, 7) === deCurrentMonthStr) ||
      stellenCheckenRows.some((r: any) => extractRowDate(r).slice(0, 7) === deCurrentMonthStr);

    // 3. Filter rows based on active timeframe
    let activeDoubles: any[] = [];
    let activePdc: any[] = [];
    let activeFussball: any[] = [];
    let activeStellenChecken: any[] = [];
    const humanFussball1vs1 = fussballRows.filter(isHuman1vs1Fussball);

    if (timeframe === 'today') {
      activeDoubles = doublesRows.filter((r: any) => extractRowDate(r) === deTodayDateStr);
      activePdc = pdcRows.filter((r: any) => extractRowDate(r) === deTodayDateStr);
      activeFussball = humanFussball1vs1.filter((r: any) => extractRowDate(r) === deTodayDateStr);
      activeStellenChecken = stellenCheckenRows.filter((r: any) => extractRowDate(r) === deTodayDateStr);
    } else if (timeframe === 'month') {
      activeDoubles = doublesRows.filter((r: any) => extractRowDate(r).slice(0, 7) === deCurrentMonthStr);
      activePdc = pdcRows.filter((r: any) => extractRowDate(r).slice(0, 7) === deCurrentMonthStr);
      activeFussball = humanFussball1vs1.filter((r: any) => extractRowDate(r).slice(0, 7) === deCurrentMonthStr);
      activeStellenChecken = stellenCheckenRows.filter((r: any) => extractRowDate(r).slice(0, 7) === deCurrentMonthStr);
    } else if (timeframe === 'all') {
      activeDoubles = doublesRows;
      activePdc = pdcRows;
      activeFussball = humanFussball1vs1;
      activeStellenChecken = stellenCheckenRows;
    } else if (timeframe === 'archive') {
      activeDoubles = doublesRows.filter((r: any) => extractRowDate(r) === selectedDateStr);
      activePdc = pdcRows.filter((r: any) => extractRowDate(r) === selectedDateStr);
      activeFussball = humanFussball1vs1.filter((r: any) => extractRowDate(r) === selectedDateStr);
      activeStellenChecken = stellenCheckenRows.filter((r: any) => extractRowDate(r) === selectedDateStr);
    }

    // 4. Build Doppelquote Leaderboard with Single-Session or Aggregated
    const todayDoppelLeaderboard: TvDoppelquoteRow[] = [];

    if (timeframe === 'today' || timeframe === 'archive') {
      // Jedes gespielte Spiel einzeln eintragen (chronologisch sortiert für Durchgangsnummer)
      const playerAttemptCounter = new Map<string, number>();

      for (const r of activeDoubles) {
        const pName = String(r.player_name || '').trim();
        if (!pName) continue;

        const attemptNr = (playerAttemptCounter.get(pName) || 0) + 1;
        playerAttemptCounter.set(pName, attemptNr);

        const darts = Number(r.total_darts || 0);
        const hits = Number(r.total_hits || 0);
        const quote_percent = darts > 0 ? Number(((hits / darts) * 100).toFixed(1)) : 0;

        const d20_darts = Number(r.d20_darts || 0);
        const d20_hits = Number(r.d20_hits || 0);
        const d20_quote = d20_darts > 0 ? Number(((d20_hits / d20_darts) * 100).toFixed(1)) : 0;

        const d10_darts = Number(r.d10_darts || 0);
        const d10_hits = Number(r.d10_hits || 0);
        const d10_quote = d10_darts > 0 ? Number(((d10_hits / d10_darts) * 100).toFixed(1)) : 0;

        const d16_darts = Number(r.d16_darts || 0);
        const d16_hits = Number(r.d16_hits || 0);
        const d16_quote = d16_darts > 0 ? Number(((d16_hits / d16_darts) * 100).toFixed(1)) : 0;

        const d8_darts = Number(r.d8_darts || 0);
        const d8_hits = Number(r.d8_hits || 0);
        const d8_quote = d8_darts > 0 ? Number(((d8_hits / d8_darts) * 100).toFixed(1)) : 0;

        const d4_darts = Number(r.d4_darts || 0);
        const d4_hits = Number(r.d4_hits || 0);
        const d4_quote = d4_darts > 0 ? Number(((d4_hits / d4_darts) * 100).toFixed(1)) : 0;

        const targetQuotes = [
          { name: 'D20', q: d20_quote },
          { name: 'D10', q: d10_quote },
          { name: 'D16', q: d16_quote },
          { name: 'D8', q: d8_quote },
          { name: 'D4', q: d4_quote },
        ];
        targetQuotes.sort((a, b) => b.q - a.q);
        const bestDoubleName =
          targetQuotes[0].q > 0
            ? `${targetQuotes[0].name} (${targetQuotes[0].q}%)`
            : (r.best_double || '-');

        todayDoppelLeaderboard.push({
          session_id: String(r.session_id || r.id || ''),
          player_name: pName,
          attempt_nr: attemptNr,
          attempt_label: `Durchgang #${attemptNr}`,
          time_label: formatTime(r.created_at),
          total_hits: hits,
          total_darts: darts,
          quote_percent,
          best_double: bestDoubleName,
          rank: 0,
          isShared: false,
          d20_quote,
          d10_quote,
          d16_quote,
          d8_quote,
          d4_quote,
          opponent_name: r.opponent_name ? String(r.opponent_name) : null,
        });
      }

      // Sortierung: Quote absteigend, dann Treffer absteigend
      todayDoppelLeaderboard.sort((a, b) => {
        if (b.quote_percent !== a.quote_percent) return b.quote_percent - a.quote_percent;
        if (b.total_hits !== a.total_hits) return b.total_hits - a.total_hits;
        return a.total_darts - b.total_darts;
      });
    } else {
      // MONAT / GESAMT: Kumulierte Aggregation pro Spieler
      const playerMap = new Map<string, any>();
      for (const r of activeDoubles) {
        const pName = String(r.player_name || '').trim();
        if (!pName) continue;
        if (!playerMap.has(pName)) {
          playerMap.set(pName, {
            player_name: pName,
            sessions_count: 0,
            total_hits: 0,
            total_darts: 0,
            d20_hits: 0, d20_darts: 0,
            d10_hits: 0, d10_darts: 0,
            d16_hits: 0, d16_darts: 0,
            d8_hits: 0, d8_darts: 0,
            d4_hits: 0, d4_darts: 0,
            best_double: '',
            lastTime: r.created_at,
          });
        }
        const p = playerMap.get(pName)!;
        p.sessions_count += 1;
        p.total_hits += Number(r.total_hits || 0);
        p.total_darts += Number(r.total_darts || 0);
        p.d20_hits += Number(r.d20_hits || 0); p.d20_darts += Number(r.d20_darts || 0);
        p.d10_hits += Number(r.d10_hits || 0); p.d10_darts += Number(r.d10_darts || 0);
        p.d16_hits += Number(r.d16_hits || 0); p.d16_darts += Number(r.d16_darts || 0);
        p.d8_hits += Number(r.d8_hits || 0); p.d8_darts += Number(r.d8_darts || 0);
        p.d4_hits += Number(r.d4_hits || 0); p.d4_darts += Number(r.d4_darts || 0);
        p.lastTime = r.created_at;
      }

      Array.from(playerMap.values()).forEach((p) => {
        const quote_percent = p.total_darts > 0 ? Number(((p.total_hits / p.total_darts) * 100).toFixed(1)) : 0;
        const d20_quote = p.d20_darts > 0 ? Number(((p.d20_hits / p.d20_darts) * 100).toFixed(1)) : 0;
        const d10_quote = p.d10_darts > 0 ? Number(((p.d10_hits / p.d10_darts) * 100).toFixed(1)) : 0;
        const d16_quote = p.d16_darts > 0 ? Number(((p.d16_hits / p.d16_darts) * 100).toFixed(1)) : 0;
        const d8_quote = p.d8_darts > 0 ? Number(((p.d8_hits / p.d8_darts) * 100).toFixed(1)) : 0;
        const d4_quote = p.d4_darts > 0 ? Number(((p.d4_hits / p.d4_darts) * 100).toFixed(1)) : 0;

        const targetQuotes = [
          { name: 'D20', q: d20_quote },
          { name: 'D10', q: d10_quote },
          { name: 'D16', q: d16_quote },
          { name: 'D8', q: d8_quote },
          { name: 'D4', q: d4_quote },
        ];
        targetQuotes.sort((a, b) => b.q - a.q);
        const bestDoubleName = targetQuotes[0].q > 0 ? `${targetQuotes[0].name} (${targetQuotes[0].q}%)` : '-';

        todayDoppelLeaderboard.push({
          session_id: p.player_name,
          player_name: p.player_name,
          attempt_nr: p.sessions_count,
          attempt_label: `${p.sessions_count} Spiele`,
          time_label: formatTime(p.lastTime),
          total_hits: p.total_hits,
          total_darts: p.total_darts,
          quote_percent,
          best_double: bestDoubleName,
          rank: 0,
          isShared: false,
          d20_quote,
          d10_quote,
          d16_quote,
          d8_quote,
          d4_quote,
        });
      });

      todayDoppelLeaderboard.sort((a, b) => {
        if (b.quote_percent !== a.quote_percent) return b.quote_percent - a.quote_percent;
        return b.total_hits - a.total_hits;
      });
    }

    // 5. Shared Rank Assignment for Doppelquote
    // "Sollten zwei Spieler punktgleich sein von den Werten her, sollen sie sich beide den Platz teilen."
    let currentDoppelRank = 1;
    for (let i = 0; i < todayDoppelLeaderboard.length; i++) {
      if (i > 0) {
        const prev = todayDoppelLeaderboard[i - 1];
        const curr = todayDoppelLeaderboard[i];
        const isTie = curr.quote_percent === prev.quote_percent && curr.total_hits === prev.total_hits;
        if (!isTie) {
          currentDoppelRank = i + 1;
        }
      }
      todayDoppelLeaderboard[i].rank = currentDoppelRank;
    }
    for (let i = 0; i < todayDoppelLeaderboard.length; i++) {
      const prevMatch = i > 0 &&
        todayDoppelLeaderboard[i].quote_percent === todayDoppelLeaderboard[i - 1].quote_percent &&
        todayDoppelLeaderboard[i].total_hits === todayDoppelLeaderboard[i - 1].total_hits;
      const nextMatch = i < todayDoppelLeaderboard.length - 1 &&
        todayDoppelLeaderboard[i].quote_percent === todayDoppelLeaderboard[i + 1].quote_percent &&
        todayDoppelLeaderboard[i].total_hits === todayDoppelLeaderboard[i + 1].total_hits;
      todayDoppelLeaderboard[i].isShared = prevMatch || nextMatch;
    }

    // 6. Build PDC Leaderboard with Single-Session or Aggregated
    const todayPdcLeaderboard: TvPdcRow[] = [];

    if (timeframe === 'today' || timeframe === 'archive') {
      const playerAttemptCounter = new Map<string, number>();

      for (const r of activePdc) {
        const pName = String(r.player_name || '').trim();
        if (!pName) continue;

        const attemptNr = (playerAttemptCounter.get(pName) || 0) + 1;
        playerAttemptCounter.set(pName, attemptNr);

        const totalScore = Number(r.total_score || 0);
        const part1 = Number(r.score_part1 || 0);
        const part2 = Number(r.score_part2 || 0);
        const part3 = Number(r.score_part3 || 0);
        const shanghais = Number(r.shanghai_count || 0);
        const doubles = Number(r.doubles_hit || 0);
        const badgeColor = String(r.badge_color || 'Weiß');

        todayPdcLeaderboard.push({
          session_id: String(r.session_id || r.id || ''),
          player_name: pName,
          attempt_nr: attemptNr,
          attempt_label: `Durchgang #${attemptNr}`,
          time_label: formatTime(r.created_at),
          best_score: totalScore,
          score_part1: part1,
          score_part2: part2,
          score_part3: part3,
          best_badge: badgeColor,
          total_shanghais: shanghais,
          best_doubles_hit: doubles,
          rank: 0,
          isShared: false,
          opponent_name: r.opponent_name ? String(r.opponent_name) : null,
        });
      }

      todayPdcLeaderboard.sort((a, b) => {
        if (b.best_score !== a.best_score) return b.best_score - a.best_score;
        if (b.total_shanghais !== a.total_shanghais) return b.total_shanghais - a.total_shanghais;
        return b.best_doubles_hit - a.best_doubles_hit;
      });
    } else {
      // MONAT / GESAMT
      const playerMap = new Map<string, any>();
      for (const r of activePdc) {
        const pName = String(r.player_name || '').trim();
        if (!pName) continue;
        if (!playerMap.has(pName)) {
          playerMap.set(pName, {
            player_name: pName,
            sessions_count: 0,
            best_score: 0,
            best_badge: 'Weiß',
            total_shanghais: 0,
            best_doubles_hit: 0,
            lastTime: r.created_at,
          });
        }
        const p = playerMap.get(pName)!;
        p.sessions_count += 1;
        const score = Number(r.total_score || 0);
        if (score >= p.best_score) {
          p.best_score = score;
          p.best_badge = String(r.badge_color || 'Weiß');
        }
        p.total_shanghais += Number(r.shanghai_count || 0);
        const d = Number(r.doubles_hit || 0);
        if (d > p.best_doubles_hit) p.best_doubles_hit = d;
        p.lastTime = r.created_at;
      }

      Array.from(playerMap.values()).forEach((p) => {
        todayPdcLeaderboard.push({
          session_id: p.player_name,
          player_name: p.player_name,
          attempt_nr: p.sessions_count,
          attempt_label: `${p.sessions_count} Spiele`,
          time_label: formatTime(p.lastTime),
          best_score: p.best_score,
          score_part1: 0,
          score_part2: 0,
          score_part3: 0,
          best_badge: p.best_badge,
          total_shanghais: p.total_shanghais,
          best_doubles_hit: p.best_doubles_hit,
          rank: 0,
          isShared: false,
        });
      });

      todayPdcLeaderboard.sort((a, b) => {
        if (b.best_score !== a.best_score) return b.best_score - a.best_score;
        return b.total_shanghais - a.total_shanghais;
      });
    }

    // 7. Shared Rank Assignment for PDC Challenge
    // "Sollten zwei Spieler punktgleich sein von den Werten her, sollen sie sich beide den Platz teilen."
    let currentPdcRank = 1;
    for (let i = 0; i < todayPdcLeaderboard.length; i++) {
      if (i > 0) {
        const prev = todayPdcLeaderboard[i - 1];
        const curr = todayPdcLeaderboard[i];
        const isTie = curr.best_score === prev.best_score;
        if (!isTie) {
          currentPdcRank = i + 1;
        }
      }
      todayPdcLeaderboard[i].rank = currentPdcRank;
    }
    for (let i = 0; i < todayPdcLeaderboard.length; i++) {
      const prevMatch = i > 0 && todayPdcLeaderboard[i].best_score === todayPdcLeaderboard[i - 1].best_score;
      const nextMatch = i < todayPdcLeaderboard.length - 1 && todayPdcLeaderboard[i].best_score === todayPdcLeaderboard[i + 1].best_score;
      todayPdcLeaderboard[i].isShared = prevMatch || nextMatch;
    }

    // 8. Build Fußball 1vs1 Leaderboard & Matches (Ausschließlich 1vs1, keine Computer-Spiele!)
    const fussballMap = new Map<string, {
      player_name: string;
      matches_count: number;
      wins: number;
      losses: number;
      goals_scored: number;
      goals_conceded: number;
      bull_hits: number;
      bull_attempts: number;
      double_hits: number;
      double_attempts: number;
      darts_thrown: number;
      last_time: any;
    }>();

    for (const r of activeFussball) {
      const pName = String(r.player_name || '').trim();
      if (!pName) continue;
      if (!fussballMap.has(pName)) {
        fussballMap.set(pName, {
          player_name: pName,
          matches_count: 0,
          wins: 0,
          losses: 0,
          goals_scored: 0,
          goals_conceded: 0,
          bull_hits: 0,
          bull_attempts: 0,
          double_hits: 0,
          double_attempts: 0,
          darts_thrown: 0,
          last_time: r.created_at,
        });
      }
      const entry = fussballMap.get(pName)!;
      entry.matches_count += 1;
      const isWin = Number(r.is_winner || 0) === 1;
      if (isWin) {
        entry.wins += 1;
      } else {
        entry.losses += 1;
      }
      entry.goals_scored += Number(r.goals_scored || 0);
      entry.goals_conceded += Number(r.goals_conceded || 0);
      entry.bull_hits += Number(r.bull_hits || 0);
      entry.bull_attempts += Number(r.bull_attempts || 0);
      entry.double_hits += Number(r.double_hits || 0);
      entry.double_attempts += Number(r.double_attempts || 0);
      entry.darts_thrown += Number(r.darts_thrown || 0);
      entry.last_time = r.created_at;
    }

    const todayFussballLeaderboard: TvFussballRow[] = Array.from(fussballMap.values()).map((p) => {
      const win_rate = p.matches_count > 0 ? Number(((p.wins / p.matches_count) * 100).toFixed(1)) : 0;
      const goal_diff = p.goals_scored - p.goals_conceded;
      const bull_quote = p.bull_attempts > 0 ? Number(((p.bull_hits / p.bull_attempts) * 100).toFixed(1)) : 0;
      const double_quote = p.double_attempts > 0 ? Number(((p.double_hits / p.double_attempts) * 100).toFixed(1)) : 0;

      return {
        player_name: p.player_name,
        matches_count: p.matches_count,
        wins: p.wins,
        losses: p.losses,
        win_rate,
        goals_scored: p.goals_scored,
        goals_conceded: p.goals_conceded,
        goal_diff,
        bull_hits: p.bull_hits,
        bull_attempts: p.bull_attempts,
        bull_quote,
        double_hits: p.double_hits,
        double_attempts: p.double_attempts,
        double_quote,
        darts_thrown: p.darts_thrown,
        rank: 0,
        isShared: false,
        last_time: formatTime(p.last_time),
      };
    });

    todayFussballLeaderboard.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
      if (b.goals_scored !== a.goals_scored) return b.goals_scored - a.goals_scored;
      return b.double_quote - a.double_quote;
    });

    // Shared Rank Assignment für Fußball (Gleichstand teilt den Platz)
    let currentFussballRank = 1;
    for (let i = 0; i < todayFussballLeaderboard.length; i++) {
      if (i > 0) {
        const prev = todayFussballLeaderboard[i - 1];
        const curr = todayFussballLeaderboard[i];
        const isTie = curr.wins === prev.wins && curr.goal_diff === prev.goal_diff && curr.goals_scored === prev.goals_scored;
        if (!isTie) {
          currentFussballRank = i + 1;
        }
      }
      todayFussballLeaderboard[i].rank = currentFussballRank;
    }
    for (let i = 0; i < todayFussballLeaderboard.length; i++) {
      const prevMatch = i > 0 &&
        todayFussballLeaderboard[i].wins === todayFussballLeaderboard[i - 1].wins &&
        todayFussballLeaderboard[i].goal_diff === todayFussballLeaderboard[i - 1].goal_diff &&
        todayFussballLeaderboard[i].goals_scored === todayFussballLeaderboard[i - 1].goals_scored;
      const nextMatch = i < todayFussballLeaderboard.length - 1 &&
        todayFussballLeaderboard[i].wins === todayFussballLeaderboard[i + 1].wins &&
        todayFussballLeaderboard[i].goal_diff === todayFussballLeaderboard[i + 1].goal_diff &&
        todayFussballLeaderboard[i].goals_scored === todayFussballLeaderboard[i + 1].goals_scored;
      todayFussballLeaderboard[i].isShared = prevMatch || nextMatch;
    }

    // 1vs1 Match Log List für Fußball
    const matchSessionMap = new Map<string, any[]>();
    for (const r of activeFussball) {
      const sId = String(r.session_id || r.id);
      if (!matchSessionMap.has(sId)) {
        matchSessionMap.set(sId, []);
      }
      matchSessionMap.get(sId)!.push(r);
    }

    const todayFussballMatches: TvFussballMatch[] = [];
    for (const [sId, group] of matchSessionMap.entries()) {
      if (group.length >= 2) {
        const p1 = group[0];
        const p2 = group[1];
        const p1Winner = Number(p1.is_winner || 0) === 1;
        const winnerName = p1Winner ? p1.player_name : p2.player_name;
        todayFussballMatches.push({
          id: String(p1.id || sId),
          session_id: sId,
          player1_name: p1.player_name,
          player2_name: p2.player_name,
          player1_goals: Number(p1.goals_scored || 0),
          player2_goals: Number(p2.goals_scored || 0),
          winner_name: winnerName,
          darts_thrown: Math.max(Number(p1.darts_thrown || 0), Number(p2.darts_thrown || 0)),
          time_label: formatTime(p1.created_at),
        });
      } else if (group.length === 1) {
        const p1 = group[0];
        const isWin = Number(p1.is_winner || 0) === 1;
        todayFussballMatches.push({
          id: String(p1.id || sId),
          session_id: sId,
          player1_name: p1.player_name,
          player2_name: p1.opponent_name || 'Gegner',
          player1_goals: Number(p1.goals_scored || 0),
          player2_goals: Number(p1.goals_conceded || 0),
          winner_name: isWin ? p1.player_name : (p1.opponent_name || 'Gegner'),
          darts_thrown: Number(p1.darts_thrown || 0),
          time_label: formatTime(p1.created_at),
        });
      }
    }
    todayFussballMatches.sort((a, b) => b.id.localeCompare(a.id));

    // 8b. Build Stellen & Checken Leaderboard
    const todayStellenCheckenLeaderboard: TvStellenCheckenRow[] = [];

    if (timeframe === 'today' || timeframe === 'archive') {
      const playerAttemptCounter = new Map<string, number>();

      for (const r of activeStellenChecken) {
        const pName = String(r.player_name || '').trim();
        if (!pName) continue;

        const attemptNr = (playerAttemptCounter.get(pName) || 0) + 1;
        playerAttemptCounter.set(pName, attemptNr);

        const rounds = Number(r.total_rounds || 15);
        const checks = Number(r.checks_count || 0);
        const pts = Number(r.points_scored || 0);
        const maxPts = Number(r.max_possible_points || 28);
        const presetId = Number(r.preset_id || 1);
        const quote_percent = rounds > 0 ? Number(((checks / rounds) * 100).toFixed(1)) : 0;

        todayStellenCheckenLeaderboard.push({
          session_id: String(r.session_id || r.id || ''),
          player_name: pName,
          opponent_name: r.opponent_name ? String(r.opponent_name) : null,
          game_mode: r.game_mode === '1vs1' ? '1vs1' : 'solo',
          preset_id: presetId,
          attempt_nr: attemptNr,
          attempt_label: `Durchgang #${attemptNr}`,
          time_label: formatTime(r.created_at),
          points_scored: pts,
          max_possible_points: maxPts,
          checks_count: checks,
          total_rounds: rounds,
          quote_percent,
          rank: 0,
          isShared: false,
        });
      }
    } else {
      // MONAT / GESAMT: Bestes Spiel pro Spieler + Anzahl Durchgänge
      const scMap = new Map<string, {
        player_name: string;
        sessions_count: number;
        best_points: number;
        max_possible_points: number;
        best_checks: number;
        total_rounds: number;
        best_preset_id: number;
        last_time: any;
      }>();

      for (const r of activeStellenChecken) {
        const pName = String(r.player_name || '').trim();
        if (!pName) continue;
        const pts = Number(r.points_scored || 0);
        const checks = Number(r.checks_count || 0);
        const rounds = Number(r.total_rounds || 15);
        const maxPts = Number(r.max_possible_points || 28);
        const presetId = Number(r.preset_id || 1);

        if (!scMap.has(pName)) {
          scMap.set(pName, {
            player_name: pName,
            sessions_count: 1,
            best_points: pts,
            max_possible_points: maxPts,
            best_checks: checks,
            total_rounds: rounds,
            best_preset_id: presetId,
            last_time: r.created_at,
          });
        } else {
          const entry = scMap.get(pName)!;
          entry.sessions_count += 1;
          if (pts > entry.best_points || (pts === entry.best_points && checks > entry.best_checks)) {
            entry.best_points = pts;
            entry.max_possible_points = maxPts;
            entry.best_checks = checks;
            entry.total_rounds = rounds;
            entry.best_preset_id = presetId;
          }
          entry.last_time = r.created_at;
        }
      }

      for (const p of scMap.values()) {
        const quote_percent =
          p.total_rounds > 0 ? Number(((p.best_checks / p.total_rounds) * 100).toFixed(1)) : 0;

        todayStellenCheckenLeaderboard.push({
          session_id: `agg_sc_${p.player_name}`,
          player_name: p.player_name,
          opponent_name: null,
          game_mode: 'solo',
          preset_id: p.best_preset_id,
          attempt_nr: p.sessions_count,
          attempt_label: `${p.sessions_count} ${p.sessions_count === 1 ? 'Spiel' : 'Spiele'} (Bestwert)`,
          time_label: formatTime(p.last_time),
          points_scored: p.best_points,
          max_possible_points: p.max_possible_points,
          checks_count: p.best_checks,
          total_rounds: p.total_rounds,
          quote_percent,
          rank: 0,
          isShared: false,
        });
      }
    }

    // Sortierung Stellen & Checken: Punkte absteigend, dann Checks absteigend
    todayStellenCheckenLeaderboard.sort((a, b) => {
      if (b.points_scored !== a.points_scored) return b.points_scored - a.points_scored;
      if (b.checks_count !== a.checks_count) return b.checks_count - a.checks_count;
      return b.quote_percent - a.quote_percent;
    });

    // Geteilte Ränge zuweisen
    let currentScRank = 1;
    for (let i = 0; i < todayStellenCheckenLeaderboard.length; i++) {
      if (i > 0) {
        const prev = todayStellenCheckenLeaderboard[i - 1];
        const curr = todayStellenCheckenLeaderboard[i];
        const isTie =
          curr.points_scored === prev.points_scored && curr.checks_count === prev.checks_count;
        if (!isTie) {
          currentScRank = i + 1;
        }
      }
      todayStellenCheckenLeaderboard[i].rank = currentScRank;
    }
    for (let i = 0; i < todayStellenCheckenLeaderboard.length; i++) {
      const prevMatch =
        i > 0 &&
        todayStellenCheckenLeaderboard[i].points_scored ===
          todayStellenCheckenLeaderboard[i - 1].points_scored &&
        todayStellenCheckenLeaderboard[i].checks_count ===
          todayStellenCheckenLeaderboard[i - 1].checks_count;
      const nextMatch =
        i < todayStellenCheckenLeaderboard.length - 1 &&
        todayStellenCheckenLeaderboard[i].points_scored ===
          todayStellenCheckenLeaderboard[i + 1].points_scored &&
        todayStellenCheckenLeaderboard[i].checks_count ===
          todayStellenCheckenLeaderboard[i + 1].checks_count;
      todayStellenCheckenLeaderboard[i].isShared = prevMatch || nextMatch;
    }

    // 9. Build detailed archive summary for the selected date if timeframe is archive or on demand
    let currentArchiveDayDetail: ArchiveDayDetail | null = null;
    const targetDayForDetail = timeframe === 'archive' ? selectedDateStr : (availableArchiveDays[0]?.dateStr || deTodayDateStr);

    if (targetDayForDetail) {
      const dayDoubles = doublesRows.filter((r: any) => extractRowDate(r) === targetDayForDetail);
      const dayPdc = pdcRows.filter((r: any) => extractRowDate(r) === targetDayForDetail);
      const dayFussball = fussballRows.filter((r: any) => extractRowDate(r) === targetDayForDetail);
      const dayStellenChecken = stellenCheckenRows.filter((r: any) => extractRowDate(r) === targetDayForDetail);

      const activePlayersSet = new Set<string>();
      dayDoubles.forEach((r: any) => {
        if (r.player_name) activePlayersSet.add(String(r.player_name).trim());
        if (r.opponent_name && !String(r.opponent_name).toLowerCase().includes('bot') && !String(r.opponent_name).toLowerCase().includes('computer')) {
          activePlayersSet.add(String(r.opponent_name).trim());
        }
      });
      dayPdc.forEach((r: any) => {
        if (r.player_name) activePlayersSet.add(String(r.player_name).trim());
        if (r.opponent_name && !String(r.opponent_name).toLowerCase().includes('bot') && !String(r.opponent_name).toLowerCase().includes('computer')) {
          activePlayersSet.add(String(r.opponent_name).trim());
        }
      });
      dayFussball.forEach((r: any) => {
        if (r.player_name) activePlayersSet.add(String(r.player_name).trim());
        if (r.opponent_name && !String(r.opponent_name).toLowerCase().includes('bot') && !String(r.opponent_name).toLowerCase().includes('computer')) {
          activePlayersSet.add(String(r.opponent_name).trim());
        }
      });
      dayStellenChecken.forEach((r: any) => {
        if (r.player_name) activePlayersSet.add(String(r.player_name).trim());
        if (r.opponent_name) activePlayersSet.add(String(r.opponent_name).trim());
      });

      currentArchiveDayDetail = {
        dateStr: targetDayForDetail,
        fullDateLabel: formatGermanDateLabel(targetDayForDetail),
        totalSessions: dayDoubles.length + dayPdc.length + dayFussball.length + dayStellenChecken.length,
        activePlayers: Array.from(activePlayersSet),
        doppelGames: dayDoubles.map((r: any) => {
          const d = Number(r.total_darts || 0);
          const h = Number(r.total_hits || 0);
          return {
            id: String(r.id || r.session_id),
            playerName: String(r.player_name || ''),
            opponentName: r.opponent_name ? String(r.opponent_name) : null,
            hits: h,
            darts: d,
            quotePercent: d > 0 ? Number(((h / d) * 100).toFixed(1)) : 0,
            bestDouble: String(r.best_double || '-'),
            time: formatTime(r.created_at),
          };
        }),
        pdcGames: dayPdc.map((r: any) => ({
          id: String(r.id || r.session_id),
          playerName: String(r.player_name || ''),
          opponentName: r.opponent_name ? String(r.opponent_name) : null,
          score: Number(r.total_score || 0),
          badge: String(r.badge_color || 'Weiß'),
          shanghais: Number(r.shanghai_count || 0),
          doubles: Number(r.doubles_hit || 0),
          time: formatTime(r.created_at),
        })),
        fussballGames: dayFussball.filter(isHuman1vs1Fussball).map((r: any) => ({
          id: String(r.id || r.session_id),
          playerName: String(r.player_name || ''),
          opponentName: String(r.opponent_name || 'Gegner'),
          isWinner: Number(r.is_winner || 0) === 1,
          goalsScored: Number(r.goals_scored || 0),
          goalsConceded: Number(r.goals_conceded || 0),
          dartsThrown: Number(r.darts_thrown || 0),
          time: formatTime(r.created_at),
        })),
        stellenCheckenGames: dayStellenChecken.map((r: any) => {
          const rds = Number(r.total_rounds || 15);
          const chks = Number(r.checks_count || 0);
          return {
            id: String(r.id || r.session_id),
            playerName: String(r.player_name || ''),
            opponentName: r.opponent_name ? String(r.opponent_name) : null,
            gameMode: String(r.game_mode || 'solo'),
            presetId: Number(r.preset_id || 1),
            pointsScored: Number(r.points_scored || 0),
            maxPossiblePoints: Number(r.max_possible_points || 28),
            checksCount: chks,
            totalRounds: rds,
            quotePercent: rds > 0 ? Number(((chks / rds) * 100).toFixed(1)) : 0,
            time: formatTime(r.created_at),
          };
        }),
      };
    }

    return {
      timeframe,
      selectedDateStr,
      monthLabel,
      todayDoppelLeaderboard,
      todayPdcLeaderboard,
      todayFussballLeaderboard,
      todayFussballMatches,
      todayStellenCheckenLeaderboard,
      hasTodayData,
      hasMonthData,
      availableArchiveDays,
      currentArchiveDayDetail,
      lastUpdate: new Intl.DateTimeFormat('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Europe/Berlin',
      }).format(now),
    };
  } catch (error) {
    console.error('Fehler beim Abrufen der Unified TV Board Daten:', error);
    return {
      timeframe,
      selectedDateStr,
      monthLabel,
      todayDoppelLeaderboard: [],
      todayPdcLeaderboard: [],
      todayFussballLeaderboard: [],
      todayFussballMatches: [],
      todayStellenCheckenLeaderboard: [],
      hasTodayData: false,
      hasMonthData: false,
      availableArchiveDays: [],
      currentArchiveDayDetail: null,
      lastUpdate: '',
    };
  }
}
