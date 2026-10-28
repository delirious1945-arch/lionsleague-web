import postgres from 'postgres';

const rawConnectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.tqajpkonwdmnuzgqsyvn:Luca03091510%21@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

// Automatisch Supabase Transaction Pooler (Port 6543) nutzen statt Session Mode (Port 5432, Limit 15),
// um EMAXCONNSESSION-Fehler bei parallelen Zugriffen (Vercel Serverless + Tablets) zu verhindern.
const connectionString = rawConnectionString.replace(
  '.pooler.supabase.com:5432',
  '.pooler.supabase.com:6543'
);

const globalForSql = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>;
};

export const sql =
  globalForSql.sql ??
  postgres(connectionString, {
    prepare: false,
    fetch_types: false,
    ssl: 'require',
    max: 6,
    idle_timeout: 10,
    max_lifetime: 60 * 5,
    connect_timeout: 15,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForSql.sql = sql;
}

