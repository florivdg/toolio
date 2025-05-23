CREATE TABLE `itunes_media_item` (
	`id` text PRIMARY KEY NOT NULL,
	`itunes_id` integer NOT NULL,
	`itunes_id_type` text NOT NULL,
	`wrapper_type` text,
	`media_type` text,
	`entity_type` text,
	`name` text NOT NULL,
	`artist_name` text,
	`censored_name` text,
	`view_url` text,
	`preview_url` text,
	`artwork_url` text,
	`release_date` integer,
	`primary_genre_name` text,
	`content_advisory_rating` text,
	`description` text,
	`country` text,
	`currency` text,
	`additional_data` text,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `itunes_media_item_itunes_id_unique` ON `itunes_media_item` (`itunes_id`);--> statement-breakpoint
CREATE INDEX `itunes_artist_idx` ON `itunes_media_item` (`artist_name`);--> statement-breakpoint
CREATE INDEX `itunes_name_idx` ON `itunes_media_item` (`name`);--> statement-breakpoint
CREATE INDEX `itunes_media_type_idx` ON `itunes_media_item` (`media_type`);--> statement-breakpoint
CREATE TABLE `itunes_price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`media_item_id` text NOT NULL,
	`standard_price` real,
	`hd_price` real,
	`currency` text NOT NULL,
	`country` text NOT NULL,
	`additional_price_data` text,
	`recorded_at` integer NOT NULL,
	FOREIGN KEY (`media_item_id`) REFERENCES `itunes_media_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `itunes_price_media_item_idx` ON `itunes_price_history` (`media_item_id`);--> statement-breakpoint
CREATE INDEX `itunes_price_recorded_at_idx` ON `itunes_price_history` (`recorded_at`);