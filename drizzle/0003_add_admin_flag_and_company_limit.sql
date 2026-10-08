ALTER TABLE "companies" ADD COLUMN "max_team_members" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;