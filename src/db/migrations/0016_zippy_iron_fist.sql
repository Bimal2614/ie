CREATE TYPE "public"."payment_provider" AS ENUM('manual', 'razorpay');--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "provider" "payment_provider" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "provider_subscription_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "provider_plan_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "razorpay_customer_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_provider_event_uq" ON "webhook_events" USING btree ("provider","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_provider_sub_uq" ON "subscriptions" USING btree ("provider_subscription_id");