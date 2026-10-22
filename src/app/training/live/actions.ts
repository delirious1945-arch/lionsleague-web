'use server';

import { sql } from '@/lib/db';
import {
  UnifiedTvTimeframe,
  UnifiedTvBoardData,
  TvDoppelquoteRow,
  TvPdcRow,
  ArchiveTrainingDaySummary,
  ArchiveDayDetail,
} from './types';

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
    // 1. Fetch raw data in parallel
    const [rawDoubles, rawPdc, rawFussball] = await Promise.all([
      sql`SELECT * FROM training_doubles ORDER BY created_at ASC`,
      sql`SELECT * FROM training_pdc_challenge ORDER BY created_at ASC`,
      sql`SELECT * FROM training_fussball ORDER BY created_at ASC`,
    ]);

    // Streng reguläre Spiele filtern (Abgebrochene Spiele rausnehmen)
    const doublesRows = rawDoubles.filter((r: any) => Number(r.is_aborted || 0) === 0);
    const pdcRows = rawPdc.filter((r: any) => Number(r.is_aborted || 0) === 0);
    const fussballRows = rawFussball.filter((r: any) => Number(r.is_aborted || 0) === 0);

    // 2. Identify available archive days across all 3 game types
    const dayMap = new Map<string, {
      sessionsCount: number;
      players: Set<string>;
      games: Set<'doppelquote' | 'pdc' | 'fussball'>;
    }>();

    const registerDay = (row: any, game: 'doppelquote' | 'pdc' | 'fussball') => {
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
      pdcRows.some((r: any) => extractRowDate(r) === deTodayDateStr);

    const hasMonthData =
      doublesRows.some((r: any) => extractRowDate(r).slice(0, 7) === deCurrentMonthStr) ||
      pdcRows.some((r: any) => extractRowDate(r).slice(0, 7) === deCurrentMonthStr);

    // 3. Filter rows based on active timeframe
    let activeDoubles: any[] = [];
    let activePdc: any[] = [];

    if (timeframe === 'today') {
      activeDoubles = doublesRows.filter((r: any) => extractRowDate(r) === deTodayDateStr);
      activePdc = pdcRows.filter((r: any) => extractRowDate(r) === deTodayDateStr);
    } else if (timeframe === 'month') {
      activeDoubles = doublesRows.filter((r: any) => extractRowDate(r).slice(0, 7) === deCurrentMonthStr);
      activePdc = pdcRows.filter((r: any) => extractRowDate(r).slice(0, 7) === deCurrentMonthStr);
    } else if (timeframe === 'all') {
      activeDoubles = doublesRows;
      activePdc = pdcRows;
    } else if (timeframe === 'archive') {
      activeDoubles = doublesRows.filter((r: any) => extractRowDate(r) === selectedDateStr);
      activePdc = pdcRows.filter((r: any) => extractRowDate(r) === selectedDateStr);
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

    // 8. Build detailed archive summary for the selected date if timeframe is archive or on demand
    let currentArchiveDayDetail: ArchiveDayDetail | null = null;
    const targetDayForDetail = timeframe === 'archive' ? selectedDateStr : (availableArchiveDays[0]?.dateStr || deTodayDateStr);

    if (targetDayForDetail) {
      const dayDoubles = doublesRows.filter((r: any) => extractRowDate(r) === targetDayForDetail);
      const dayPdc = pdcRows.filter((r: any) => extractRowDate(r) === targetDayForDetail);
      const dayFussball = fussballRows.filter((r: any) => extractRowDate(r) === targetDayForDetail);

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

      currentArchiveDayDetail = {
        dateStr: targetDayForDetail,
        fullDateLabel: formatGermanDateLabel(targetDayForDetail),
        totalSessions: dayDoubles.length + dayPdc.length + dayFussball.length,
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
        fussballGames: dayFussball.map((r: any) => ({
          id: String(r.id || r.session_id),
          playerName: String(r.player_name || ''),
          opponentName: String(r.opponent_name || 'Computer'),
          isWinner: Number(r.is_winner || 0) === 1,
          goalsScored: Number(r.goals_scored || 0),
          goalsConceded: Number(r.goals_conceded || 0),
          dartsThrown: Number(r.darts_thrown || 0),
          time: formatTime(r.created_at),
        })),
      };
    }

    return {
      timeframe,
      selectedDateStr,
      monthLabel,
      todayDoppelLeaderboard,
      todayPdcLeaderboard,
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
      hasTodayData: false,
      hasMonthData: false,
      availableArchiveDays: [],
      currentArchiveDayDetail: null,
      lastUpdate: '',
    };
  }
}
