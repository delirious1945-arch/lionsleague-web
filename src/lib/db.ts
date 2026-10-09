import postgres from 'postgres';

// Für Serverless (Vercel) nutzen wir den Supabase Transaction Pooler auf Port 6543.
// Dadurch werden Verbindungen sofort wieder freigegeben und das Limit von Supabase wird nicht erschöpft.
const defaultUrl =
  'postgresql://postgres.tqajpkonwdmnuzgqsyvn:Luca03091510%21@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

let connString = process.env.DATABASE_URL || defaultUrl;

// Falls DATABASE_URL in Vercel noch auf :5432 steht, automatisch auf den stabilen Transaction Pooler :6543 umstellen:
if (connString.includes('pooler.supabase.com:5432')) {
  connString = connString.replace(':5432', ':6543');
}

const globalForDb = globalThis as unknown as {
  sql: ReturnType<typeof postgres> | undefined;
};

export const sql =
  globalForDb.sql ??
  postgres(connString, {
    prepare: false, // Pflicht für Supabase Transaction Pooler / PgBouncer
    ssl: 'require',
    max: 2, // Schutz vor Connection-Exhaustion in Vercel Serverless Functions
    idle_timeout: 10,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.sql = sql;
}
