CREATE TABLE "mock_test_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"question_number" integer NOT NULL,
	"sheet_number" integer DEFAULT 0 NOT NULL,
	"section" "section" NOT NULL,
	"question_type" "question_type" NOT NULL,
	"marks" integer DEFAULT 1 NOT NULL,
	"response" jsonb,
	"audio_url" text,
	"transcript" text,
	"is_correct" boolean,
	"raw_score" integer,
	"band" numeric(2, 1),
	"ai_feedback" jsonb,
	"time_spent_sec" integer,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"mock_test_id" uuid,
	"module" "ielts_module" DEFAULT 'academic' NOT NULL,
	"listening_band" numeric(2, 1),
	"reading_band" numeric(2, 1),
	"writing_band" numeric(2, 1),
	"speaking_band" numeric(2, 1),
	"overall_band" numeric(2, 1),
	"listening_raw" integer,
	"reading_raw" integer,
	"section_breakdown" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_test_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mock_test_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"section" "section" NOT NULL,
	"part_number" integer DEFAULT 1 NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"module_index" integer DEFAULT 0 NOT NULL,
	"start_number" integer DEFAULT 1 NOT NULL,
	"end_number" integer DEFAULT 1 NOT NULL,
	"total_questions" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_test_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mock_test_id" uuid NOT NULL,
	"module" "ielts_module" DEFAULT 'academic' NOT NULL,
	"status" "mock_session_status" DEFAULT 'in_progress' NOT NULL,
	"current_section" "section",
	"current_section_index" integer DEFAULT 0 NOT NULL,
	"current_section_ends_at" timestamp with time zone,
	"timeline" jsonb,
	"draft_answers" jsonb,
	"draft_timings" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"module" "ielts_module" DEFAULT 'academic' NOT NULL,
	"source" text DEFAULT 'cambridge' NOT NULL,
	"book" text,
	"test_number" integer,
	"title" text NOT NULL,
	"description" text,
	"total_minutes" integer DEFAULT 0 NOT NULL,
	"total_questions" integer DEFAULT 0 NOT NULL,
	"total_parts" integer DEFAULT 0 NOT NULL,
	"is_full_test" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mock_test_answers" ADD CONSTRAINT "mock_test_answers_session_id_mock_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."mock_test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_results" ADD CONSTRAINT "mock_test_results_session_id_mock_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."mock_test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_results" ADD CONSTRAINT "mock_test_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_results" ADD CONSTRAINT "mock_test_results_mock_test_id_mock_tests_id_fk" FOREIGN KEY ("mock_test_id") REFERENCES "public"."mock_tests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_sections" ADD CONSTRAINT "mock_test_sections_mock_test_id_mock_tests_id_fk" FOREIGN KEY ("mock_test_id") REFERENCES "public"."mock_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_sections" ADD CONSTRAINT "mock_test_sections_section_id_practice_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."practice_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_sessions" ADD CONSTRAINT "mock_test_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_sessions" ADD CONSTRAINT "mock_test_sessions_mock_test_id_mock_tests_id_fk" FOREIGN KEY ("mock_test_id") REFERENCES "public"."mock_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mock_answers_item_uq" ON "mock_test_answers" USING btree ("session_id","section_id","question_number");--> statement-breakpoint
CREATE INDEX "mock_answers_session_idx" ON "mock_test_answers" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "mock_answers_session_section_idx" ON "mock_test_answers" USING btree ("session_id","section");--> statement-breakpoint
CREATE UNIQUE INDEX "mock_results_session_uq" ON "mock_test_results" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "mock_results_user_idx" ON "mock_test_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mock_sections_test_idx" ON "mock_test_sections" USING btree ("mock_test_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mock_sections_order_uq" ON "mock_test_sections" USING btree ("mock_test_id","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "mock_sections_part_uq" ON "mock_test_sections" USING btree ("mock_test_id","section_id");--> statement-breakpoint
CREATE INDEX "mock_sections_section_idx" ON "mock_test_sections" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "mock_sessions_user_idx" ON "mock_test_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mock_sessions_status_idx" ON "mock_test_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mock_sessions_user_test_idx" ON "mock_test_sessions" USING btree ("user_id","mock_test_id","status");--> statement-breakpoint
CREATE INDEX "mock_sessions_expiry_idx" ON "mock_test_sessions" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mock_tests_slug_uq" ON "mock_tests" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "mock_tests_source_uq" ON "mock_tests" USING btree ("book","test_number","module");--> statement-breakpoint
CREATE INDEX "mock_tests_listing_idx" ON "mock_tests" USING btree ("module","is_active","sort_order");