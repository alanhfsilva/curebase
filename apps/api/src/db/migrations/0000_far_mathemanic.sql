CREATE EXTENSION IF NOT EXISTS "citext";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" citext NOT NULL,
	"phone" text NOT NULL,
	"age" integer NOT NULL,
	"weight" numeric NOT NULL,
	"height" numeric NOT NULL,
	"unit_system" text DEFAULT 'us' NOT NULL,
	"bmi" numeric(6, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unit_system_check" CHECK ("participants"."unit_system" IN ('us', 'metric')),
	CONSTRAINT "age_check" CHECK ("participants"."age" >= 0 AND "participants"."age" <= 120),
	CONSTRAINT "weight_check" CHECK ("participants"."weight" > 0),
	CONSTRAINT "height_check" CHECK ("participants"."height" > 0),
	CONSTRAINT "bmi_check" CHECK ("participants"."bmi" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "participants_email_unique" ON "participants" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "participants_bmi_idx" ON "participants" USING btree ("bmi");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "participants_created_at_id_idx" ON "participants" USING btree ("created_at" DESC,"id" DESC);