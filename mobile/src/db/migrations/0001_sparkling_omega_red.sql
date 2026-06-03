CREATE TABLE `notes` (
	`uuid` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`title` text NOT NULL,
	`body` text,
	`is_pinned` integer DEFAULT 0 NOT NULL,
	`is_archived` integer DEFAULT 0 NOT NULL,
	`server_revision` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
