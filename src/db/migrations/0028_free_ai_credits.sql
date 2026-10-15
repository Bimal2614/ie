CREATE TABLE "ai_credit_spends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signup_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" text,
	"local_id" text,
	"ip_address" text,
	"credits_granted" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_credit_spends" ADD CONSTRAINT "ai_credit_spends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signup_devices" ADD CONSTRAINT "signup_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_credit_spends_attempt_uq" ON "ai_credit_spends" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "ai_credit_spends_user_idx" ON "ai_credit_spends" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "signup_devices_device_idx" ON "signup_devices" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "signup_devices_local_idx" ON "signup_devices" USING btree ("local_id");--> statement-breakpoint
CREATE INDEX "signup_devices_user_idx" ON "signup_devices" USING btree ("user_id");