import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), email: text('email').notNull().unique(), name: text('name'),
  role: text('role', { enum: ['owner','admin','member'] }).notNull().default('member'),
  plan: text('plan', { enum: ['trial','pro','team'] }).notNull().default('trial'),
  credits: integer('credits').notNull().default(200), createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull().references(() => users.id),
  name: text('name').notNull(), marketplace: text('marketplace').notNull().default('US'), createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, t => [index('idx_workspaces_owner_id').on(t.ownerId)]);
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(), workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
  asin: text('asin'), sku: text('sku'), title: text('title').notNull(), category: text('category').notNull(),
  status: text('status', { enum: ['draft','generating','review','complete'] }).notNull().default('draft'),
  imageCount: integer('image_count').notNull().default(0), createdAt: integer('created_at', { mode: 'timestamp' }).notNull(), updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, t => [index('idx_projects_workspace_updated').on(t.workspaceId, t.updatedAt)]);
export const promptTemplates = sqliteTable('prompt_templates', {
  id: text('id').primaryKey(), kind: text('kind').notNull(), category: text('category').notNull(),
  title: text('title').notNull(), prompt: text('prompt').notNull(), negativePrompt: text('negative_prompt').notNull(),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(true), createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, t => [index('idx_prompt_templates_kind_category').on(t.kind, t.category)]);
export const generations = sqliteTable('generations', {
  id: text('id').primaryKey(), projectId: text('project_id').notNull().references(() => projects.id), userId: text('user_id').notNull().references(() => users.id),
  slot: text('slot').notNull(), prompt: text('prompt').notNull(), provider: text('provider').notNull().default('openai'), assetKey: text('asset_key'), status: text('status').notNull(), creditsUsed: integer('credits_used').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, t => [index('idx_generations_project_created').on(t.projectId, t.createdAt), index('idx_generations_user_asset').on(t.userId, t.assetKey)]);
export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(), workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
  plan: text('plan').notNull(), status: text('status').notNull(), renewsAt: integer('renews_at', { mode: 'timestamp' }), createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, t => [index('idx_subscriptions_workspace').on(t.workspaceId)]);
