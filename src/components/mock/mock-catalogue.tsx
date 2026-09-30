"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  FileText,
  Headphones,
  ListChecks,
  Lock,
  Mic,
  PenLine,
  Play,
  Search,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTIONS, type SectionKey } from "@/lib/ielts";
import { abandonMock, startMock } from "@/app/actions/mock";
import type { MockTestCard, OpenSitting } from "@/app/actions/mock";

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
  openSitting,
}: {
  tests: MockTestCard[];
  module: "academic" | "general";
  /**
   * The one sitting this candidate has running, if any — see `startMock`. It may
   * be a paper from the OTHER stream, which is why it arrives on its own rather
   * than being read off `tests`.
   */
  openSitting: OpenSitting | null;
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
      {/* The sitting in progress comes first — its clock is still running, and
          until it is finished or abandoned it is the only paper that opens. */}
      {openSitting && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            In progress · the clock is still running
          </p>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3">
            <Clock className="size-4 shrink-0 text-warning" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">
                {openSitting.title}
              </span>
              <span className="block text-xs text-ink-muted">
                Finish or abandon this before starting another paper.
              </span>
            </span>
            <AbandonButton sessionId={openSitting.sessionId} />
            <Link
              href={`/mock-test/${openSitting.sessionId}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-warning px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Play className="size-3.5" /> Resume
            </Link>
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
              <PaperCard
                key={t.id}
                test={t}
                // Blocked by SOMETHING ELSE being open. A paper is never blocked
                // by its own sitting — that one resumes.
                blockedBy={
                  openSitting && openSitting.mockTestId !== t.id ? openSitting.title : null
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * Walking away from a sitting, deliberately.
 *
 * THE ESCAPE HATCH THE ONE-AT-A-TIME RULE NEEDS. With one sitting allowed at a
 * time, a paper opened by accident would otherwise hold every other paper shut
 * until its three-hour clock ran out. `abandonMock` has existed for exactly this
 * since the sittings did; it simply had nothing to press it.
 *
 * ARMED BEFORE IT FIRES, because it is not undoable: the sitting is closed, it
 * never becomes a report, and the answers in it are gone. It disarms itself
 * after a few seconds so a stray first click does not leave a live destructive
 * button sitting on the page.
 */
function AbandonButton({ sessionId }: { sessionId: string }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(t);
  }, [armed]);

  return (
    <form action={abandonMock} className="shrink-0">
      <input type="hidden" name="sessionId" value={sessionId} />
      <button
        type="submit"
        onClick={(e) => {
          if (armed) return;
          e.preventDefault();
          setArmed(true);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border bg-paper px-2.5 py-1.5 text-xs font-semibold transition-colors",
          armed
            ? "border-danger/60 text-danger"
            : "border-line text-ink-soft hover:border-danger/50 hover:text-ink",
        )}
      >
        {armed ? "Sure? This ends it" : "Abandon"}
      </button>
    </form>
  );
}

function PaperCard({ test, blockedBy }: { test: MockTestCard; blockedBy: string | null }) {
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
              <FileText className="size-3" /> Report
            </Link>
          )}
          {resuming ? (
            <Link
              href={`/mock-test/${test.inProgressSessionId}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-warning px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Clock className="size-3.5" /> Resume
            </Link>
          ) : blockedBy ? (
            // One sitting at a time — `startMock` enforces it, and would send a
            // press here straight back to the open paper. Saying so beforehand
            // is kinder than a redirect nobody asked for.
            <button
              type="button"
              disabled
              title={`Finish or abandon ${blockedBy} first — only one mock runs at a time.`}
              aria-label={`Start is unavailable: finish or abandon ${blockedBy} first`}
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted"
            >
              <Lock className="size-3.5" /> Start
            </button>
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
