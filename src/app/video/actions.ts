'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getSessionAction } from '@/app/actions';

export interface BiomechanicsSessionPayload {
  id?: string;
  player_id?: number | null;
  player_name: string;
  consistency_score: number;
  release_speed_kmh: number;
  launch_angle_deg: number;
  elbow_drop_mm: number;
  shoulder_drift_mm: number;
  drawback_angle_deg: number;
  release_angle_deg: number;
  follow_through_angle_deg: number;
  stance_angle_deg?: number | null;
  trunk_lean_angle_deg?: number | null;
  landmark_confidence_pct?: number | null;
  is_high_confidence?: boolean;
  release_dispersion_mm?: number | null;
  speed_std_dev_kmh?: number | null;
  launch_angle_std_dev_deg?: number | null;
  dispersion_rating?: string | null;
  calibration_method?: string;
  video_mode?: string;
}

export interface BiomechanicsSessionDbRow {
  id: string | number;
  player_id: number | null;
  player_name: string;
  consistency_score: number;
  release_speed_kmh: number;
  launch_angle_deg: number;
  elbow_drop_mm: number;
  shoulder_drift_mm: number;
  drawback_angle_deg: number;
  release_angle_deg: number;
  follow_through_angle_deg: number;
  stance_angle_deg?: number | null;
  trunk_lean_angle_deg?: number | null;
  landmark_confidence_pct?: number | null;
  is_high_confidence?: boolean;
  release_dispersion_mm?: number | null;
  speed_std_dev_kmh?: number | null;
  launch_angle_std_dev_deg?: number | null;
  dispersion_rating?: string | null;
  calibration_method?: string | null;
  video_mode?: string | null;
  created_at: string | Date;
}

/**
 * Speichert eine Biomechanik-Analyse in Supabase.
 * Gemäß DSGVO §10: Ausschließlich numerische Messwerte, 0 Bytes Video-Rohdaten.
 */
export async function saveBiomechanicsSessionAction(payload: BiomechanicsSessionPayload) {
  try {
    const user = await getSessionAction();
    if (!user) {
      return { success: false, error: 'Nicht angemeldet' };
    }

    const playerId = payload.player_id ?? (user.id || null);
    const playerName = payload.player_name || user.name;

    await sql`
      INSERT INTO biomechanics_sessions (
        player_id, player_name, consistency_score, release_speed_kmh,
        launch_angle_deg, elbow_drop_mm, shoulder_drift_mm,
        drawback_angle_deg, release_angle_deg, follow_through_angle_deg,
        stance_angle_deg, trunk_lean_angle_deg, landmark_confidence_pct,
        is_high_confidence, release_dispersion_mm, speed_std_dev_kmh,
        launch_angle_std_dev_deg, dispersion_rating, calibration_method,
        video_mode
      ) VALUES (
        ${playerId}, ${playerName}, ${payload.consistency_score}, ${payload.release_speed_kmh},
        ${payload.launch_angle_deg}, ${payload.elbow_drop_mm}, ${payload.shoulder_drift_mm},
        ${payload.drawback_angle_deg}, ${payload.release_angle_deg}, ${payload.follow_through_angle_deg},
        ${payload.stance_angle_deg ?? null}, ${payload.trunk_lean_angle_deg ?? null}, ${payload.landmark_confidence_pct ?? null},
        ${payload.is_high_confidence ?? true}, ${payload.release_dispersion_mm ?? null}, ${payload.speed_std_dev_kmh ?? null},
        ${payload.launch_angle_std_dev_deg ?? null}, ${payload.dispersion_rating ?? null}, ${payload.calibration_method ?? 'anthropometric'},
        ${payload.video_mode ?? 'Echtzeit'}
      )
    `;

    revalidatePath('/video');
    return { success: true };
  } catch (error: unknown) {
    console.error('Fehler beim Speichern der Biomechanik-Session:', error);
    const msg = error instanceof Error ? error.message : 'Speichern fehlgeschlagen';
    return { success: false, error: msg };
  }
}

/**
 * Lädt die Biomechanik-Historie des aktuellen Spielers aus Supabase.
 */
export async function getBiomechanicsHistoryAction(limit: number = 20) {
  try {
    const user = await getSessionAction();
    if (!user) return [];

    const rows = await sql`
      SELECT *
      FROM biomechanics_sessions
      WHERE player_name = ${user.name} OR ${user.role} = 'admin'
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return (rows as unknown as BiomechanicsSessionDbRow[]).map((r) => ({
      id: String(r.id),
      dateStr: new Date(r.created_at).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      createdAt: new Date(r.created_at).toISOString(),
      playerName: String(r.player_name),
      consistencyScore: Number(r.consistency_score),
      releaseSpeedKmh: Number(r.release_speed_kmh),
      launchAngleDeg: Number(r.launch_angle_deg),
      elbowDropMm: Number(r.elbow_drop_mm),
      shoulderDriftMm: Number(r.shoulder_drift_mm),
      drawbackAngle: Number(r.drawback_angle_deg),
      releaseAngle: Number(r.release_angle_deg),
      followThroughAngle: Number(r.follow_through_angle_deg),
      stanceAngle: r.stance_angle_deg !== null && r.stance_angle_deg !== undefined ? Number(r.stance_angle_deg) : undefined,
      trunkLeanAngle: r.trunk_lean_angle_deg !== null && r.trunk_lean_angle_deg !== undefined ? Number(r.trunk_lean_angle_deg) : undefined,
      landmarkConfidenceScore: r.landmark_confidence_pct !== null && r.landmark_confidence_pct !== undefined ? Number(r.landmark_confidence_pct) : undefined,
      isHighConfidenceDetection: Boolean(r.is_high_confidence),
      releaseDispersionMm: r.release_dispersion_mm !== null && r.release_dispersion_mm !== undefined ? Number(r.release_dispersion_mm) : undefined,
      speedStdDevKmh: r.speed_std_dev_kmh !== null && r.speed_std_dev_kmh !== undefined ? Number(r.speed_std_dev_kmh) : undefined,
      launchAngleStdDevDeg: r.launch_angle_std_dev_deg !== null && r.launch_angle_std_dev_deg !== undefined ? Number(r.launch_angle_std_dev_deg) : undefined,
      dispersionRating: r.dispersion_rating as 'EXZELLENT' | 'STABIL' | 'VERBESSERBAR' | undefined,
      calibrationMethod: r.calibration_method ? String(r.calibration_method) : undefined,
      videoMode: r.video_mode ? String(r.video_mode) : undefined,
    }));
  } catch (error) {
    console.warn('Biomechanik-Historie konnte nicht aus Supabase geladen werden (evtl. noch nicht migriert):', error);
    return [];
  }
}

/**
 * Löscht eine Biomechanik-Session aus Supabase (DSGVO §10.3).
 */
export async function deleteBiomechanicsSessionAction(id: string) {
  try {
    const user = await getSessionAction();
    if (!user) {
      return { success: false, error: 'Nicht angemeldet' };
    }

    if (user.role === 'admin') {
      await sql`
        DELETE FROM biomechanics_sessions
        WHERE id = ${id}::uuid
      `;
    } else {
      await sql`
        DELETE FROM biomechanics_sessions
        WHERE id = ${id}::uuid AND player_name = ${user.name}
      `;
    }

    revalidatePath('/video');
    return { success: true };
  } catch (error: unknown) {
    console.error('Fehler beim Löschen der Biomechanik-Session:', error);
    const msg = error instanceof Error ? error.message : 'Löschen fehlgeschlagen';
    return { success: false, error: msg };
  }
}
