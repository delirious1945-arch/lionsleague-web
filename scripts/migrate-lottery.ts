import { sql } from '../src/lib/db';

async function runMigration() {
  try {
    console.log('Erstelle Tabelle training_lottery_winners...');
    await sql`
      CREATE TABLE IF NOT EXISTS training_lottery_winners (
        id SERIAL PRIMARY KEY,
        month_key VARCHAR(7) NOT NULL UNIQUE, -- z.B. '2026-10'
        month_label VARCHAR(50) NOT NULL,    -- z.B. 'Oktober 2026'
        draw_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
        player_name TEXT NOT NULL,
        completed_games INTEGER NOT NULL DEFAULT 0,
        prize TEXT NOT NULL DEFAULT '5 Freigetränke',
        total_eligible_players INTEGER NOT NULL DEFAULT 0,
        eligible_players JSONB DEFAULT '[]'::jsonb,
        acknowledged_by_winner BOOLEAN DEFAULT FALSE,
        claimed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    console.log('Erstelle Index für month_key und player_name...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_training_lottery_month ON training_lottery_winners(month_key);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_training_lottery_player ON training_lottery_winners(player_name);
    `;

    console.log('Migration erfolgreich abgeschlossen!');
  } catch (err) {
    console.error('Fehler bei der Migration:', err);
  } finally {
    await sql.end();
  }
}

runMigration();
