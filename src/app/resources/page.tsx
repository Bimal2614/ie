import type { Metadata } from "next";
import Link from "next/link";
import { Headphones, BookOpen, PenLine, Mic, ArrowRight, type LucideIcon } from "lucide-react";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { Reveal } from "@/components/marketing/motion";
import { STUDY } from "@/lib/study-content";

export const metadata: Metadata = {
  title: "IELTS Study Materials — Strategies, Templates & Tips (2026) | IELTSAce",
  description:
    "Free IELTS study materials for 2026: exam-accurate strategies, dos and don'ts, essay and letter templates, and tips for every Listening, Reading, Writing and Speaking task type.",
  alternates: { canonical: "/resources" },
};

const ICONS: Record<string, LucideIcon> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};

export default function ResourcesPage() {
  return (
    <div className="min-h-svh bg-paper text-ink">
      <LandingNav alwaysSolid />

      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-28 sm:pt-32">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Study materials · 2026</p>
          <h1 className="font-serif mt-3 text-4xl tracking-tight sm:text-5xl">
            Everything the exam rewards, in one place.
          </h1>
          <p className="mt-4 text-ink-soft">
            Real strategies, dos and don&apos;ts, ready-to-use templates, and tips for every task
            type across all four skills — aligned to the current 2026 IELTS format.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {STUDY.map((s, i) => {
            const Icon = ICONS[s.key];
            return (
              <Reveal key={s.key} delay={i * 0.08} className="h-full">
                <Link
                  href={`/resources/${s.key}`}
                  className="flex h-full flex-col rounded-2xl border border-line bg-paper-elev p-7 transition-shadow hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-paper-sunken text-ink-soft">
                      <Icon className="size-5" />
                    </span>
                    <h2 className="text-xl font-semibold text-ink">{s.name}</h2>
                  </div>
                  <p className="mt-4 text-sm text-ink-soft">{s.tagline}</p>
                  <p className="mt-2 flex-1 text-sm text-ink-muted">{s.overview.slice(0, 120)}…</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                    {s.key === "writing" ? "Task 1 & Task 2 · Band 9 models" : `${s.topics.length} guides`}
                    <ArrowRight className="size-4" />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
