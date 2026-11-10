import { sql } from '../src/lib/db';

/**
 * Migration-Runner: Biomechanics Sessions
 * -----------------------------------------------------------------
 * Führt die DDL-Erstellung der Tabelle biomechanics_sessions in Supabase aus.
 * Manuell freigegeben von Sebastian am 09.11.2026 gem. AGENTS.md §5, §10.
 * Ausführen mit: npx tsx scripts/migrate-biomechanics.ts
 */
async function runMigration() {
  try {
    console.log('🚀 Starte Migration: biomechanics_sessions...');

    await sql`
      CREATE TABLE IF NOT EXISTS biomechanics_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
        player_id BIGINT REFERENCES players(id) ON DELETE SET NULL,
        player_name TEXT NOT NULL,
        consistency_score DOUBLE PRECISION NOT NULL,
        release_speed_kmh DOUBLE PRECISION NOT NULL,
        launch_angle_deg DOUBLE PRECISION NOT NULL,
        elbow_drop_mm DOUBLE PRECISION NOT NULL,
        shoulder_drift_mm DOUBLE PRECISION NOT NULL,
        drawback_angle_deg DOUBLE PRECISION NOT NULL,
        release_angle_deg DOUBLE PRECISION NOT NULL,
        follow_through_angle_deg DOUBLE PRECISION NOT NULL,
        stance_angle_deg DOUBLE PRECISION,
        trunk_lean_angle_deg DOUBLE PRECISION,
        landmark_confidence_pct INTEGER,
        is_high_confidence BOOLEAN NOT NULL DEFAULT true,
        release_dispersion_mm DOUBLE PRECISION,
        speed_std_dev_kmh DOUBLE PRECISION,
        launch_angle_std_dev_deg DOUBLE PRECISION,
        dispersion_rating TEXT,
        calibration_method TEXT DEFAULT 'anthropometric',
        video_mode TEXT DEFAULT 'Echtzeit'
      );
    `;

    console.log('✓ Tabelle biomechanics_sessions erfolgreich verifiziert/erstellt.');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_biomechanics_player_name ON biomechanics_sessions(player_name);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_biomechanics_created_at ON biomechanics_sessions(created_at DESC);
    `;

    console.log('✓ Indizes für player_name und created_at angelegt.');
    console.log('🎉 Migration biomechanics_sessions erfolgreich abgeschlossen!');
  } catch (err) {
    console.error('❌ Fehler bei der Migration von biomechanics_sessions:', err);
  } finally {
    await sql.end();
  }
}

runMigration();
