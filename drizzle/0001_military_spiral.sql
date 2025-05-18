CREATE TABLE `itunes_media_item` (
	`id` text PRIMARY KEY NOT NULL,
	`track_id` integer NOT NULL,
	`wrapper_type` text,
	`kind` text,
	`artist_name` text,
	`track_name` text NOT NULL,
	`track_censored_name` text,
	`track_view_url` text,
	`preview_url` text,
	`artwork_url` text,
	`release_date` integer,
	`primary_genre_name` text,
	`description` text,
	`country` text,
	`currency` text,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `itunes_media_item_track_id_unique` ON `itunes_media_item` (`track_id`);--> statement-breakpoint
CREATE INDEX `itunes_artist_idx` ON `itunes_media_item` (`artist_name`);--> statement-breakpoint
CREATE INDEX `itunes_track_name_idx` ON `itunes_media_item` (`track_name`);--> statement-breakpoint
CREATE TABLE `itunes_price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`media_item_id` text NOT NULL,
	`track_price` real,
	`track_hd_price` real,
	`collection_price` real,
	`collection_hd_price` real,
	`currency` text NOT NULL,
	`country` text NOT NULL,
	`recorded_at` integer NOT NULL,
	FOREIGN KEY (`media_item_id`) REFERENCES `itunes_media_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `itunes_price_media_item_idx` ON `itunes_price_history` (`media_item_id`);--> statement-breakpoint
CREATE INDEX `itunes_price_recorded_at_idx` ON `itunes_price_history` (`recorded_at`);