CREATE TYPE "public"."transaction_direction" AS ENUM('C', 'D');--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"direction" "transaction_direction" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"user_id" uuid,
	"partner_id" uuid,
	"recorded_by_user_id" uuid,
	"provider" "payment_provider" NOT NULL,
	"provider_payment_id" text,
	"subscription_id" uuid,
	"partner_payment_id" uuid,
	"reverses_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_sign_ck" CHECK (("transactions"."direction" = 'C' AND "transactions"."amount_cents" > 0)
       OR ("transactions"."direction" = 'D' AND "transactions"."amount_cents" < 0)),
	CONSTRAINT "transactions_manual_note_ck" CHECK ("transactions"."provider" <> 'manual' OR "transactions"."note" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_partner_payment_id_partner_payments_id_fk" FOREIGN KEY ("partner_payment_id") REFERENCES "public"."partner_payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_reverses_id_transactions_id_fk" FOREIGN KEY ("reverses_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_idempotency_uq" ON "transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "transactions_currency_created_idx" ON "transactions" USING btree ("currency","created_at");--> statement-breakpoint
CREATE INDEX "transactions_user_created_idx" ON "transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "transactions_partner_created_idx" ON "transactions" USING btree ("partner_id","created_at");--> statement-breakpoint
CREATE INDEX "transactions_provider_payment_idx" ON "transactions" USING btree ("provider_payment_id");