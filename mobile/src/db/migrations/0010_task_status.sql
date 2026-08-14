ALTER TABLE `shopping_lists` ADD `status` text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE `shopping_lists` ADD `status_is_manual` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shopping_lists` ADD `is_completed` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shopping_list_items` ADD `status` text DEFAULT 'new' NOT NULL;