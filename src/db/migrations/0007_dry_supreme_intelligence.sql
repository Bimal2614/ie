CREATE TABLE "practice_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module" "module_scope" DEFAULT 'both' NOT NULL,
	"section_type" "section" NOT NULL,
	"question_type" "question_type" NOT NULL,
	"question_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"book" text,
	"test_number" integer,
	"part_number" integer,
	"source" text DEFAULT 'original' NOT NULL,
	"title" text NOT NULL,
	"instructions" text,
	"difficulty" "difficulty" DEFAULT 'medium' NOT NULL,
	"estimated_minutes" integer,
	"audio_url" text,
	"transcript" text,
	"passage_text" text,
	"image_url" text,
	"start_number" integer DEFAULT 1 NOT NULL,
	"end_number" integer DEFAULT 1 NOT NULL,
	"total_questions" integer DEFAULT 0 NOT NULL,
	"questions" jsonb NOT NULL,
	"tags" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "practice_sections_section_idx" ON "practice_sections" USING btree ("section_type");--> statement-breakpoint
CREATE INDEX "practice_sections_type_idx" ON "practice_sections" USING btree ("question_type");--> statement-breakpoint
CREATE INDEX "practice_sections_paging_idx" ON "practice_sections" USING btree ("section_type","question_type","is_active","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_sections_source_uq" ON "practice_sections" USING btree ("book","test_number","section_type","part_number");