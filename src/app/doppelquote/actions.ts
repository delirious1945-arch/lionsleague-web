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
          best_double, notes, is_winner
        ) VALUES (
          ${s.session_id}, ${s.player_id ?? null}, ${s.player_name}, ${s.opponent_name ?? null}, ${s.game_mode}, ${s.training_date},
          ${s.d20_hits}, ${s.d20_darts}, ${s.d20_quote},
          ${s.d10_hits}, ${s.d10_darts}, ${s.d10_quote},
          ${s.d16_hits}, ${s.d16_darts}, ${s.d16_quote},
          ${s.d8_hits}, ${s.d8_darts}, ${s.d8_quote},
          ${s.d4_hits}, ${s.d4_darts}, ${s.d4_quote},
          ${s.total_hits}, ${s.total_darts}, ${s.total_quote},
          ${s.best_double}, ${s.notes ?? ''}, ${s.is_winner ?? 0}
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
      created_at: String(r.created_at)
    }));
  } catch (error) {
    console.error('Fehler beim Laden der Trainings-Historie:', error);
    return [];
  }
}
