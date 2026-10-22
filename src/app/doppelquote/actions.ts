'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getSessionAction } from '@/app/actions';
import { sanitizeTrainingDate } from '@/lib/dateUtils';

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
  estimated_quote?: number | null;
}

export async function saveTrainingSessionAction(sessions: TrainingSessionData[]) {
  try {
    for (const s of sessions) {
      const validTrainingDate = sanitizeTrainingDate(s.training_date);
      const existing = await sql`
        SELECT id FROM training_doubles 
        WHERE session_id = ${s.session_id} AND player_name = ${s.player_name}
        LIMIT 1
      `;

      if (existing.length > 0) {
        // Bestehenden Eintrag mit gleicher Session-ID aktualisieren statt Duplikat einzufügen
        await sql`
          UPDATE training_doubles SET
            player_id = ${s.player_id ?? null},
            opponent_name = ${s.opponent_name ?? null},
            game_mode = ${s.game_mode},
            training_date = ${validTrainingDate},
            d20_hits = ${s.d20_hits}, d20_darts = ${s.d20_darts}, d20_quote = ${s.d20_quote},
            d10_hits = ${s.d10_hits}, d10_darts = ${s.d10_darts}, d10_quote = ${s.d10_quote},
            d16_hits = ${s.d16_hits}, d16_darts = ${s.d16_darts}, d16_quote = ${s.d16_quote},
            d8_hits = ${s.d8_hits}, d8_darts = ${s.d8_darts}, d8_quote = ${s.d8_quote},
            d4_hits = ${s.d4_hits}, d4_darts = ${s.d4_darts}, d4_quote = ${s.d4_quote},
            total_hits = ${s.total_hits}, total_darts = ${s.total_darts}, total_quote = ${s.total_quote},
            best_double = ${s.best_double}, notes = ${s.notes ?? ''}, is_winner = ${s.is_winner ?? 0}, is_aborted = ${s.is_aborted ?? 0},
            estimated_quote = ${s.estimated_quote ?? null}
          WHERE id = ${existing[0].id}
        `;
      } else {
        await sql`
          INSERT INTO training_doubles (
            session_id, player_id, player_name, opponent_name, game_mode, training_date,
            d20_hits, d20_darts, d20_quote,
            d10_hits, d10_darts, d10_quote,
            d16_hits, d16_darts, d16_quote,
            d8_hits, d8_darts, d8_quote,
            d4_hits, d4_darts, d4_quote,
            total_hits, total_darts, total_quote,
            best_double, notes, is_winner, is_aborted,
            estimated_quote
          ) VALUES (
            ${s.session_id}, ${s.player_id ?? null}, ${s.player_name}, ${s.opponent_name ?? null}, ${s.game_mode}, ${validTrainingDate},
            ${s.d20_hits}, ${s.d20_darts}, ${s.d20_quote},
            ${s.d10_hits}, ${s.d10_darts}, ${s.d10_quote},
            ${s.d16_hits}, ${s.d16_darts}, ${s.d16_quote},
            ${s.d8_hits}, ${s.d8_darts}, ${s.d8_quote},
            ${s.d4_hits}, ${s.d4_darts}, ${s.d4_quote},
            ${s.total_hits}, ${s.total_darts}, ${s.total_quote},
            ${s.best_double}, ${s.notes ?? ''}, ${s.is_winner ?? 0}, ${s.is_aborted ?? 0},
            ${s.estimated_quote ?? null}
          )
        `;
      }
    }
    revalidatePath('/doppelquote');
    revalidatePath('/doppelquote/live');
    revalidatePath('/training');
    revalidatePath('/analytics');
    return { success: true };
  } catch (error: any) {
    console.error('Fehler beim Speichern in Supabase:', error);
    return { success: false, error: error.message || 'Speichern fehlgeschlagen' };
  }
}

export async function getTrainingHistoryAction(limit: number = 100, specificPlayer?: string) {
  try {
    const session = await getSessionAction();
    const isAdmin = session?.role === 'admin';
    const userName = specificPlayer?.trim() || session?.name?.trim();

    let rows: any[] = [];
    if (isAdmin && !specificPlayer) {
      rows = await sql`
        SELECT *
        FROM training_doubles
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else if (isAdmin && specificPlayer) {
      rows = await sql`
        SELECT *
        FROM training_doubles
        WHERE LOWER(player_name) = LOWER(${specificPlayer})
           OR LOWER(COALESCE(opponent_name, '')) = LOWER(${specificPlayer})
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else if (userName) {
      rows = await sql`
        SELECT *
        FROM training_doubles
        WHERE COALESCE(is_aborted, 0) = 0
          AND (LOWER(player_name) = LOWER(${userName}) OR LOWER(COALESCE(opponent_name, '')) = LOWER(${userName}))
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else {
      rows = [];
    }
    return rows.map((r: any) => ({
      id: Number(r.id),
      session_id: String(r.session_id || ''),
      player_name: String(r.player_name),
      opponent_name: r.opponent_name ? String(r.opponent_name) : null,
      game_mode: String(r.game_mode),
      training_date: String(r.training_date),
      d20_hits: Number(r.d20_hits || 0),
      d20_darts: Number(r.d20_darts || 0),
      d20_quote: Number(r.d20_quote || 0),
      d10_hits: Number(r.d10_hits || 0),
      d10_darts: Number(r.d10_darts || 0),
      d10_quote: Number(r.d10_quote || 0),
      d16_hits: Number(r.d16_hits || 0),
      d16_darts: Number(r.d16_darts || 0),
      d16_quote: Number(r.d16_quote || 0),
      d8_hits: Number(r.d8_hits || 0),
      d8_darts: Number(r.d8_darts || 0),
      d8_quote: Number(r.d8_quote || 0),
      d4_hits: Number(r.d4_hits || 0),
      d4_darts: Number(r.d4_darts || 0),
      d4_quote: Number(r.d4_quote || 0),
      total_hits: Number(r.total_hits),
      total_darts: Number(r.total_darts),
      total_quote: Number(r.total_quote),
      best_double: String(r.best_double || ''),
      notes: String(r.notes || ''),
      is_winner: Number(r.is_winner || 0),
      is_aborted: Number(r.is_aborted || 0),
      estimated_quote:
        r.estimated_quote !== null && r.estimated_quote !== undefined
          ? Number(r.estimated_quote)
          : null,
      created_at: String(r.created_at)
    }));
  } catch (error) {
    console.error('Fehler beim Laden der Trainings-Historie:', error);
    return [];
  }
}

export async function updateEstimatedDoubleQuoteAction(playerName: string, estimatedQuote: number) {
  try {
    const val = Math.round(Number(estimatedQuote));
    if (isNaN(val) || val < 1 || val > 100) {
      return { success: false, error: 'Bitte gib eine ganze Zahl zwischen 1 und 100 ein.' };
    }
    const cleanName = playerName.trim();
    let result = await sql`
      UPDATE players
      SET estimated_double_quote = ${val}
      WHERE LOWER(TRIM(name)) = LOWER(${cleanName})
      RETURNING id, name, estimated_double_quote
    `;

    if (result.length === 0) {
      // Fallback: ILIKE Suche falls minimale Unterschiede existieren
      result = await sql`
        UPDATE players
        SET estimated_double_quote = ${val}
        WHERE name ILIKE ${cleanName}
        RETURNING id, name, estimated_double_quote
      `;
    }

    revalidatePath('/doppelquote');
    revalidatePath('/doppelquote/live');
    revalidatePath('/training');
    revalidatePath('/verwaltung');
    return { success: true, estimatedQuote: val, affectedPlayer: result[0]?.name || cleanName };
  } catch (error: any) {
    console.error('Fehler beim Speichern der Doppelquoten-Einschätzung in Supabase:', error);
    return { success: false, error: error.message || 'Fehler beim Speichern in der Datenbank' };
  }
}

export interface ReEstimateCheckResult {
  needsReEstimate: boolean;
  canEdit: boolean;
  isLocked: boolean;
  type: 'none' | 'unlocked_increase' | 'unlocked_decrease' | 'locked';
  playerName: string;
  currentEstimate: number;
  recentGamesCount: number;
  recentQuotes: number[];
  averageRecentQuote: number;
  suggestedEstimate: number;
  reason?: string;
  lockReason?: string;
}

/**
 * Prüft, ob der Ändern-Button für einen Spieler gesperrt oder freigeschaltet ist.
 * Freigeschaltet nur wenn:
 * 1. Dauerhaft drüber oder +-1% zum Wert der Einschätzung (nach mind. 2 Spielen)
 * 2. Quote zu oft verfehlt: dauerhaft 5-7 Spiele schlechter als 8% vom Wert der Einschätzung
 */
export async function checkPlayerNeedsReEstimateAction(playerName: string): Promise<ReEstimateCheckResult> {
  const cleanName = playerName ? playerName.trim() : '';
  if (!cleanName) {
    return {
      needsReEstimate: false,
      canEdit: true,
      isLocked: false,
      type: 'none',
      playerName: '',
      currentEstimate: 0,
      recentGamesCount: 0,
      recentQuotes: [],
      averageRecentQuote: 0,
      suggestedEstimate: 0,
    };
  }

  try {
    // 1. Aktuelle hinterlegte Schätzung aus der Datenbank holen
    const pRows = await sql`
      SELECT id, name, estimated_double_quote 
      FROM players 
      WHERE LOWER(TRIM(name)) = LOWER(${cleanName})
      LIMIT 1;
    `;

    if (pRows.length === 0 || pRows[0].estimated_double_quote === null || pRows[0].estimated_double_quote === undefined) {
      return {
        needsReEstimate: false,
        canEdit: true,
        isLocked: false,
        type: 'none',
        playerName: cleanName,
        currentEstimate: 0,
        recentGamesCount: 0,
        recentQuotes: [],
        averageRecentQuote: 0,
        suggestedEstimate: 0,
        reason: 'Noch keine Selbsteinschätzung hinterlegt.',
      };
    }

    const currentEstimate = Number(pRows[0].estimated_double_quote);

    // 2. Letzte abgeschlossene Doppelquoten-Spiele holen (mind. 30 Darts, is_aborted = 0, bis zu 7 Spiele)
    const recentGames = await sql`
      SELECT total_hits, total_darts, total_quote, created_at, training_date
      FROM training_doubles
      WHERE LOWER(TRIM(player_name)) = LOWER(${cleanName})
        AND (is_aborted IS NULL OR is_aborted = 0)
        AND total_darts >= 30
      ORDER BY COALESCE(training_date, created_at::text) DESC
      LIMIT 7;
    `;

    const recentQuotes = recentGames.map((g: any) => Number((Number(g.total_quote) * 100).toFixed(1)));
    const recentGamesCount = recentQuotes.length;

    // 1. Kriterium: "dauerhaft drüber oder +-1% zum wert der einschätzung" (letzte bis zu 3 Spiele)
    const last3 = recentQuotes.slice(0, 3);
    const avg3 = last3.length > 0 ? Number((last3.reduce((a, b) => a + b, 0) / last3.length).toFixed(1)) : 0;
    const isAtOrAbove = last3.length >= 2 && avg3 >= (currentEstimate - 1.0);

    // 2. Kriterium: "zu oft verfehlt wird (dauerhaft 5-7 spiele schlechter als 8% vom wert der einschätzung)"
    const avg5to7 = recentGamesCount > 0 ? Number((recentQuotes.reduce((a, b) => a + b, 0) / recentGamesCount).toFixed(1)) : 0;
    const diff = currentEstimate - avg5to7;
    const isUnderperforming = recentGamesCount >= 5 && (diff >= 8 || (currentEstimate <= 10 && avg5to7 <= currentEstimate * 0.6));

    if (isAtOrAbove) {
      const suggested = Math.max(currentEstimate + 1, Math.round(avg3));
      const isActualIncrease = avg3 >= currentEstimate;
      return {
        needsReEstimate: isActualIncrease,
        canEdit: true,
        isLocked: false,
        type: 'unlocked_increase',
        playerName: cleanName,
        currentEstimate,
        recentGamesCount: last3.length,
        recentQuotes: last3,
        averageRecentQuote: avg3,
        suggestedEstimate: suggested,
        reason: isActualIncrease
          ? `Ziel übertroffen: Dein Schnitt der letzten ${last3.length} Spiele liegt bei ${avg3}% (bisherige Schätzung: ${currentEstimate}%).`
          : `Ziel bestätigt (±1%): Dein Schnitt der letzten ${last3.length} Spiele liegt bei ${avg3}% (Schätzung: ${currentEstimate}%).`,
      };
    }

    if (isUnderperforming) {
      const suggested = Math.max(1, Math.round(avg5to7));
      return {
        needsReEstimate: false,
        canEdit: true,
        isLocked: false,
        type: 'unlocked_decrease',
        playerName: cleanName,
        currentEstimate,
        recentGamesCount,
        recentQuotes,
        averageRecentQuote: avg5to7,
        suggestedEstimate: suggested,
        reason: `Ziel verfehlt: In deinen letzten ${recentGamesCount} Spielen lag dein Schnitt bei ${avg5to7}% (mehr als 8% unter deiner Schätzung von ${currentEstimate}%).`,
      };
    }

    // Gesperrt (Locked)
    let lockReason = '';
    if (recentGamesCount < 2) {
      lockReason = `🔒 Gesperrt: Spiele mindestens 2 bis 3 Spiele, um deine Einschätzung anzupassen.`;
    } else if (recentGamesCount < 5) {
      lockReason = `🔒 Gesperrt: Deine Schätzung (${currentEstimate}%) ist fixiert. Anpassung erst möglich bei Zielerreichung (drüber / ±1%) oder nach 5–7 Spielen bei deutlicher Verfehlung.`;
    } else {
      lockReason = `🔒 Gesperrt: Dein Schnitt der letzten ${recentGamesCount} Spiele liegt bei ${avg5to7}%. Anpassung erst möglich ab ${currentEstimate - 1}% oder unter ${Math.max(1, currentEstimate - 8)}%.`;
    }

    return {
      needsReEstimate: false,
      canEdit: false,
      isLocked: true,
      type: 'locked',
      playerName: cleanName,
      currentEstimate,
      recentGamesCount,
      recentQuotes,
      averageRecentQuote: avg3 || avg5to7,
      suggestedEstimate: currentEstimate,
      lockReason,
    };
  } catch (err) {
    console.error('Fehler bei checkPlayerNeedsReEstimateAction:', err);
    return {
      needsReEstimate: false,
      canEdit: false,
      isLocked: true,
      type: 'locked',
      playerName: cleanName,
      currentEstimate: 0,
      recentGamesCount: 0,
      recentQuotes: [],
      averageRecentQuote: 0,
      suggestedEstimate: 0,
      lockReason: 'Prüfung fehlgeschlagen',
    };
  }
}

export async function recordAbortedSessionAction(data: {
  session_id?: string;
  player_name: string;
  opponent_name?: string | null;
  game_mode: string;
  total_hits: number;
  total_darts: number;
  reason?: string;
}) {
  try {
    const sessionId = data.session_id ? (data.session_id.startsWith('aborted_') ? data.session_id : 'aborted_' + data.session_id) : ('aborted_' + Date.now());
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
  session_id?: string;
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
  attempt_nr?: number;
  attempt_label?: string;
  time_label?: string;
  opponent_name?: string | null;
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
  hasMonthData: boolean;
  filterUsed: 'today' | 'month' | 'all';
  monthLabel: string;
  lastUpdate: string;
}

export async function getLiveDoppelquoteRankingAction(
  filter: 'today' | 'month' | 'all' = 'today'
): Promise<LiveRankingResult> {
  try {
    const rawRows = await sql`
      SELECT *
      FROM training_doubles
      ORDER BY created_at DESC
    `;

    // Streng reguläre Spiele fürs Ranking filtern: Abgebrochene Spiele werden NICHT im TV-Ranking gewertet!
    const allRows = rawRows.filter((r: any) => Number(r.is_aborted || 0) === 0);

    const now = new Date();
    const todayDateStr = now.toISOString().split('T')[0];
    const currentYearMonth = now.toISOString().slice(0, 7);
    const monthLabel = now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

    // Prüfen, ob heute Daten vorhanden sind
    const todayRows = allRows.filter((r: any) => {
      const rowDate = r.training_date ? String(r.training_date).split('T')[0] : '';
      const createdDate = r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '';
      return rowDate === todayDateStr || createdDate === todayDateStr;
    });

    // Prüfen, ob in diesem Kalendermonat Daten vorhanden sind (startet jeden 1. des Monats automatisch neu)
    const monthRows = allRows.filter((r: any) => {
      const rowDate = r.training_date ? String(r.training_date).slice(0, 7) : '';
      const createdDate = r.created_at ? new Date(r.created_at).toISOString().slice(0, 7) : '';
      return rowDate === currentYearMonth || createdDate === currentYearMonth;
    });

    const hasTodayData = todayRows.length > 0;
    const hasMonthData = monthRows.length > 0;
    const activeRows = filter === 'today' ? todayRows : filter === 'month' ? monthRows : allRows;

    let overallRanking: PlayerOverallRank[] = [];
    let targetRankings = {
      D20: [] as TargetLeader[],
      D10: [] as TargetLeader[],
      D16: [] as TargetLeader[],
      D8: [] as TargetLeader[],
      D4: [] as TargetLeader[],
    };

    if (filter === 'today') {
      // HEUTIGES TRAINING: Jedes gespielte Spiel einzeln eintragen (nicht kumulieren!)
      const chronoSorted = [...todayRows].sort(
        (a, b) => new Date(a.created_at || a.training_date).getTime() - new Date(b.created_at || b.training_date).getTime()
      );

      const playerAttemptCounter = new Map<string, number>();

      for (const r of chronoSorted) {
        const pName = String(r.player_name || '').trim();
        if (!pName) continue;

        const attemptNr = (playerAttemptCounter.get(pName) || 0) + 1;
        playerAttemptCounter.set(pName, attemptNr);

        const darts = Number(r.total_darts || 0);
        const hits = Number(r.total_hits || 0);
        const quote_percent = darts > 0 ? (hits / darts) * 100 : 0;

        const d20_darts = Number(r.d20_darts || 0);
        const d20_hits = Number(r.d20_hits || 0);
        const d20_quote = d20_darts > 0 ? (d20_hits / d20_darts) * 100 : 0;

        const d10_darts = Number(r.d10_darts || 0);
        const d10_hits = Number(r.d10_hits || 0);
        const d10_quote = d10_darts > 0 ? (d10_hits / d10_darts) * 100 : 0;

        const d16_darts = Number(r.d16_darts || 0);
        const d16_hits = Number(r.d16_hits || 0);
        const d16_quote = d16_darts > 0 ? (d16_hits / d16_darts) * 100 : 0;

        const d8_darts = Number(r.d8_darts || 0);
        const d8_hits = Number(r.d8_hits || 0);
        const d8_quote = d8_darts > 0 ? (d8_hits / d8_darts) * 100 : 0;

        const d4_darts = Number(r.d4_darts || 0);
        const d4_hits = Number(r.d4_hits || 0);
        const d4_quote = d4_darts > 0 ? (d4_hits / d4_darts) * 100 : 0;

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
            : (r.best_double || '-');

        const timeLabel = r.created_at
          ? new Date(r.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr'
          : '';

        overallRanking.push({
          session_id: String(r.session_id || r.id || ''),
          player_name: pName,
          sessions_count: 1,
          attempt_nr: attemptNr,
          attempt_label: `Durchgang #${attemptNr}`,
          time_label: timeLabel,
          total_hits: hits,
          total_darts: darts,
          quote_percent,
          best_session_quote: quote_percent,
          best_double: bestDoubleName,
          rank: 0,
          d20_quote,
          d10_quote,
          d16_quote,
          d8_quote,
          d4_quote,
          opponent_name: r.opponent_name ? String(r.opponent_name) : null,
        });
      }

      // Ranking nach Quote absteigend sortieren
      overallRanking.sort((a, b) => {
        if (b.quote_percent !== a.quote_percent) {
          return b.quote_percent - a.quote_percent;
        }
        return b.total_hits - a.total_hits;
      });
      overallRanking.forEach((p, idx) => {
        p.rank = idx + 1;
      });

      // Target Rankings für Heute: Aus allen einzelnen Sessions
      const buildTargetRankingToday = (
        target: 'D20' | 'D10' | 'D16' | 'D8' | 'D4',
        quoteKey: 'd20_quote' | 'd10_quote' | 'd16_quote' | 'd8_quote' | 'd4_quote',
        hitsKey: 'd20_hits' | 'd10_hits' | 'd16_hits' | 'd8_hits' | 'd4_hits',
        dartsKey: 'd20_darts' | 'd10_darts' | 'd16_darts' | 'd8_darts' | 'd4_darts'
      ): TargetLeader[] => {
        const list: TargetLeader[] = [];
        for (const s of overallRanking) {
          const r = todayRows.find(
            (x) => String(x.session_id || x.id) === s.session_id && x.player_name === s.player_name
          );
          if (r) {
            const d = Number(r[dartsKey] || 0);
            const h = Number(r[hitsKey] || 0);
            if (d > 0) {
              list.push({
                target,
                player_name: `${s.player_name} (#${s.attempt_nr})`,
                quote_percent: s[quoteKey],
                hits: h,
                darts: d,
              });
            }
          }
        }
        list.sort((a, b) => {
          if (b.quote_percent !== a.quote_percent) return b.quote_percent - a.quote_percent;
          return b.hits - a.hits;
        });
        return list;
      };

      targetRankings = {
        D20: buildTargetRankingToday('D20', 'd20_quote', 'd20_hits', 'd20_darts'),
        D10: buildTargetRankingToday('D10', 'd10_quote', 'd10_hits', 'd10_darts'),
        D16: buildTargetRankingToday('D16', 'd16_quote', 'd16_hits', 'd16_darts'),
        D8: buildTargetRankingToday('D8', 'd8_quote', 'd8_hits', 'd8_darts'),
        D4: buildTargetRankingToday('D4', 'd4_quote', 'd4_hits', 'd4_darts'),
      };
    } else {
      // MONATSRANKING oder GESAMT-HISTORIE: Kumulierte Aggregation pro Spieler
      const targetDataset = filter === 'month' ? monthRows : allRows;
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

      for (const r of targetDataset) {
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

      overallRanking = Array.from(playerMap.values()).map((p) => {
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
      });

      overallRanking.sort((a, b) => {
        if (b.quote_percent !== a.quote_percent) {
          return b.quote_percent - a.quote_percent;
        }
        return b.total_hits - a.total_hits;
      });
      overallRanking.forEach((p, idx) => {
        p.rank = idx + 1;
      });

      const buildTargetRankingAll = (
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

      targetRankings = {
        D20: buildTargetRankingAll('D20', 'd20_quote', 'd20_hits', 'd20_darts'),
        D10: buildTargetRankingAll('D10', 'd10_quote', 'd10_hits', 'd10_darts'),
        D16: buildTargetRankingAll('D16', 'd16_quote', 'd16_hits', 'd16_darts'),
        D8: buildTargetRankingAll('D8', 'd8_quote', 'd8_hits', 'd8_darts'),
        D4: buildTargetRankingAll('D4', 'd4_quote', 'd4_hits', 'd4_darts'),
      };
    }

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
      hasMonthData,
      filterUsed: filter,
      monthLabel,
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
      hasMonthData: false,
      filterUsed: filter,
      monthLabel: new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
      lastUpdate: new Date().toLocaleTimeString('de-DE'),
    };
  }
}

