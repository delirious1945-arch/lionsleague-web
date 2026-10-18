'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export interface TrainingSessionData {
  session_id: string;
  player_id?: number | null;
  player_name: string;
  opponent_name?: string | null;
  game_mode: string;
  training_date: string;
  d20_hits: number;
  d20_darts: number;
  d20_quote: number;
  d10_hits: number;
  d10_darts: number;
  d10_quote: number;
  d16_hits: number;
  d16_darts: number;
  d16_quote: number;
  d8_hits: number;
  d8_darts: number;
  d8_quote: number;
  d4_hits: number;
  d4_darts: number;
  d4_quote: number;
  total_hits: number;
  total_darts: number;
  total_quote: number;
  best_double: string;
  notes?: string;
  is_winner?: number;
  is_aborted?: number;
}

export async function saveTrainingSessionAction(sessions: TrainingSessionData[]) {
  try {
    for (const s of sessions) {
      await sql`
        INSERT INTO training_doubles (
          session_id, player_id, player_name, opponent_name, game_mode, training_date,
          d20_hits, d20_darts, d20_quote,
          d10_hits, d10_darts, d10_quote,
          d16_hits, d16_darts, d16_quote,
          d8_hits, d8_darts, d8_quote,
          d4_hits, d4_darts, d4_quote,
          total_hits, total_darts, total_quote,
          best_double, notes, is_winner, is_aborted
        ) VALUES (
          ${s.session_id}, ${s.player_id ?? null}, ${s.player_name}, ${s.opponent_name ?? null}, ${s.game_mode}, ${s.training_date},
          ${s.d20_hits}, ${s.d20_darts}, ${s.d20_quote},
          ${s.d10_hits}, ${s.d10_darts}, ${s.d10_quote},
          ${s.d16_hits}, ${s.d16_darts}, ${s.d16_quote},
          ${s.d8_hits}, ${s.d8_darts}, ${s.d8_quote},
          ${s.d4_hits}, ${s.d4_darts}, ${s.d4_quote},
          ${s.total_hits}, ${s.total_darts}, ${s.total_quote},
          ${s.best_double}, ${s.notes ?? ''}, ${s.is_winner ?? 0}, ${s.is_aborted ?? 0}
        )
      `;
    }
    revalidatePath('/doppelquote');
    revalidatePath('/analytics');
    return { success: true };
  } catch (error: any) {
    console.error('Fehler beim Speichern in Supabase:', error);
    return { success: false, error: error.message || 'Speichern fehlgeschlagen' };
  }
}

export async function getTrainingHistoryAction(limit: number = 50) {
  try {
    const rows = await sql`
      SELECT *
      FROM training_doubles
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows.map((r: any) => ({
      id: Number(r.id),
      session_id: String(r.session_id || ''),
      player_name: String(r.player_name),
      opponent_name: r.opponent_name ? String(r.opponent_name) : null,
      game_mode: String(r.game_mode),
      training_date: String(r.training_date),
      total_hits: Number(r.total_hits),
      total_darts: Number(r.total_darts),
      total_quote: Number(r.total_quote),
      best_double: String(r.best_double || ''),
      notes: String(r.notes || ''),
      is_winner: Number(r.is_winner || 0),
      is_aborted: Number(r.is_aborted || 0),
      created_at: String(r.created_at)
    }));
  } catch (error) {
    console.error('Fehler beim Laden der Trainings-Historie:', error);
    return [];
  }
}

export async function recordAbortedSessionAction(data: {
  player_name: string;
  opponent_name?: string | null;
  game_mode: string;
  total_hits: number;
  total_darts: number;
  reason?: string;
}) {
  try {
    const sessionId = 'aborted_' + Date.now();
    const dateStr = new Date().toISOString();
    const quote = data.total_darts > 0 ? data.total_hits / data.total_darts : 0;
    const noteText = data.reason || 'Vorzeitiger Spielabbruch';

    await sql`
      INSERT INTO training_doubles (
        session_id, player_name, opponent_name, game_mode, training_date,
        d20_hits, d20_darts, d20_quote,
        d10_hits, d10_darts, d10_quote,
        d16_hits, d16_darts, d16_quote,
        d8_hits, d8_darts, d8_quote,
        d4_hits, d4_darts, d4_quote,
        total_hits, total_darts, total_quote,
        best_double, notes, is_winner, is_aborted
      ) VALUES (
        ${sessionId}, ${data.player_name}, ${data.opponent_name ?? null}, ${data.game_mode}, ${dateStr},
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        ${data.total_hits}, ${data.total_darts}, ${quote},
        'Abgebrochen', ${noteText}, 0, 1
      )
    `;
    revalidatePath('/doppelquote');
    return { success: true };
  } catch (error: any) {
    console.error('Fehler beim Protokollieren des Spielabbruchs:', error);
    return { success: false, error: error.message };
  }
}

export interface PlayerOverallRank {
  player_name: string;
  sessions_count: number;
  total_hits: number;
  total_darts: number;
  quote_percent: number;
  best_session_quote: number;
  best_double: string;
  rank: number;
  d20_quote: number;
  d10_quote: number;
  d16_quote: number;
  d8_quote: number;
  d4_quote: number;
}

export interface TargetLeader {
  target: 'D20' | 'D10' | 'D16' | 'D8' | 'D4';
  player_name: string;
  quote_percent: number;
  hits: number;
  darts: number;
}

export interface LiveRankingResult {
  overallRanking: PlayerOverallRank[];
  targetRankings: {
    D20: TargetLeader[];
    D10: TargetLeader[];
    D16: TargetLeader[];
    D8: TargetLeader[];
    D4: TargetLeader[];
  };
  totalSessions: number;
  totalDartsThrown: number;
  hasTodayData: boolean;
  filterUsed: 'today' | 'all';
  lastUpdate: string;
}

export async function getLiveDoppelquoteRankingAction(
  filter: 'today' | 'all' = 'today'
): Promise<LiveRankingResult> {
  try {
    const rawRows = await sql`
      SELECT *
      FROM training_doubles
      ORDER BY created_at DESC
    `;

    // Streng reguläre Spiele fürs Ranking filtern: Abgebrochene Spiele werden NICHT im TV-Ranking gewertet!
    const allRows = rawRows.filter((r: any) => Number(r.is_aborted || 0) === 0);

    const todayDateStr = new Date().toISOString().split('T')[0];

    // Prüfen, ob heute Daten vorhanden sind
    const todayRows = allRows.filter((r: any) => {
      const rowDate = r.training_date ? String(r.training_date).split('T')[0] : '';
      const createdDate = r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '';
      return rowDate === todayDateStr || createdDate === todayDateStr;
    });

    const hasTodayData = todayRows.length > 0;
    // Wenn heute gewählt ist, aber noch keine Daten existieren, Fallback auf alle oder leere Menge
    const activeRows = filter === 'today' ? todayRows : allRows;

    // Aggregation pro Spieler
    const playerMap = new Map<
      string,
      {
        player_name: string;
        sessions_count: number;
        total_hits: number;
        total_darts: number;
        best_session_quote: number;
        d20_hits: number;
        d20_darts: number;
        d10_hits: number;
        d10_darts: number;
        d16_hits: number;
        d16_darts: number;
        d8_hits: number;
        d8_darts: number;
        d4_hits: number;
        d4_darts: number;
      }
    >();

    for (const r of activeRows) {
      const pName = String(r.player_name || '').trim();
      if (!pName) continue;

      if (!playerMap.has(pName)) {
        playerMap.set(pName, {
          player_name: pName,
          sessions_count: 0,
          total_hits: 0,
          total_darts: 0,
          best_session_quote: 0,
          d20_hits: 0,
          d20_darts: 0,
          d10_hits: 0,
          d10_darts: 0,
          d16_hits: 0,
          d16_darts: 0,
          d8_hits: 0,
          d8_darts: 0,
          d4_hits: 0,
          d4_darts: 0,
        });
      }

      const p = playerMap.get(pName)!;
      p.sessions_count += 1;
      p.total_hits += Number(r.total_hits || 0);
      p.total_darts += Number(r.total_darts || 0);

      // Quote in Prozent (r.total_quote ist 0.0 bis 1.0)
      const sessionQuote = Number(r.total_quote || 0) * 100;
      if (sessionQuote > p.best_session_quote) {
        p.best_session_quote = sessionQuote;
      }

      p.d20_hits += Number(r.d20_hits || 0);
      p.d20_darts += Number(r.d20_darts || 0);
      p.d10_hits += Number(r.d10_hits || 0);
      p.d10_darts += Number(r.d10_darts || 0);
      p.d16_hits += Number(r.d16_hits || 0);
      p.d16_darts += Number(r.d16_darts || 0);
      p.d8_hits += Number(r.d8_hits || 0);
      p.d8_darts += Number(r.d8_darts || 0);
      p.d4_hits += Number(r.d4_hits || 0);
      p.d4_darts += Number(r.d4_darts || 0);
    }

    // Gesamtranking berechnen
    const overallRanking: PlayerOverallRank[] = Array.from(playerMap.values()).map(
      (p) => {
        const quote_percent =
          p.total_darts > 0 ? (p.total_hits / p.total_darts) * 100 : 0;

        const d20_quote =
          p.d20_darts > 0 ? (p.d20_hits / p.d20_darts) * 100 : 0;
        const d10_quote =
          p.d10_darts > 0 ? (p.d10_hits / p.d10_darts) * 100 : 0;
        const d16_quote =
          p.d16_darts > 0 ? (p.d16_hits / p.d16_darts) * 100 : 0;
        const d8_quote =
          p.d8_darts > 0 ? (p.d8_hits / p.d8_darts) * 100 : 0;
        const d4_quote =
          p.d4_darts > 0 ? (p.d4_hits / p.d4_darts) * 100 : 0;

        // Ermittlung der besten Zahl
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
            ? `${targetQuotes[0].name} (${targetQuotes[0].q.toFixed(1)}%)`
            : '-';

        return {
          player_name: p.player_name,
          sessions_count: p.sessions_count,
          total_hits: p.total_hits,
          total_darts: p.total_darts,
          quote_percent,
          best_session_quote: p.best_session_quote,
          best_double: bestDoubleName,
          rank: 0,
          d20_quote,
          d10_quote,
          d16_quote,
          d8_quote,
          d4_quote,
        };
      }
    );

    // Sortierung nach Gesamtquote absteigend, bei Gleichstand Treffer
    overallRanking.sort((a, b) => {
      if (b.quote_percent !== a.quote_percent) {
        return b.quote_percent - a.quote_percent;
      }
      return b.total_hits - a.total_hits;
    });

    overallRanking.forEach((p, idx) => {
      p.rank = idx + 1;
    });

    // Ranking pro Zahl / Doppel (D20, D10, D16, D8, D4)
    const buildTargetRanking = (
      target: 'D20' | 'D10' | 'D16' | 'D8' | 'D4',
      quoteKey: 'd20_quote' | 'd10_quote' | 'd16_quote' | 'd8_quote' | 'd4_quote',
      hitsKey: 'd20_hits' | 'd10_hits' | 'd16_hits' | 'd8_hits' | 'd4_hits',
      dartsKey: 'd20_darts' | 'd10_darts' | 'd16_darts' | 'd8_darts' | 'd4_darts'
    ): TargetLeader[] => {
      const list: TargetLeader[] = [];
      for (const p of playerMap.values()) {
        const darts = p[dartsKey];
        if (darts > 0) {
          const hits = p[hitsKey];
          const quote_percent = (hits / darts) * 100;
          list.push({
            target,
            player_name: p.player_name,
            quote_percent,
            hits,
            darts,
          });
        }
      }
      list.sort((a, b) => {
        if (b.quote_percent !== a.quote_percent) {
          return b.quote_percent - a.quote_percent;
        }
        return b.hits - a.hits;
      });
      return list;
    };

    const targetRankings = {
      D20: buildTargetRanking('D20', 'd20_quote', 'd20_hits', 'd20_darts'),
      D10: buildTargetRanking('D10', 'd10_quote', 'd10_hits', 'd10_darts'),
      D16: buildTargetRanking('D16', 'd16_quote', 'd16_hits', 'd16_darts'),
      D8: buildTargetRanking('D8', 'd8_quote', 'd8_hits', 'd8_darts'),
      D4: buildTargetRanking('D4', 'd4_quote', 'd4_hits', 'd4_darts'),
    };

    const totalDartsThrown = activeRows.reduce(
      (acc: number, r: any) => acc + Number(r.total_darts || 0),
      0
    );

    return {
      overallRanking,
      targetRankings,
      totalSessions: activeRows.length,
      totalDartsThrown,
      hasTodayData,
      filterUsed: filter,
      lastUpdate: new Date().toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };
  } catch (error) {
    console.error('Fehler in getLiveDoppelquoteRankingAction:', error);
    return {
      overallRanking: [],
      targetRankings: { D20: [], D10: [], D16: [], D8: [], D4: [] },
      totalSessions: 0,
      totalDartsThrown: 0,
      hasTodayData: false,
      filterUsed: filter,
      lastUpdate: new Date().toLocaleTimeString('de-DE'),
    };
  }
}

