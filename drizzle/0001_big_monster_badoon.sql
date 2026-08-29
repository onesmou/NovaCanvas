CREATE INDEX `idx_generations_project_created` ON `generations` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_projects_workspace_updated` ON `projects` (`workspace_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_prompt_templates_kind_category` ON `prompt_templates` (`kind`,`category`);--> statement-breakpoint
CREATE INDEX `idx_subscriptions_workspace` ON `subscriptions` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `idx_workspaces_owner_id` ON `workspaces` (`owner_id`);