'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { FussballSessionSavePayload } from './types';

export async function saveFussballSessionAction(sessions: FussballSessionSavePayload[]) {
  try {
    for (const s of sessions) {
      await sql`
        INSERT INTO training_fussball (
          session_id, player_id, player_name, opponent_name, is_computer, computer_level,
          game_mode, target_goals, goals_scored, goals_conceded, darts_thrown,
          bull_hits, bull_attempts, double_hits, double_attempts,
          is_winner, training_date
        ) VALUES (
          ${s.session_id}, ${s.player_id ?? null}, ${s.player_name}, ${s.opponent_name}, ${s.is_computer}, ${s.computer_level ?? null},
          ${s.game_mode}, ${s.target_goals}, ${s.goals_scored}, ${s.goals_conceded}, ${s.darts_thrown},
          ${s.bull_hits}, ${s.bull_attempts}, ${s.double_hits}, ${s.double_attempts},
          ${s.is_winner}, ${s.training_date}
        )
      `;
    }
    revalidatePath('/training');
    revalidatePath('/training/fussball');
    return { success: true };
  } catch (error: any) {
    console.error('Fehler beim Speichern des Fußball-Spiels in Supabase:', error);
    return { success: false, error: error.message || 'Speichern fehlgeschlagen' };
  }
}

export async function getFussballHistoryAction(limit: number = 20) {
  try {
    const rows = await sql`
      SELECT *
      FROM training_fussball
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows.map((r: any) => ({
      id: Number(r.id),
      session_id: String(r.session_id),
      player_name: String(r.player_name),
      opponent_name: String(r.opponent_name),
      is_computer: Number(r.is_computer),
      computer_level: r.computer_level ? String(r.computer_level) : null,
      target_goals: Number(r.target_goals),
      goals_scored: Number(r.goals_scored),
      goals_conceded: Number(r.goals_conceded),
      darts_thrown: Number(r.darts_thrown),
      bull_hits: Number(r.bull_hits),
      bull_attempts: Number(r.bull_attempts),
      double_hits: Number(r.double_hits),
      double_attempts: Number(r.double_attempts),
      is_winner: Number(r.is_winner),
      training_date: String(r.training_date),
      created_at: String(r.created_at)
    }));
  } catch (error) {
    console.error('Fehler beim Laden der Fußball-Historie:', error);
    return [];
  }
}
