ALTER TABLE "mock_test_sessions" ADD COLUMN "current_section_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_test_sessions" ADD COLUMN "current_section_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mock_test_sessions" ADD COLUMN "draft_answers" jsonb;--> statement-breakpoint
ALTER TABLE "mock_test_sessions" ADD COLUMN "draft_timings" jsonb;--> statement-breakpoint
ALTER TABLE "user_responses" ADD COLUMN "attempt_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deactivated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deactivation_reason" text;--> statement-breakpoint
CREATE INDEX "question_sets_paging_idx" ON "question_sets" USING btree ("section","question_type","is_active","created_at","id");--> statement-breakpoint
CREATE INDEX "user_responses_history_idx" ON "user_responses" USING btree ("user_id","created_at","section","question_type");--> statement-breakpoint
CREATE INDEX "user_responses_user_set_idx" ON "user_responses" USING btree ("user_id","set_id");--> statement-breakpoint
CREATE INDEX "user_responses_attempt_idx" ON "user_responses" USING btree ("attempt_id");