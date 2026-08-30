CREATE TYPE "public"."subscription_actor" AS ENUM('user', 'admin', 'system', 'webhook');--> statement-breakpoint
CREATE TYPE "public"."subscription_event_type" AS ENUM('created', 'activated', 'renewed', 'upgraded', 'downgraded', 'cancel_requested', 'cancelled', 'expired', 'reactivated', 'payment_succeeded', 'payment_failed', 'refunded', 'plan_granted', 'plan_revoked');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'cancelling', 'expired', 'cancelled', 'past_due');--> statement-breakpoint
CREATE TYPE "public"."user_plan" AS ENUM('free', 'pro', 'premium');--> statement-breakpoint
CREATE TABLE "subscription_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid,
	"event" "subscription_event_type" NOT NULL,
	"actor" "subscription_actor" DEFAULT 'system' NOT NULL,
	"actor_user_id" uuid,
	"from_plan" "user_plan",
	"to_plan" "user_plan",
	"status" "subscription_status",
	"effective_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"amount_cents" integer,
	"currency" text,
	"note" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" "user_plan" NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current_period_start" timestamp with time zone DEFAULT now() NOT NULL,
	"current_period_end" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"price_cents" integer,
	"currency" text DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan" "user_plan" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription_logs" ADD CONSTRAINT "subscription_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_logs" ADD CONSTRAINT "subscription_logs_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_logs" ADD CONSTRAINT "subscription_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_logs_user_created_idx" ON "subscription_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "subscription_logs_subscription_idx" ON "subscription_logs" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_logs_event_idx" ON "subscription_logs" USING btree ("event");--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_period_end_idx" ON "subscriptions" USING btree ("status","current_period_end");