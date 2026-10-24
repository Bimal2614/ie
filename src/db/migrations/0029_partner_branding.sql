ALTER TABLE "partners" ADD COLUMN "subdomain" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "logo_key" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "brand_color" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "brand_text_color" text;--> statement-breakpoint
CREATE UNIQUE INDEX "partners_subdomain_uq" ON "partners" USING btree ("subdomain");