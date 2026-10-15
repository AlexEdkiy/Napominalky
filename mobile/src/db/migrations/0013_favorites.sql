ALTER TABLE `notes` ADD `is_favorite` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `shopping_lists` ADD `is_favorite` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `shopping_list_items` ADD `is_favorite` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `reminders` ADD `is_favorite` integer DEFAULT 0 NOT NULL;
