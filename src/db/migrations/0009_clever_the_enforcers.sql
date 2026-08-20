ALTER TABLE "question_sets" ADD COLUMN "external_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "question_sets_external_key_uq" ON "question_sets" USING btree ("external_key");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_set_order_uq" ON "questions" USING btree ("set_id","order_index");