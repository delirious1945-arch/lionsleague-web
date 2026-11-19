'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import {
  DARTS_99_TARGETS,
  Darts99HistoryItem,
  Darts99RoundDetail,
  Darts99SessionSavePayload,
  Darts99Target,
  TOTAL_DARTS_99,
} from './types';
import { sanitizeTrainingDate } from '@/lib/dateUtils';

export async function ensureDarts99Table() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS training_99_darts (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        player_id INTEGER,
        player_name TEXT NOT NULL,
        opponent_name TEXT,
        game_mode TEXT NOT NULL DEFAULT 'solo',
        target_number INTEGER NOT NULL DEFAULT 20,
        total_points INTEGER NOT NULL DEFAULT 0,
        total_darts INTEGER NOT NULL DEFAULT 99,
        total_hits INTEGER NOT NULL DEFAULT 0,
        singles_count INTEGER NOT NULL DEFAULT 0,
        doubles_count INTEGER NOT NULL DEFAULT 0,
        triples_count INTEGER NOT NULL DEFAULT 0,
        misses_count INTEGER NOT NULL DEFAULT 0,
        hit_quote DOUBLE PRECISION NOT NULL DEFAULT 0,
        points_per_dart DOUBLE PRECISION NOT NULL DEFAULT 0,
        is_winner INTEGER NOT NULL DEFAULT 0,
        is_aborted INTEGER DEFAULT 0,
        round_details JSONB DEFAULT '[]'::jsonb,
        training_date TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
  } catch (err) {
    // Falls DDL über Pooler eingeschränkt ist, still ignorieren und INSERT versuchen
    console.warn('Hinweis bei ensureDarts99Table:', err);
  }
}

export async function saveDarts99SessionAction(sessions: Darts99SessionSavePayload[]) {
  try {
    await ensureDarts99Table();

    for (const s of sessions) {
      const validTrainingDate = sanitizeTrainingDate(s.training_date);
      await sql`
        INSERT INTO training_99_darts (
          session_id,
          player_id,
          player_name,
          opponent_name,
          game_mode,
          target_number,
          total_points,
          total_darts,
          total_hits,
          singles_count,
          doubles_count,
          triples_count,
          misses_count,
          hit_quote,
          points_per_dart,
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
          ${s.target_number},
          ${s.total_points},
          ${s.total_darts},
          ${s.total_hits},
          ${s.singles_count},
          ${s.doubles_count},
          ${s.triples_count},
          ${s.misses_count},
          ${s.hit_quote},
          ${s.points_per_dart},
          ${s.is_winner},
          0,
          ${JSON.stringify(s.round_details || [])},
          ${validTrainingDate}
        )
      `;
    }

    revalidatePath('/training');
    revalidatePath('/training/99-darts');
    revalidatePath('/training/live');
    revalidatePath('/verwaltung');
    return { success: true };
  } catch (error: any) {
    console.error('Fehler beim Speichern von 99 Darts Challenge in Supabase:', error);
    return { success: false, error: error.message || 'Speichern fehlgeschlagen' };
  }
}

export async function getDarts99HistoryAction(limit: number = 30): Promise<Darts99HistoryItem[]> {
  try {
    await ensureDarts99Table();

    const rows = await sql`
      SELECT *
      FROM training_99_darts
      WHERE is_aborted IS NULL OR is_aborted = 0
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return rows.map((r: any) => {
      let parsedDetails: Darts99RoundDetail[] = [];
      try {
        if (typeof r.round_details === 'string') {
          parsedDetails = JSON.parse(r.round_details);
        } else if (Array.isArray(r.round_details)) {
          parsedDetails = r.round_details;
        }
      } catch {
        parsedDetails = [];
      }

      const rawTarget = Number(r.target_number || 20);
      const validTarget: Darts99Target = (DARTS_99_TARGETS as readonly number[]).includes(rawTarget)
        ? (rawTarget as Darts99Target)
        : 20;

      return {
        id: Number(r.id),
        session_id: String(r.session_id),
        player_name: String(r.player_name),
        opponent_name: r.opponent_name ? String(r.opponent_name) : null,
        game_mode: r.game_mode === '1vs1' ? '1vs1' : 'solo',
        target_number: validTarget,
        total_points: Number(r.total_points || 0),
        total_darts: Number(r.total_darts || TOTAL_DARTS_99),
        total_hits: Number(r.total_hits || 0),
        singles_count: Number(r.singles_count || 0),
        doubles_count: Number(r.doubles_count || 0),
        triples_count: Number(r.triples_count || 0),
        misses_count: Number(r.misses_count || 0),
        hit_quote: Number(r.hit_quote || 0),
        points_per_dart: Number(r.points_per_dart || 0),
        is_winner: Number(r.is_winner || 0),
        round_details: parsedDetails,
        training_date: String(r.training_date || ''),
        created_at: String(r.created_at || ''),
      };
    });
  } catch (error) {
    console.error('Fehler beim Laden der 99 Darts Historie:', error);
    return [];
  }
}
