import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
export function getDb() { if (!env.DB) throw new Error('D1 binding DB is unavailable'); return drizzle(env.DB, { schema }); }

export async function ensureDatabase() {
  if (!env.DB) throw new Error('D1 binding DB is unavailable');
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY NOT NULL, email text NOT NULL UNIQUE, name text, role text DEFAULT 'member' NOT NULL, plan text DEFAULT 'trial' NOT NULL, credits integer DEFAULT 200 NOT NULL, created_at integer NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS workspaces (id text PRIMARY KEY NOT NULL, owner_id text NOT NULL, name text NOT NULL, marketplace text DEFAULT 'US' NOT NULL, created_at integer NOT NULL, FOREIGN KEY (owner_id) REFERENCES users(id))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS projects (id text PRIMARY KEY NOT NULL, workspace_id text NOT NULL, asin text, sku text, title text NOT NULL, category text NOT NULL, status text DEFAULT 'draft' NOT NULL, image_count integer DEFAULT 0 NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces(id))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS generations (id text PRIMARY KEY NOT NULL, project_id text NOT NULL, user_id text NOT NULL, slot text NOT NULL, prompt text NOT NULL, provider text DEFAULT 'openai' NOT NULL, asset_key text, status text NOT NULL, credits_used integer DEFAULT 0 NOT NULL, created_at integer NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id), FOREIGN KEY (user_id) REFERENCES users(id))"),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_projects_workspace_updated ON projects(workspace_id, updated_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_generations_project_created ON generations(project_id, created_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_generations_user_asset ON generations(user_id, asset_key)'),
  ]);
}
