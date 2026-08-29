ALTER TABLE `generations` ADD `provider` text DEFAULT 'openai' NOT NULL;--> statement-breakpoint
ALTER TABLE `generations` ADD `asset_key` text;--> statement-breakpoint
CREATE INDEX `idx_generations_user_asset` ON `generations` (`user_id`,`asset_key`);