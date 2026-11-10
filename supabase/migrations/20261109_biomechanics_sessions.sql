-- ============================================================================
-- LIONS WEYHAUSEN 2.0 - SUPABASE MIGRATION: BIOMECHANICS SESSIONS
-- ============================================================================
-- Konformität: 100% DSGVO §10 & BBDV-Standard (0 Bytes Video-Rohdaten)
-- Zweck: Optionale geräteübergreifende Synchronisation von Wurf-Steckbriefen
-- Freigabe: Erteilt von Sebastian am 09.11.2026
-- ============================================================================

CREATE TABLE IF NOT EXISTS biomechanics_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    player_id BIGINT REFERENCES players(id) ON DELETE SET NULL,
    player_name TEXT NOT NULL,
    consistency_score DOUBLE PRECISION NOT NULL,       -- z.B. 94.8 (%)
    release_speed_kmh DOUBLE PRECISION NOT NULL,       -- z.B. 21.4 (km/h)
    launch_angle_deg DOUBLE PRECISION NOT NULL,        -- z.B. 14.2 (Grad)
    elbow_drop_mm DOUBLE PRECISION NOT NULL,           -- z.B. -3.2 (mm)
    shoulder_drift_mm DOUBLE PRECISION NOT NULL,       -- z.B. 4.5 (mm)
    drawback_angle_deg DOUBLE PRECISION NOT NULL,      -- z.B. 52.0 (Grad)
    release_angle_deg DOUBLE PRECISION NOT NULL,       -- z.B. 116.0 (Grad)
    follow_through_angle_deg DOUBLE PRECISION NOT NULL,-- z.B. 164.0 (Grad)
    stance_angle_deg DOUBLE PRECISION,                 -- z.B. 178.5 (Grad)
    trunk_lean_angle_deg DOUBLE PRECISION,             -- z.B. 4.1 (Grad)
    landmark_confidence_pct INTEGER,                   -- z.B. 95 (%)
    is_high_confidence BOOLEAN NOT NULL DEFAULT true,  -- Schwellenwert >= 70% gem. §12.6
    release_dispersion_mm DOUBLE PRECISION,            -- 3-Dart Streuradius am Apex (mm)
    speed_std_dev_kmh DOUBLE PRECISION,                -- Tempo-Standardabweichung (km/h)
    launch_angle_std_dev_deg DOUBLE PRECISION,         -- Launch-Angle Standardabweichung (Grad)
    dispersion_rating TEXT,                            -- 'EXZELLENT' | 'STABIL' | 'VERBESSERBAR'
    calibration_method TEXT DEFAULT 'anthropometric',  -- 'anthropometric' | 'board_height' | 'oche_marker'
    video_mode TEXT DEFAULT 'Echtzeit'                 -- 'Slow-Motion' | 'Echtzeit'
);

-- Indizes für schnelle Abfragen im Spieler- und Admin-Profil
CREATE INDEX IF NOT EXISTS idx_biomechanics_player_name ON biomechanics_sessions(player_name);
CREATE INDEX IF NOT EXISTS idx_biomechanics_created_at ON biomechanics_sessions(created_at DESC);

-- Row Level Security (RLS) gem. §10.3 AGENTS.md (Zugriff nur für den Spieler selbst und Admins)
ALTER TABLE biomechanics_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'biomechanics_sessions' AND policyname = 'Spieler und Admins duerfen Biomechanik einsehen'
    ) THEN
        CREATE POLICY "Spieler und Admins duerfen Biomechanik einsehen"
            ON biomechanics_sessions FOR SELECT
            USING (
                auth.role() = 'authenticated' AND (
                    player_name = current_setting('request.jwt.claim.name', true) OR
                    current_setting('request.jwt.claim.role', true) = 'admin'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'biomechanics_sessions' AND policyname = 'Spieler und Admins duerfen Biomechanik loeschen'
    ) THEN
        CREATE POLICY "Spieler und Admins duerfen Biomechanik loeschen"
            ON biomechanics_sessions FOR DELETE
            USING (
                auth.role() = 'authenticated' AND (
                    player_name = current_setting('request.jwt.claim.name', true) OR
                    current_setting('request.jwt.claim.role', true) = 'admin'
                )
            );
    END IF;
END
$$;
