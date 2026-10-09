import postgres from 'postgres';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.tqajpkonwdmnuzgqsyvn:Luca03091510%21@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';

export const sql = postgres(connectionString, {
  prepare: false,
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});
