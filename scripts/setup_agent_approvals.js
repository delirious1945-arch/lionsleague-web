const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const dbUrlLine = env.split(/\r?\n/).find(l => l.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.split('=')[1].trim().replace(/^['"]|['"]$/g, '');

const sql = postgres(dbUrl, { ssl: 'require' });

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS agent_approvals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cycle_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      summary TEXT NOT NULL,
      changes_diff TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      token TEXT UNIQUE NOT NULL,
      feedback TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      decided_at TIMESTAMPTZ
    );
  `;
  console.log('SUCCESS: Table agent_approvals created or verified!');
  await sql.end();
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
