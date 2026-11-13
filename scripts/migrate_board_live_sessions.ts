import { sql } from '../src/lib/db';

async function migrate() {
  console.log('Creating table board_live_sessions in Supabase...');
  await sql`
    CREATE TABLE IF NOT EXISTS board_live_sessions (
      board_id VARCHAR(10) PRIMARY KEY,
      session_id VARCHAR(64) NOT NULL,
      game_type VARCHAR(32) NOT NULL,
      status VARCHAR(20) NOT NULL,
      payload JSONB NOT NULL,
      updated_at BIGINT NOT NULL
    );
  `;
  console.log('Table board_live_sessions created successfully.');
  
  // Initialize default rows for boards 1..5 if not exists
  for (const b of ['1', '2', '3', '4', '5']) {
    await sql`
      INSERT INTO board_live_sessions (board_id, session_id, game_type, status, payload, updated_at)
      VALUES (${b}, 'idle', 'idle', 'idle', '{}'::jsonb, ${Date.now()})
      ON CONFLICT (board_id) DO NOTHING;
    `;
  }
  console.log('Boards 1-5 initialized in board_live_sessions.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
