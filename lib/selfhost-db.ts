import postgres from 'postgres';

let client: ReturnType<typeof postgres> | null = null;
export function db() {
  if (!client) client = postgres(process.env.DATABASE_URL || 'postgres://novacanvas:novacanvas@localhost:5432/novacanvas', { max: 10, idle_timeout: 20 });
  return client;
}

export async function ensureSelfHostedSchema() {
  const sql = db();
  await sql`CREATE TABLE IF NOT EXISTS app_users (id uuid PRIMARY KEY, email text UNIQUE NOT NULL, name text NOT NULL, password_hash text NOT NULL, role text NOT NULL DEFAULT 'member', credits integer NOT NULL DEFAULT 200, created_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS app_sessions (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE INDEX IF NOT EXISTS idx_app_sessions_user_expires ON app_sessions(user_id, expires_at)`;
}
