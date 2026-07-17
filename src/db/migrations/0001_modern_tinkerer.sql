CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."mock_session_status" AS ENUM('in_progress', 'completed', 'abandoned', 'expired');--> statement-breakpoint
CREATE TYPE "public"."module_scope" AS ENUM('academic', 'general', 'both');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('multiple_choice_single', 'multiple_choice_multiple', 'matching_information', 'matching_headings', 'matching_features', 'matching_sentence_endings', 'sentence_completion', 'summary_completion', 'note_completion', 'table_completion', 'flowchart_completion', 'diagram_label_completion', 'form_completion', 'short_answer', 'true_false_notgiven', 'yes_no_notgiven', 'plan_map_diagram_labelling', 'writing_task1_academic', 'writing_task1_general', 'writing_task2', 'speaking_part1', 'speaking_part2', 'speaking_part3');--> statement-breakpoint
CREATE TYPE "public"."section" AS ENUM('listening', 'reading', 'writing', 'speaking');--> statement-breakpoint
CREATE TABLE "mock_test_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"section" "section" NOT NULL,
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
CREATE TABLE "mock_test_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"set_id" uuid,
	"section" "section" NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
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
CREATE TABLE "mock_test_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mock_test_id" uuid,
	"module" "ielts_module" DEFAULT 'academic' NOT NULL,
	"status" "mock_session_status" DEFAULT 'in_progress' NOT NULL,
	"current_section" "section",
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module" "ielts_module" DEFAULT 'academic' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"config" jsonb,
	"is_full_test" boolean DEFAULT true NOT NULL,
	"total_minutes" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module" "module_scope" DEFAULT 'both' NOT NULL,
	"section" "section" NOT NULL,
	"question_type" "question_type" NOT NULL,
	"title" text NOT NULL,
	"instructions" text,
	"difficulty" "difficulty" DEFAULT 'medium' NOT NULL,
	"passage_text" text,
	"audio_url" text,
	"transcript" text,
	"image_url" text,
	"part_number" integer,
	"estimated_minutes" integer,
	"tags" jsonb,
	"source" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"set_id" uuid NOT NULL,
	"section" "section" NOT NULL,
	"question_type" "question_type" NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"prompt" text,
	"content" jsonb,
	"correct_answer" jsonb,
	"explanation" text,
	"marks" integer DEFAULT 1 NOT NULL,
	"word_limit_min" integer,
	"word_limit_max" integer,
	"prep_seconds" integer,
	"speak_seconds" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" uuid,
	"set_id" uuid,
	"section" "section" NOT NULL,
	"question_type" "question_type" NOT NULL,
	"module" "ielts_module" DEFAULT 'academic' NOT NULL,
	"response" jsonb,
	"audio_url" text,
	"transcript" text,
	"is_correct" boolean,
	"raw_score" integer,
	"band" numeric(2, 1),
	"ai_feedback" jsonb,
	"time_spent_sec" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mock_test_answers" ADD CONSTRAINT "mock_test_answers_session_id_mock_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."mock_test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_answers" ADD CONSTRAINT "mock_test_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_questions" ADD CONSTRAINT "mock_test_questions_session_id_mock_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."mock_test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_questions" ADD CONSTRAINT "mock_test_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_results" ADD CONSTRAINT "mock_test_results_session_id_mock_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."mock_test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_results" ADD CONSTRAINT "mock_test_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_sessions" ADD CONSTRAINT "mock_test_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_test_sessions" ADD CONSTRAINT "mock_test_sessions_mock_test_id_mock_tests_id_fk" FOREIGN KEY ("mock_test_id") REFERENCES "public"."mock_tests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_set_id_question_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."question_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_responses" ADD CONSTRAINT "user_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_responses" ADD CONSTRAINT "user_responses_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mock_answers_session_question_uq" ON "mock_test_answers" USING btree ("session_id","question_id");--> statement-breakpoint
CREATE INDEX "mock_answers_session_idx" ON "mock_test_answers" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "mock_questions_session_idx" ON "mock_test_questions" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mock_results_session_uq" ON "mock_test_results" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "mock_results_user_idx" ON "mock_test_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mock_sessions_user_idx" ON "mock_test_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mock_sessions_status_idx" ON "mock_test_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mock_tests_module_idx" ON "mock_tests" USING btree ("module");--> statement-breakpoint
CREATE INDEX "question_sets_section_idx" ON "question_sets" USING btree ("section");--> statement-breakpoint
CREATE INDEX "question_sets_module_idx" ON "question_sets" USING btree ("module");--> statement-breakpoint
CREATE INDEX "question_sets_type_idx" ON "question_sets" USING btree ("question_type");--> statement-breakpoint
CREATE INDEX "questions_set_idx" ON "questions" USING btree ("set_id");--> statement-breakpoint
CREATE INDEX "questions_section_idx" ON "questions" USING btree ("section");--> statement-breakpoint
CREATE INDEX "questions_type_idx" ON "questions" USING btree ("question_type");--> statement-breakpoint
CREATE INDEX "user_responses_user_idx" ON "user_responses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_responses_user_created_idx" ON "user_responses" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_responses_type_idx" ON "user_responses" USING btree ("question_type");