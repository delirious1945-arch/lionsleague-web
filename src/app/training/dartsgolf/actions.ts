'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import {
  GolfHistoryItem,
  GolfHolePlayerResult,
  GolfSessionSavePayload,
} from './types';
import { sanitizeTrainingDate } from '@/lib/dateUtils';

export async function ensureDartsGolfTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS training_dartsgolf (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        player_id INTEGER,
        player_name TEXT NOT NULL,
        opponent_name TEXT,
        game_mode TEXT NOT NULL DEFAULT '1vsComputer',
        is_computer INTEGER NOT NULL DEFAULT 1,
        computer_level TEXT,
        holes_count INTEGER NOT NULL DEFAULT 18,
        course_par INTEGER NOT NULL DEFAULT 72,
        total_strokes INTEGER NOT NULL DEFAULT 72,
        score_to_par INTEGER NOT NULL DEFAULT 0,
        holes_won INTEGER NOT NULL DEFAULT 0,
        eagles_count INTEGER NOT NULL DEFAULT 0,
        birdies_count INTEGER NOT NULL DEFAULT 0,
        pars_count INTEGER NOT NULL DEFAULT 0,
        bogeys_count INTEGER NOT NULL DEFAULT 0,
        overshoots_count INTEGER NOT NULL DEFAULT 0,
        is_winner INTEGER NOT NULL DEFAULT 0,
        is_aborted INTEGER DEFAULT 0,
        hole_details JSONB DEFAULT '[]'::jsonb,
        training_date TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
  } catch (err) {
    console.warn('Hinweis bei ensureDartsGolfTable:', err);
  }
}

export async function saveDartsGolfSessionAction(sessions: GolfSessionSavePayload[]) {
  try {
    await ensureDartsGolfTable();

    for (const s of sessions) {
      if (!s.player_name || s.player_name.toLowerCase().startsWith('computer')) {
        continue;
      }
      const validTrainingDate = sanitizeTrainingDate(s.training_date);
      await sql`
        INSERT INTO training_dartsgolf (
          session_id,
          player_id,
          player_name,
          opponent_name,
          game_mode,
          is_computer,
          computer_level,
          holes_count,
          course_par,
          total_strokes,
          score_to_par,
          holes_won,
          eagles_count,
          birdies_count,
          pars_count,
          bogeys_count,
          overshoots_count,
          is_winner,
          is_aborted,
          hole_details,
          training_date
        ) VALUES (
          ${s.session_id},
          ${s.player_id ?? null},
          ${s.player_name},
          ${s.opponent_name ?? null},
          ${s.game_mode},
          ${s.is_computer ?? 0},
          ${s.computer_level ?? null},
          ${s.holes_count},
          ${s.course_par},
          ${s.total_strokes},
          ${s.score_to_par},
          ${s.holes_won},
          ${s.eagles_count},
          ${s.birdies_count},
          ${s.pars_count},
          ${s.bogeys_count},
          ${s.overshoots_count},
          ${s.is_winner},
          0,
          ${JSON.stringify(s.hole_details || [])},
          ${validTrainingDate}
        )
      `;
    }

    revalidatePath('/training');
    revalidatePath('/training/dartsgolf');
    revalidatePath('/training/live');
    revalidatePath('/verwaltung');
    return { success: true };
  } catch (error: any) {
    console.error('Fehler beim Speichern von Darts-Golf in Supabase:', error);
    return { success: false, error: error.message || 'Speichern fehlgeschlagen' };
  }
}

export async function getDartsGolfHistoryAction(limit: number = 30): Promise<GolfHistoryItem[]> {
  try {
    await ensureDartsGolfTable();

    const rows = await sql`
      SELECT *
      FROM training_dartsgolf
      WHERE is_aborted IS NULL OR is_aborted = 0
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return rows.map((r: any) => {
      let parsedHoles: GolfHolePlayerResult[] = [];
      try {
        if (typeof r.hole_details === 'string') {
          parsedHoles = JSON.parse(r.hole_details);
        } else if (Array.isArray(r.hole_details)) {
          parsedHoles = r.hole_details;
        }
      } catch {
        parsedHoles = [];
      }

      return {
        id: Number(r.id),
        session_id: String(r.session_id),
        player_id: r.player_id ? Number(r.player_id) : null,
        player_name: String(r.player_name),
        opponent_name: r.opponent_name ? String(r.opponent_name) : null,
        game_mode: r.game_mode === '1vs1' ? '1vs1' : '1vsComputer',
        is_computer: Number(r.is_computer ?? 0),
        computer_level: r.computer_level ? String(r.computer_level) : null,
        holes_count: Number(r.holes_count || 18),
        course_par: Number(r.course_par || 72),
        total_strokes: Number(r.total_strokes || 72),
        score_to_par: Number(r.score_to_par || 0),
        holes_won: Number(r.holes_won || 0),
        eagles_count: Number(r.eagles_count || 0),
        birdies_count: Number(r.birdies_count || 0),
        pars_count: Number(r.pars_count || 0),
        bogeys_count: Number(r.bogeys_count || 0),
        overshoots_count: Number(r.overshoots_count || 0),
        is_winner: Number(r.is_winner || 0),
        hole_details: parsedHoles,
        training_date: String(r.training_date || ''),
        created_at: r.created_at ? String(r.created_at) : undefined,
      };
    });
  } catch {
    return [];
  }
}
