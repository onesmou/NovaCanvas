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
  await sql`CREATE TABLE IF NOT EXISTS projects (id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, asin text, title text NOT NULL, category text NOT NULL DEFAULT 'Amazon', market text NOT NULL DEFAULT 'Amazon US', status text NOT NULL DEFAULT 'draft', image_count integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`;
  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS market text NOT NULL DEFAULT 'Amazon US'`;
  await sql`CREATE INDEX IF NOT EXISTS idx_projects_owner_updated ON projects(owner_id, updated_at DESC)`;
  await sql`CREATE TABLE IF NOT EXISTS generated_assets (id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, provider text NOT NULL, model text NOT NULL, slot text NOT NULL DEFAULT 'IMAGE', prompt text NOT NULL, storage_key text UNIQUE NOT NULL, mime_type text NOT NULL DEFAULT 'image/png', width integer, height integer, credit_cost integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE INDEX IF NOT EXISTS idx_generated_assets_project_created ON generated_assets(project_id, created_at DESC)`;
}
