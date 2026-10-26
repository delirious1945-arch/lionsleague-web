'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { StellenCheckenHistoryItem, StellenCheckenSessionSavePayload } from './types';
import { sanitizeTrainingDate } from '@/lib/dateUtils';

let tableInitialized = false;

export async function ensureStellenCheckenTable() {
  if (tableInitialized) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS training_stellen_checken (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        player_id INTEGER,
        player_name TEXT NOT NULL,
        opponent_name TEXT,
        game_mode TEXT NOT NULL DEFAULT 'solo',
        preset_id INTEGER NOT NULL,
        points_scored INTEGER NOT NULL DEFAULT 0,
        max_possible_points INTEGER NOT NULL DEFAULT 28,
        checks_count INTEGER NOT NULL DEFAULT 0,
        total_rounds INTEGER NOT NULL DEFAULT 15,
        check_quote NUMERIC(5,4) NOT NULL DEFAULT 0,
        is_winner INTEGER NOT NULL DEFAULT 0,
        is_aborted INTEGER NOT NULL DEFAULT 0,
        round_details JSONB,
        training_date TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_stellen_checken_date ON training_stellen_checken(training_date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_stellen_checken_player ON training_stellen_checken(player_name)`;
    tableInitialized = true;
  } catch (err) {
    console.error('Fehler beim Initialisieren von training_stellen_checken:', err);
  }
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
