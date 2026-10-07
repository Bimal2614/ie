ALTER TABLE "coupons" ADD COLUMN "amount_inr_cents" integer;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "amount_usd_cents" integer;--> statement-breakpoint
-- Percent coupons become the amount they took off Pro (the cheapest plan) under
-- the old arithmetic, so a class on one pays exactly what it paid for Pro before.
UPDATE "coupons" SET
	"amount_inr_cents" = 149900 - floor(149900 * (100 - "percent") / 10000.0) * 100,
	"amount_usd_cents" = 2000 - floor(2000 * (100 - "percent") / 10000.0) * 100;
