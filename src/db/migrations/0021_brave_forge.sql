CREATE TYPE "public"."coupon_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"percent" integer NOT NULL,
	"status" "coupon_status" DEFAULT 'active' NOT NULL,
	"ends_at" timestamp with time zone,
	"note" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "partner_payments" ADD COLUMN "list_price_cents" integer;--> statement-breakpoint
ALTER TABLE "partner_payments" ADD COLUMN "discount_percent" integer;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "coupon_id" uuid;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_code_uq" ON "coupons" USING btree ("code");--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;