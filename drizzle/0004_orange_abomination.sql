CREATE TABLE `fiscal_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`notes` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `fiscal_plans_date_idx` ON `fiscal_plans` (`year`,`month`);--> statement-breakpoint
CREATE TABLE `planned_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`template_id` text,
	`name` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`due_date` integer NOT NULL,
	`type` text NOT NULL,
	`is_done` integer DEFAULT false NOT NULL,
	`category_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_id`) REFERENCES `fiscal_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `transaction_templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `planned_transactions_user_idx` ON `planned_transactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `planned_transactions_plan_idx` ON `planned_transactions` (`plan_id`);--> statement-breakpoint
CREATE INDEX `planned_transactions_due_date_idx` ON `planned_transactions` (`due_date`);--> statement-breakpoint
CREATE TABLE `transaction_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`type` text NOT NULL,
	`category_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`recurrence_type` text NOT NULL,
	`day_of_month` integer,
	`specific_months` text,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transaction_templates_user_idx` ON `transaction_templates` (`user_id`);--> statement-breakpoint
CREATE INDEX `transaction_templates_active_idx` ON `transaction_templates` (`is_active`);