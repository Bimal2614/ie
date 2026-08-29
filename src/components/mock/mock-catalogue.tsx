"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  Headphones,
  ListChecks,
  Mic,
  PenLine,
  Play,
  RotateCcw,
  Search,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTIONS, type SectionKey } from "@/lib/ielts";
import { startMock } from "@/app/actions/mock";
import type { MockTestCard } from "@/app/actions/mock";

/**
 * The mock catalogue: every full-length paper we hold for the candidate's
 * module, grouped by book.
 *
 * The papers are FIXED. Choosing "Cambridge 19 · Test 2" gets that paper's own
 * twelve parts every time, so two sittings are comparable and a band means the
 * same thing twice. There is no "generate me a test" button, because a paper
 * assembled from a random draw is not a Cambridge test and its band is not
 * comparable to anything.
 *
 * Filtering and grouping happen here rather than on the server: the whole
 * catalogue for one module is ~44 rows of metadata, so a round trip per
 * keystroke would be slower than the search itself.
 */

const SECTION_ICON: Record<SectionKey, typeof Headphones> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};

export function MockCatalogue({
  tests,
  module,
}: {
  tests: MockTestCard[];
  module: "academic" | "general";
}) {
  const [query, setQuery] = useState("");

  const books = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? tests.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            (t.book ?? "").toLowerCase().includes(q) ||
            String(t.testNumber ?? "").includes(q),
        )
      : tests;

    // The catalogue arrives newest book first (Cambridge 21 down to 11, tests
    // 1-4 inside each), so grouping in a Map preserves that order without a
    // second sort.
    const grouped = new Map<string, MockTestCard[]>();
    for (const t of matched) {
      const key = t.book ?? "Other";
      const list = grouped.get(key);
      if (list) list.push(t);
      else grouped.set(key, [t]);
    }
    return [...grouped.entries()];
  }, [query, tests]);

  const open = tests.filter((t) => t.inProgressSessionId);

  if (tests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line py-16 text-center">
        <Trophy className="size-8 text-ink-muted" />
        <p className="text-sm text-ink-muted">
          No complete {module === "general" ? "General Training" : "Academic"} papers yet.
        </p>
        <p className="max-w-sm text-xs text-ink-muted">
          A mock test needs all four modules of one book and test. Papers appear here as soon as
          their Reading and Writing are in the library.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Unfinished sittings come first — their clock is still running. */}
      {open.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            In progress · the clock is still running
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {open.map((t) => (
              <Link
                key={t.id}
                href={`/mock-test/${t.inProgressSessionId}`}
                className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 transition-colors hover:border-warning"
              >
                <Clock className="size-4 shrink-0 text-warning" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{t.title}</span>
                  <span className="block text-xs text-ink-muted">Resume where the clock is now</span>
                </span>
                <Play className="size-4 shrink-0 text-warning" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a book or test…"
          className="h-10 w-full rounded-lg border border-line bg-paper-elev pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </label>

      {books.length === 0 && (
        <p className="rounded-xl border border-dashed border-line py-10 text-center text-sm text-ink-muted">
          Nothing matches &ldquo;{query}&rdquo;.
        </p>
      )}

      {books.map(([book, papers]) => (
        <section key={book} className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-bold text-ink-strong">{book}</h2>
            <span className="text-xs text-ink-muted">
              {papers.length} test{papers.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {papers.map((t) => (
              <PaperCard key={t.id} test={t} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PaperCard({ test }: { test: MockTestCard }) {
  const resuming = Boolean(test.inProgressSessionId);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-paper-elev p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{test.title}</p>
          <p className="mt-0.5 inline-flex items-center gap-2 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> {test.totalMinutes} min
            </span>
            <span className="inline-flex items-center gap-1">
              <ListChecks className="size-3" /> {test.totalQuestions} marks
            </span>
          </p>
        </div>
        {test.bestBand && (
          <div className="shrink-0 rounded-lg bg-brand-soft px-2.5 py-1 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-brand">Best</p>
            <p className="display text-base leading-tight tabular-nums text-brand">{test.bestBand}</p>
          </div>
        )}
      </div>

      {/* What the paper is made of, in exam order. */}
      <div className="flex flex-wrap gap-1.5">
        {test.parts.map((p) => {
          const Icon = SECTION_ICON[p.section];
          const sec = SECTIONS[p.section];
          return (
            <span
              key={p.section}
              title={`${sec.label}: ${p.count} part${p.count === 1 ? "" : "s"} · ${p.minutes} min`}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                `chip-${sec.accent}`,
              )}
            >
              <Icon className="size-3" />
              {p.count} · {p.minutes}m
            </span>
          );
        })}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="text-[11px] text-ink-muted">
          {test.attempts > 0
            ? `Sat ${test.attempts} time${test.attempts === 1 ? "" : "s"}`
            : "Not attempted"}
        </span>
        <div className="flex items-center gap-2">
          {test.lastSessionId && (
            <Link
              href={`/results/${test.lastSessionId}`}
              className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand/50 hover:text-ink"
            >
              <RotateCcw className="size-3" /> Report
            </Link>
          )}
          {resuming ? (
            <Link
              href={`/mock-test/${test.inProgressSessionId}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-warning px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Clock className="size-3.5" /> Resume
            </Link>
          ) : (
            // A plain form post, so starting a paper works without JavaScript
            // and the sitting is created server-side where the clock lives.
            <form action={startMock}>
              <input type="hidden" name="mockTestId" value={test.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Play className="size-3.5" /> Start
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
