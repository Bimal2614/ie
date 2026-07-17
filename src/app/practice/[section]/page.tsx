import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, Layers, BookOpen, Headphones, PenLine, Mic, Sparkles } from "lucide-react";
import { and, eq, count, sql } from "drizzle-orm";
import { db } from "@/db";
import { questionSets, questions } from "@/db/schema";
import { SECTIONS, SECTION_ORDER, SECTION_TYPES, QUESTION_TYPES, type SectionKey, type QuestionTypeKey } from "@/lib/ielts";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  const sec = SECTIONS[section as SectionKey];
  return { title: `${sec ? sec.label : "Practice"} · IELTSAce`, robots: { index: false } };
}

const SECTION_ICON: Record<SectionKey, typeof Headphones> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};

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

export default async function SectionPracticePage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!SECTION_ORDER.includes(section as SectionKey)) notFound();

  const secKey = section as SectionKey;
  const sec = SECTIONS[secKey];
  const Icon = SECTION_ICON[secKey];
  const frame = SECTION_FRAME[secKey];
  const sectionTypes = SECTION_TYPES[secKey];

  // Questions per type, in one grouped join. This used to fetch every set and
  // then run a COUNT per set — a query per row, growing with the content.
  const typeCounts = await db
    .select({
      questionType: questionSets.questionType,
      n: count(questions.id),
    })
    .from(questionSets)
    .innerJoin(
      questions,
      and(eq(questions.setId, questionSets.id), eq(questions.isActive, true)),
    )
    .where(and(eq(questionSets.section, secKey), eq(questionSets.isActive, true)))
    .groupBy(questionSets.questionType);

  const countByType = new Map<string, number>(
    typeCounts.map((r) => [r.questionType, Number(r.n)]),
  );
  const totalAvailable = [...countByType.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      {/* ── Section header (PTE-style: icon + title + subtitle + meta chips) ── */}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className={cn("grid h-12 w-12 place-items-center rounded-xl", ACCENT_ICON_BG[secKey])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h1 className="display text-3xl md:text-4xl">{sec.label}</h1>
          <p className="mt-1 text-sm text-ink-muted">{sec.blurb}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="chip">
              <Clock className="h-3.5 w-3.5" />
              {sec.durationMin} min in exam
            </span>
            <span className="chip">
              <Layers className="h-3.5 w-3.5" />
              {sectionTypes.length} task types
            </span>
            <span className="chip">
              <BookOpen className="h-3.5 w-3.5" />
              {totalAvailable.toLocaleString()} questions available
            </span>
          </div>
        </div>
      </div>

      {/* ── Task cards grid (PTE-style: 3 columns) ── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sectionTypes.map((typeKey) => {
          const meta = QUESTION_TYPES[typeKey];
          const qCount = countByType.get(typeKey) ?? 0;
          const disabled = qCount === 0;

          return disabled ? (
            <div
              key={typeKey}
              className={cn(
                "flex h-full flex-col gap-3 rounded-xl border bg-paper-elev p-4 shadow-[var(--shadow-sm)] opacity-60 cursor-not-allowed",
                frame.border,
              )}
            >
              <TaskCardInner meta={meta} qCount={qCount} disabled secKey={secKey} />
            </div>
          ) : (
            <Link
              key={typeKey}
              href={`/practice/${section}/${typeKey}`}
              className={cn(
                "group flex h-full flex-col gap-3 rounded-xl border bg-paper-elev p-4 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]",
                frame.border,
                frame.hoverBorder,
              )}
            >
              <TaskCardInner meta={meta} qCount={qCount} disabled={false} secKey={secKey} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Inner content of a task card — shared between disabled div and active Link. */
function TaskCardInner({
  meta,
  qCount,
  disabled,
  secKey,
}: {
  meta: (typeof QUESTION_TYPES)[QuestionTypeKey];
  qCount: number;
  disabled: boolean;
  secKey: SectionKey;
}) {
  return (
    <>
      {/* Title + AI badge */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-ink-strong leading-tight">
          {meta.label}
        </h3>
        {meta.aiEvaluated && (
          <span className="chip chip-accent shrink-0">
            <Sparkles className="h-3 w-3" />
            AI scored
          </span>
        )}
      </div>

      {/* One-line description */}
      <p className="text-sm text-ink-muted">{meta.shortDescription}</p>

      {/* Skill tags */}
      <div className="flex flex-wrap gap-1">
        {meta.scoredSkills.map((skill) => (
          <span key={skill} className="chip text-[10px]">
            {skill}
          </span>
        ))}
      </div>

      {/* Count + CTA */}
      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        <span className="text-xs text-ink-muted">
          {qCount > 0 ? `${qCount.toLocaleString()} question${qCount !== 1 ? "s" : ""}` : "Library coming"}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all",
            disabled
              ? "bg-ink-muted"
              : "bg-brand group-hover:translate-x-0.5 group-hover:bg-brand-hover group-hover:shadow-md",
          )}
        >
          Practice
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </>
  );
}
