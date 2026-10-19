'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getSessionAction } from '@/app/actions';

export interface PdcChallengeSessionData {
  session_id: string;
  player_id?: number | null;
  player_name: string;
  opponent_name?: string | null;
  game_mode: string;
  training_date: string;
  score_part1: number;
  score_part2: number;
  score_part3: number;
  total_score: number;
  shanghai_count: number;
  doubles_hit: number;
  badge_color: string;
  details?: string;
  notes?: string;
  is_winner?: number;
  is_aborted?: number;
}

export async function savePdcChallengeAction(sessions: PdcChallengeSessionData[]) {
  try {
    for (const s of sessions) {
      await sql`
        INSERT INTO training_pdc_challenge (
          session_id, player_id, player_name, opponent_name, game_mode, training_date,
          score_part1, score_part2, score_part3, total_score,
          shanghai_count, doubles_hit, badge_color, details, notes,
          is_winner, is_aborted
        ) VALUES (
          ${s.session_id}, ${s.player_id ?? null}, ${s.player_name}, ${s.opponent_name ?? null}, ${s.game_mode}, ${s.training_date},
          ${s.score_part1}, ${s.score_part2}, ${s.score_part3}, ${s.total_score},
          ${s.shanghai_count}, ${s.doubles_hit}, ${s.badge_color}, ${s.details ?? null}, ${s.notes ?? ''},
          ${s.is_winner ?? 0}, ${s.is_aborted ?? 0}
        )
      `;
    }
    revalidatePath('/training/pdc-challenge');
    revalidatePath('/training');
    revalidatePath('/analytics');
    return { success: true };
  } catch (error: any) {
    console.error('Fehler beim Speichern der PDC Challenge in Supabase:', error);
    return { success: false, error: error.message || 'Speichern fehlgeschlagen' };
  }
}

export async function getPdcChallengeHistoryAction(limit: number = 50) {
  try {
    const session = await getSessionAction();
    const isAdmin = session?.role === 'admin';

    const rows = isAdmin
      ? await sql`
          SELECT *
          FROM training_pdc_challenge
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT *
          FROM training_pdc_challenge
          WHERE COALESCE(is_aborted, 0) = 0
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
      score_part1: Number(r.score_part1 || 0),
      score_part2: Number(r.score_part2 || 0),
      score_part3: Number(r.score_part3 || 0),
      total_score: Number(r.total_score || 0),
      shanghai_count: Number(r.shanghai_count || 0),
      doubles_hit: Number(r.doubles_hit || 0),
      badge_color: String(r.badge_color || 'Weiß'),
      notes: String(r.notes || ''),
      is_winner: Number(r.is_winner || 0),
      is_aborted: Number(r.is_aborted || 0),
      created_at: String(r.created_at)
    }));
  } catch (error) {
    console.error('Fehler beim Laden der PDC Challenge Historie:', error);
    return [];
  }
}

export async function recordAbortedPdcAction(data: {
  player_name: string;
  opponent_name?: string | null;
  game_mode: string;
  current_score: number;
  part1_score: number;
  part2_score: number;
  part3_score: number;
  reason?: string;
}) {
  try {
    const sessionId = 'aborted_pdc_' + Date.now();
    const dateStr = new Date().toISOString();
    const noteText = data.reason || 'Vorzeitiger Spielabbruch';

    await sql`
      INSERT INTO training_pdc_challenge (
        session_id, player_name, opponent_name, game_mode, training_date,
        score_part1, score_part2, score_part3, total_score,
        shanghai_count, doubles_hit, badge_color, details, notes,
        is_winner, is_aborted
      ) VALUES (
        ${sessionId}, ${data.player_name}, ${data.opponent_name ?? null}, ${data.game_mode}, ${dateStr},
        ${data.part1_score}, ${data.part2_score}, ${data.part3_score}, ${data.current_score},
        0, 0, 'Abgebrochen', null, ${noteText},
        0, 1
      )
    `;
    revalidatePath('/training/pdc-challenge');
    return { success: true };
  } catch (error: any) {
    console.error('Fehler beim Protokollieren des PDC-Spielabbruchs:', error);
    return { success: false, error: error.message };
  }
}

export interface PdcLeaderboardRow {
  session_id?: string;
  player_name: string;
  sessions_count: number;
  best_score: number;
  avg_score: number;
  best_badge: string;
  total_shanghais: number;
  best_doubles_hit: number;
  rank: number;
  attempt_nr?: number;
  attempt_label?: string;
  time_label?: string;
  score_part1?: number;
  score_part2?: number;
  score_part3?: number;
  opponent_name?: string | null;
}

export interface PdcLiveRankingResult {
  leaderboard: PdcLeaderboardRow[];
  totalSessions: number;
  hasTodayData: boolean;
  filterUsed: 'today' | 'all';
  lastUpdate: string;
}

export async function getLivePdcRankingAction(
  filter: 'today' | 'all' = 'today'
): Promise<PdcLiveRankingResult> {
  try {
    const rawRows = await sql`
      SELECT *
      FROM training_pdc_challenge
      ORDER BY created_at DESC
    `;

    // Streng reguläre Spiele filtern: Abgebrochene Spiele werden NICHT im TV-Ranking gewertet!
    const allRows = rawRows.filter((r: any) => Number(r.is_aborted || 0) === 0);

    const todayDateStr = new Date().toISOString().split('T')[0];

    const todayRows = allRows.filter((r: any) => {
      const rowDate = r.training_date ? String(r.training_date).split('T')[0] : '';
      const createdDate = r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '';
      return rowDate === todayDateStr || createdDate === todayDateStr;
    });

    const hasTodayData = todayRows.length > 0;
    const activeRows = filter === 'today' ? todayRows : allRows;

    let leaderboard: PdcLeaderboardRow[] = [];

    if (filter === 'today') {
      // HEUTIGES TRAINING: Jedes gespielte Spiel einzeln eintragen (nicht kumulieren!)
      const chronoSorted = [...todayRows].sort(
        (a, b) =>
          new Date(a.created_at || a.training_date).getTime() -
          new Date(b.created_at || b.training_date).getTime()
      );

      const playerAttemptCounter = new Map<string, number>();

      for (const r of chronoSorted) {
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

        const timeLabel = r.created_at
          ? new Date(r.created_at).toLocaleTimeString('de-DE', {
              hour: '2-digit',
              minute: '2-digit',
            }) + ' Uhr'
          : '';

        leaderboard.push({
          session_id: String(r.session_id || r.id || ''),
          player_name: pName,
          sessions_count: 1,
          best_score: totalScore,
          avg_score: totalScore,
          best_badge: badgeColor,
          total_shanghais: shanghais,
          best_doubles_hit: doubles,
          score_part1: part1,
          score_part2: part2,
          score_part3: part3,
          attempt_nr: attemptNr,
          attempt_label: `Durchgang #${attemptNr}`,
          time_label: timeLabel,
          opponent_name: r.opponent_name ? String(r.opponent_name) : null,
          rank: 0,
        });
      }

      // Ranking nach Punkten absteigend sortieren
      leaderboard.sort((a, b) => {
        if (b.best_score !== a.best_score) return b.best_score - a.best_score;
        if (b.total_shanghais !== a.total_shanghais) return b.total_shanghais - a.total_shanghais;
        return b.best_doubles_hit - a.best_doubles_hit;
      });

      leaderboard.forEach((p, idx) => {
        p.rank = idx + 1;
      });
    } else {
      // GESAMT-HISTORIE: Kumulierte Aggregation pro Spieler
      const playerMap = new Map<
        string,
        {
          player_name: string;
          sessions_count: number;
          total_score_sum: number;
          best_score: number;
          best_badge: string;
          total_shanghais: number;
          best_doubles_hit: number;
        }
      >();

      for (const r of allRows) {
        const pName = String(r.player_name || '').trim();
        if (!pName) continue;

        if (!playerMap.has(pName)) {
          playerMap.set(pName, {
            player_name: pName,
            sessions_count: 0,
            total_score_sum: 0,
            best_score: 0,
            best_badge: 'Weiß',
            total_shanghais: 0,
            best_doubles_hit: 0,
          });
        }

        const p = playerMap.get(pName)!;
        p.sessions_count += 1;
        const score = Number(r.total_score || 0);
        p.total_score_sum += score;
        if (score >= p.best_score) {
          p.best_score = score;
          p.best_badge = String(r.badge_color || 'Weiß');
        }
        p.total_shanghais += Number(r.shanghai_count || 0);
        const doubles = Number(r.doubles_hit || 0);
        if (doubles > p.best_doubles_hit) {
          p.best_doubles_hit = doubles;
        }
      }

      leaderboard = Array.from(playerMap.values()).map((p) => ({
        player_name: p.player_name,
        sessions_count: p.sessions_count,
        best_score: p.best_score,
        avg_score: p.sessions_count > 0 ? Math.round(p.total_score_sum / p.sessions_count) : 0,
        best_badge: p.best_badge,
        total_shanghais: p.total_shanghais,
        best_doubles_hit: p.best_doubles_hit,
        rank: 0,
      }));

      leaderboard.sort((a, b) => {
        if (b.best_score !== a.best_score) return b.best_score - a.best_score;
        if (b.avg_score !== a.avg_score) return b.avg_score - a.avg_score;
        return b.total_shanghais - a.total_shanghais;
      });

      leaderboard.forEach((p, idx) => {
        p.rank = idx + 1;
      });
    }

    return {
      leaderboard,
      totalSessions: activeRows.length,
      hasTodayData,
      filterUsed: filter,
      lastUpdate: new Date().toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };
  } catch (error) {
    console.error('Fehler in getLivePdcRankingAction:', error);
    return {
      leaderboard: [],
      totalSessions: 0,
      hasTodayData: false,
      filterUsed: filter,
      lastUpdate: new Date().toLocaleTimeString('de-DE'),
    };
  }
}
