'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { ScoringLeiterHistoryItem, ScoringLeiterSessionSavePayload } from './types';
import { sanitizeTrainingDate } from '@/lib/dateUtils';

export async function ensureScoringLeiterTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS training_scoring_leiter (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        player_id INTEGER,
        player_name TEXT NOT NULL,
        opponent_name TEXT,
        game_mode TEXT NOT NULL DEFAULT 'solo',
        highest_cleared_level INTEGER NOT NULL DEFAULT 0,
        reached_level INTEGER NOT NULL DEFAULT 41,
        levels_cleared_count INTEGER NOT NULL DEFAULT 0,
        total_score INTEGER NOT NULL DEFAULT 0,
        total_hits INTEGER NOT NULL DEFAULT 0,
        total_visits INTEGER NOT NULL DEFAULT 0,
        hit_quote DOUBLE PRECISION NOT NULL DEFAULT 0,
        is_winner INTEGER NOT NULL DEFAULT 0,
        is_aborted INTEGER DEFAULT 0,
        level_details JSONB DEFAULT '[]'::jsonb,
        training_date TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
  } catch (err) {
    // Falls DDL über Pooler eingeschränkt ist, still ignorieren und INSERT versuchen
    console.warn('Hinweis bei ensureScoringLeiterTable:', err);
  }
}

export async function saveScoringLeiterSessionAction(sessions: ScoringLeiterSessionSavePayload[]) {
  try {
    await ensureScoringLeiterTable();

    for (const s of sessions) {
      const validTrainingDate = sanitizeTrainingDate(s.training_date);
      await sql`
        INSERT INTO training_scoring_leiter (
          session_id,
          player_id,
          player_name,
          opponent_name,
          game_mode,
          highest_cleared_level,
          reached_level,
          levels_cleared_count,
          total_score,
          total_hits,
          total_visits,
          hit_quote,
          is_winner,
          is_aborted,
          level_details,
          training_date
        ) VALUES (
          ${s.session_id},
          ${s.player_id ?? null},
          ${s.player_name},
          ${s.opponent_name ?? null},
          ${s.game_mode},
          ${s.highest_cleared_level},
          ${s.reached_level},
          ${s.levels_cleared_count},
          ${s.total_score},
          ${s.total_hits},
          ${s.total_visits},
          ${s.hit_quote},
          ${s.is_winner},
          0,
          ${JSON.stringify(s.level_details || [])},
          ${validTrainingDate}
        )
      `;
    }

    revalidatePath('/training');
    revalidatePath('/training/scoring-leiter');
    revalidatePath('/training/live');
    revalidatePath('/verwaltung');
    return { success: true };
  } catch (error: any) {
    console.error('Fehler beim Speichern von Scoring-Leiter in Supabase:', error);
    return { success: false, error: error.message || 'Speichern fehlgeschlagen' };
  }
}

export async function getScoringLeiterHistoryAction(limit: number = 30): Promise<ScoringLeiterHistoryItem[]> {
  try {
    await ensureScoringLeiterTable();

    const rows = await sql`
      SELECT *
      FROM training_scoring_leiter
      WHERE is_aborted IS NULL OR is_aborted = 0
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return rows.map((r: any) => {
      let parsedDetails = [];
      try {
        if (typeof r.level_details === 'string') {
          parsedDetails = JSON.parse(r.level_details);
        } else if (Array.isArray(r.level_details)) {
          parsedDetails = r.level_details;
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
        highest_cleared_level: Number(r.highest_cleared_level || 0),
        reached_level: Number(r.reached_level || 41),
        levels_cleared_count: Number(r.levels_cleared_count || 0),
        total_score: Number(r.total_score || 0),
        total_hits: Number(r.total_hits || 0),
        total_visits: Number(r.total_visits || 0),
        hit_quote: Number(r.hit_quote || 0),
        is_winner: Number(r.is_winner || 0),
        level_details: parsedDetails,
        training_date: String(r.training_date || ''),
        created_at: String(r.created_at || ''),
      };
    });
  } catch (error) {
    console.error('Fehler beim Laden der Scoring-Leiter Historie:', error);
    return [];
  }
}
