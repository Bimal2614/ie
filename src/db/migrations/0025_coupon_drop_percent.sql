ALTER TABLE "coupons" ALTER COLUMN "amount_inr_cents" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" DROP COLUMN "percent";