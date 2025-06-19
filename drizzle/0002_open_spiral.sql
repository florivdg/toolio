CREATE TABLE `wishlist_items` (
	`id` text PRIMARY KEY NOT NULL,
	`wishlist_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` real,
	`url` text NOT NULL,
	`image_url` text,
	`is_active` integer DEFAULT true NOT NULL,
	`is_purchased` integer DEFAULT false NOT NULL,
	`priority` integer DEFAULT 0,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`wishlist_id`) REFERENCES `wishlists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `wishlists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
