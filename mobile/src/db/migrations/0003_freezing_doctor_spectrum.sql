CREATE TABLE `reminders` (
	`uuid` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`title` text NOT NULL,
	`notes` text,
	`remind_at` text NOT NULL,
	`recurrence` text DEFAULT 'none' NOT NULL,
	`is_completed` integer DEFAULT 0 NOT NULL,
	`completed_at` text,
	`snoozed_until` text,
	`source_uuid` text,
	`source_type` text,
	`notification_id` text,
	`server_revision` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `reminders_user_remind_at_idx` ON `reminders` (`user_id`,`remind_at`);