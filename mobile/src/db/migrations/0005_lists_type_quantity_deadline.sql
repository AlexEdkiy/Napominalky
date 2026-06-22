ALTER TABLE `shopping_lists` ADD `type` text NOT NULL DEFAULT 'goods';
--> statement-breakpoint
ALTER TABLE `shopping_list_items` ADD `quantity` integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `shopping_list_items` ADD `deadline` text;
