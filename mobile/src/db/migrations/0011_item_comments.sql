CREATE TABLE `shopping_list_item_comments` (
	`uuid` text PRIMARY KEY NOT NULL,
	`shopping_list_item_uuid` text NOT NULL,
	`user_id` text,
	`author_name` text NOT NULL,
	`body` text NOT NULL,
	`server_revision` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `shopping_list_item_comments_item_idx` ON `shopping_list_item_comments` (`shopping_list_item_uuid`);