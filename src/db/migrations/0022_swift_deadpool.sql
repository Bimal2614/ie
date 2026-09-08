ALTER TABLE "coupons" DROP CONSTRAINT "coupons_created_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "coupons" DROP COLUMN "created_by_user_id";