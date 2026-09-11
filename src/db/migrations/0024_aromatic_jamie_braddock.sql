CREATE TYPE "public"."session_client" AS ENUM('web', 'ios', 'android');--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "client" "session_client" DEFAULT 'web' NOT NULL;