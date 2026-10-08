ALTER TABLE "users" ADD COLUMN "is_super_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "max_companies" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "max_team_members" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_by_admin_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "disabled_at" timestamp;