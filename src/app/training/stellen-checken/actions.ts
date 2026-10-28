'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { StellenCheckenHistoryItem, StellenCheckenSessionSavePayload } from './types';
import { sanitizeTrainingDate } from '@/lib/dateUtils';

export async function ensureStellenCheckenTable() {
  // Tabelle training_stellen_checken existiert bereits fest in Supabase.
  // Keine DDL-Ausführung zur Laufzeit über den Transaction Pooler nötig.
  return;
}

export async function saveStellenCheckenSessionAction(sessions: StellenCheckenSessionSavePayload[]) {
  try {
    await ensureStellenCheckenTable();

    for (const s of sessions) {
      const validTrainingDate = sanitizeTrainingDate(s.training_date);
      await sql`
        INSERT INTO training_stellen_checken (
          session_id,
          player_id,
          player_name,
          opponent_name,
          game_mode,
          preset_id,
          points_scored,
          max_possible_points,
          checks_count,
          total_rounds,
          check_quote,
          is_winner,
          is_aborted,
          round_details,
          training_date
        ) VALUES (
          ${s.session_id},
          ${s.player_id ?? null},
          ${s.player_name},
          ${s.opponent_name ?? null},
          ${s.game_mode},
          ${s.preset_id},
          ${s.points_scored},
          ${s.max_possible_points},
          ${s.checks_count},
          ${s.total_rounds},
          ${s.check_quote},
          ${s.is_winner},
          0,
          ${JSON.stringify(s.round_details || [])},
          ${validTrainingDate}
        )
      `;
    }

    revalidatePath('/training');
    revalidatePath('/training/stellen-checken');
    revalidatePath('/training/live');
    return { success: true };
  } catch (error: any) {
    console.error('Fehler beim Speichern von Stellen & Checken in Supabase:', error);
    return { success: false, error: error.message || 'Speichern fehlgeschlagen' };
  }
}

export async function getStellenCheckenHistoryAction(limit: number = 30): Promise<StellenCheckenHistoryItem[]> {
  try {
    await ensureStellenCheckenTable();

    const rows = await sql`
      SELECT *
      FROM training_stellen_checken
      WHERE is_aborted IS NULL OR is_aborted = 0
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return rows.map((r: any) => {
      let parsedDetails = [];
      try {
        if (typeof r.round_details === 'string') {
          parsedDetails = JSON.parse(r.round_details);
        } else if (Array.isArray(r.round_details)) {
          parsedDetails = r.round_details;
        }
      } catch {
        parsedDetails = [];
      }

      return {
        id: Number(r.id),
        session_id: String(r.session_id),
        player_name: String(r.player_name),
        opponent_name: r.opponent_name ? String(r.opponent_name) : null,
        game_mode: r.game_mode === '1vs1' ? '1vs1' : 'solo',
        preset_id: Number(r.preset_id || 1),
        points_scored: Number(r.points_scored || 0),
        max_possible_points: Number(r.max_possible_points || 28),
        checks_count: Number(r.checks_count || 0),
        total_rounds: Number(r.total_rounds || 15),
        check_quote: Number(r.check_quote || 0),
        is_winner: Number(r.is_winner || 0),
        round_details: parsedDetails,
        training_date: String(r.training_date || ''),
        created_at: String(r.created_at || ''),
      };
    });
  } catch (error) {
    console.error('Fehler beim Laden der Stellen & Checken Historie:', error);
    return [];
  }
}
