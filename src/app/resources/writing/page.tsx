import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, PenLine } from "lucide-react";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { Reveal } from "@/components/marketing/motion";
import { WRITING_TASK1, WRITING_TASK2 } from "@/lib/study-writing";

export const metadata: Metadata = {
  title: "IELTS Writing — Task 1 & Task 2 Guides, Templates & Band 9 Answers (2026) | IELTSAce",
  description:
    "Complete IELTS Writing study guide for 2026: every Task 1 and Task 2 question type, how to answer, planning, structure, useful language, common mistakes and full Band 9 model answers.",
  alternates: { canonical: "/resources/writing" },
};

const CARDS = [
  { guide: WRITING_TASK1, href: "/resources/writing/task-1" },
  { guide: WRITING_TASK2, href: "/resources/writing/task-2" },
];

export default function WritingHub() {
  return (
    <div className="min-h-svh bg-paper text-ink">
      <LandingNav alwaysSolid />

      <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-28 sm:pt-32">
        <Link href="/resources" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
          <ArrowLeft className="size-4" /> All study materials
        </Link>

        <Reveal className="mt-6 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">IELTS Writing · 2026</p>
          <h1 className="font-serif mt-3 text-4xl tracking-tight sm:text-5xl">
            Two tasks, sixty minutes, four marked criteria.
          </h1>
          <p className="mt-4 text-ink-soft">
            IELTS Writing is scored on Task Achievement/Response, Coherence &amp; Cohesion, Lexical
            Resource, and Grammatical Range &amp; Accuracy. Task 2 counts twice as much as Task 1
            toward your band. Pick a task below for the full, worked guide.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {CARDS.map(({ guide, href }, i) => (
            <Reveal key={href} delay={i * 0.1} className="h-full">
              <Link href={href} className="flex h-full flex-col rounded-2xl border border-line bg-paper-elev p-7 transition-shadow hover:shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-paper-sunken text-ink-soft">
                    <PenLine className="size-5" />
                  </span>
                  <h2 className="text-xl font-semibold text-ink">{guide.title}</h2>
                </div>
                <p className="mt-4 text-sm text-ink-soft">{guide.tagline}</p>
                <p className="mt-2 flex-1 text-sm text-ink-muted">{guide.intro.slice(0, 150)}…</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                  {guide.types.length} question types · Band 9 models <ArrowRight className="size-4" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
