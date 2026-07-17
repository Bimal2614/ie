import type { Metadata } from "next";
import Link from "next/link";
import { Headphones, BookOpen, PenLine, Mic, ArrowRight, Clock, Layers, Sparkles } from "lucide-react";
import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { questionSets, questions } from "@/db/schema";
import { SECTIONS, SECTION_ORDER, SECTION_TYPES, QUESTION_TYPES, type SectionKey, type QuestionTypeKey } from "@/lib/ielts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Practice · IELTSAce", robots: { index: false } };

const SECTION_ICON = { listening: Headphones, reading: BookOpen, writing: PenLine, speaking: Mic } as const;

/**
 * Section card borders — a full border in the section's colour, as PTEAce
 * does it (never a left-rail accent). Colours come from the --section-* design
 * tokens rather than raw palette values, so a theme change reaches them.
 */
const SECTION_FRAME: Record<SectionKey, { border: string; hoverBorder: string }> = {
  speaking:  { border: "border-section-speaking/40",  hoverBorder: "hover:border-section-speaking/70" },
  writing:   { border: "border-section-writing/40",   hoverBorder: "hover:border-section-writing/70" },
  reading:   { border: "border-section-reading/40",   hoverBorder: "hover:border-section-reading/70" },
  listening: { border: "border-section-listening/40", hoverBorder: "hover:border-section-listening/70" },
};

const ACCENT_ICON_BG: Record<SectionKey, string> = {
  listening: "bg-section-listening-soft text-section-listening",
  reading:   "bg-section-reading-soft text-section-reading",
  writing:   "bg-section-writing-soft text-section-writing",
  speaking:  "bg-section-speaking-soft text-section-speaking",
};

export default async function PracticePage() {
  // Count sets per section
  const sectionRows = await db
    .select({ section: questionSets.section, n: count() })
    .from(questionSets)
    .where(eq(questionSets.isActive, true))
    .groupBy(questionSets.section);
  const setCounts = Object.fromEntries(sectionRows.map((r) => [r.section, Number(r.n)])) as Record<string, number>;

  // Count total questions
  const [{ total: totalQuestions }] = await db.select({ total: count() }).from(questions).where(eq(questions.isActive, true));

  // Count AI-scored types
  const aiScoredCount = Object.values(QUESTION_TYPES).filter((t) => t.aiEvaluated).length;

  return (
    <div className="space-y-10">
      {/* ── Hero header (PTE-style) ── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
          Practice
        </p>
        <h1 className="display mt-1 text-3xl md:text-4xl">
          Train every IELTS task on its own terms
        </h1>
        <p className="mt-2 max-w-2xl text-base text-ink-soft">
          Real IELTS-aligned timings, AI-scored writing and speaking, and section-by-section progress tracking.
        </p>
      </div>

      {/* ── Section grid (4 columns on xl, 2 on md) ── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {SECTION_ORDER.map((key) => {
          const sec = SECTIONS[key];
          const Icon = SECTION_ICON[key];
          const frame = SECTION_FRAME[key];
          const taskTypes = SECTION_TYPES[key];

          return (
            <Link
              key={key}
              href={`/practice/${key}`}
              className={cn(
                "group flex h-full flex-col rounded-xl border bg-paper-elev p-6 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]",
                frame.border,
                frame.hoverBorder,
              )}
            >
              {/* Icon + task types chip */}
              <div className="flex items-start justify-between gap-3">
                <div className={cn("grid h-11 w-11 place-items-center rounded-xl", ACCENT_ICON_BG[key])}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`chip chip-${sec.accent}`}>
                  {taskTypes.length} task types
                </span>
              </div>

              {/* Section name + blurb */}
              <h3 className="display mt-5 text-2xl">{sec.label}</h3>
              <p className="mt-1 text-sm text-ink-muted">{sec.blurb}</p>

              {/* Footer: timing + CTA */}
              <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
                <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                  <Clock className="h-3.5 w-3.5" />
                  {sec.durationMin} min in exam
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all group-hover:translate-x-0.5 group-hover:bg-brand-hover group-hover:shadow-md">
                  Open
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── High-level stats row ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="stat-tile">
          <Layers className="h-4 w-4 text-ink-muted" />
          <span className="stat-value">{Object.keys(QUESTION_TYPES).length}</span>
          <span className="stat-label">Task types covered</span>
        </div>
        <div className="stat-tile">
          <Sparkles className="h-4 w-4 text-ink-muted" />
          <span className="stat-value">{aiScoredCount}</span>
          <span className="stat-label">AI-scored tasks</span>
        </div>
        <div className="stat-tile">
          <BookOpen className="h-4 w-4 text-ink-muted" />
          <span className="stat-value">{Number(totalQuestions).toLocaleString()}</span>
          <span className="stat-label">Questions in library</span>
        </div>
        <div className="stat-tile">
          <Clock className="h-4 w-4 text-ink-muted" />
          <span className="stat-value">~2h:44m</span>
          <span className="stat-label">Real exam length</span>
          <span className="text-xs text-ink-muted">Listening + Reading + Writing + Speaking</span>
        </div>
      </div>
    </div>
  );
}
