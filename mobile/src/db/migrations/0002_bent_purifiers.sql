CREATE TABLE `shopping_lists` (
	`uuid` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`title` text NOT NULL,
	`server_revision` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `shopping_list_items` (
	`uuid` text PRIMARY KEY NOT NULL,
	`shopping_list_uuid` text NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`is_checked` integer DEFAULT 0 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`server_revision` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `shopping_list_items_list_idx` ON `shopping_list_items` (`shopping_list_uuid`);