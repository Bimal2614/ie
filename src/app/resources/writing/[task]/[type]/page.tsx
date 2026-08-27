import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, X, ListOrdered, MessageSquareQuote } from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { WRITING_GUIDES, type WritingGuide, type WritingQuestionType } from "@/lib/study-writing";
import { breadcrumbJsonLd, courseJsonLd, howToJsonLd, pageMeta } from "@/lib/seo";

/**
 * One page per Writing question type — /resources/writing/task-1/line-graph and
 * its eleven siblings.
 *
 * WHY. These types were already written up in study-writing.ts, but they only
 * existed as anchors inside the two long task pages. "IELTS line graph", "IELTS
 * task 1 process diagram" and "IELTS discussion essay" are each searched in their
 * own right, and a #fragment cannot rank for them — only a URL can. Giving each
 * type a real page turns existing content into twelve indexable landing pages
 * without writing a word of new copy.
 */

type Params = { task: string; type: string };

const TASK_LABEL = { "task-1": "Task 1", "task-2": "Task 2" } as const;

export function generateStaticParams() {
  return (["task-1", "task-2"] as const).flatMap((task) =>
    WRITING_GUIDES[task].types.map((t) => ({ task, type: t.slug })),
  );
}

function get(task: string, type: string): { guide: WritingGuide; qt: WritingQuestionType } | undefined {
  const guide = WRITING_GUIDES[task as "task-1" | "task-2"];
  if (!guide) return undefined;
  const qt = guide.types.find((t) => t.slug === type);
  return qt ? { guide, qt } : undefined;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { task, type } = await params;
  const found = get(task, type);
  if (!found) return {};
  const { guide, qt } = found;
  const label = TASK_LABEL[guide.task];
  const n = qt.name;

  return pageMeta({
    // qt.shortName, not qt.name — the full name carries a parenthetical gloss
    // that ran the title to 126 characters. See WritingQuestionType.shortName.
    title: `IELTS Writing ${label}: ${qt.shortName} Band 9 Guide`,
    description: `How to answer an IELTS Writing ${label} ${qt.shortName.toLowerCase()} question: a step-by-step method, paragraph structure, useful language and a Band 9 model answer.`,
    path: `/resources/writing/${guide.task}/${qt.slug}`,
    keywords: [
      `IELTS ${n}`,
      `IELTS writing ${label.toLowerCase()} ${n.toLowerCase()}`,
      `${n} IELTS writing`,
      `IELTS ${n.toLowerCase()} vocabulary`,
      `IELTS ${n.toLowerCase()} sample answer`,
      `how to write IELTS ${n.toLowerCase()}`,
      `IELTS writing ${label.toLowerCase()}`,
    ],
  });
}

export default async function WritingTypePage({ params }: { params: Promise<Params> }) {
  const { task, type } = await params;
  const found = get(task, type);
  if (!found) notFound();
  const { guide, qt } = found;

  const label = TASK_LABEL[guide.task];
  const basePath = `/resources/writing/${guide.task}`;
  const siblings = guide.types.filter((t) => t.slug !== qt.slug);

  return (
    <MarketingShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Study materials", path: "/resources" },
          { name: "IELTS Writing", path: "/resources/writing" },
          { name: `Writing ${label}`, path: basePath },
          { name: qt.name, path: `${basePath}/${qt.slug}` },
        ])}
      />
      <JsonLd
        data={courseJsonLd({
          name: `IELTS Writing ${label}: ${qt.name}`,
          description: qt.what,
          path: `${basePath}/${qt.slug}`,
        })}
      />
      <JsonLd
        data={howToJsonLd({
          name: `How to answer an IELTS Writing ${label} ${qt.name.toLowerCase()} question`,
          description: qt.what,
          steps: qt.howToAnswer.map((text, i) => ({ name: `Step ${i + 1}`, text })),
        })}
      />

      <Link href={basePath} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
        <ArrowLeft className="size-4" /> IELTS Writing {label}
      </Link>

      <header className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
          IELTS Writing {label} · 2026
        </p>
        <h1 className="font-serif mt-3 text-4xl tracking-tight sm:text-5xl">{qt.name}</h1>
        <p className="mt-4 text-ink-soft">{qt.what}</p>
      </header>

      {/* How to answer */}
      <h2 className="mt-12 flex items-center gap-2 text-xl font-semibold text-ink">
        <ListOrdered className="size-5 text-ink-soft" /> How to answer
      </h2>
      <ol className="mt-4 space-y-3">
        {qt.howToAnswer.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm text-ink-soft">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      {/* Plan + structure */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl bg-paper-sunken p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Plan (before you write)</h2>
          <p className="mt-2 text-sm text-ink-soft">{qt.plan}</p>
        </div>
        <div className="rounded-xl bg-paper-sunken p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Structure</h2>
          <ol className="mt-2 space-y-1 text-sm text-ink-soft">
            {qt.structure.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      </div>

      {/* Useful language + mistakes */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-line p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Useful language</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            {qt.usefulLanguage.map((u) => <li key={u} className="leading-relaxed">{u}</li>)}
          </ul>
        </div>
        <div className="rounded-xl border border-line p-5">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <X className="size-3.5 text-danger" /> Common mistakes
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            {qt.mistakes.map((m) => (
              <li key={m} className="flex gap-2"><X className="mt-0.5 size-3.5 shrink-0 text-danger" />{m}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sample + model answer */}
      <h2 className="mt-12 flex items-center gap-2 text-xl font-semibold text-ink">
        <MessageSquareQuote className="size-5 text-ink-soft" /> Sample question &amp; model answer
      </h2>
      <p className="mt-4 rounded-xl border border-line bg-paper-elev p-4 text-sm italic leading-relaxed text-ink-soft">
        {qt.sample.question}
      </p>
      <div className="mt-4 rounded-xl border-2 border-green bg-green-soft/30 p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-green px-2.5 py-0.5 text-xs font-semibold text-green-ink">{qt.sample.band}</span>
          <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">Model answer</span>
        </div>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink">{qt.sample.modelAnswer}</p>
      </div>
      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Why it scores</h3>
        <ul className="mt-2 space-y-1.5">
          {qt.sample.whyItScores.map((w) => (
            <li key={w} className="flex gap-2 text-sm text-ink-soft">
              <Check className="mt-0.5 size-3.5 shrink-0 text-green" />{w}
            </li>
          ))}
        </ul>
      </div>

      {/* Sibling types — internal linking is what spreads authority across these
          twelve pages instead of stranding each one. */}
      <h2 className="mt-14 text-xl font-semibold text-ink">Other {label} question types</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {siblings.map((s) => (
          <Link
            key={s.slug}
            href={`${basePath}/${s.slug}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper-elev p-4 transition-shadow hover:shadow-lg"
          >
            <span className="text-sm font-semibold text-ink">{s.name}</span>
            <ArrowRight className="size-4 shrink-0 text-ink-muted" />
          </Link>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={basePath}
          className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken"
        >
          Full {label} guide <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Get this essay AI-scored <ArrowRight className="size-4" />
        </Link>
      </div>
    </MarketingShell>
  );
}
