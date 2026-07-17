"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Check,
  X,
  Clock,
  Sparkles,
  Loader2,
  CalendarDays,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SECTIONS, QUESTION_TYPES, SECTION_ORDER, type SectionKey, type QuestionTypeKey } from "@/lib/ielts";
import {
  getDaySummary,
  getAttempts,
  type DaySummary,
  type SectionRow,
  type AttemptRow,
} from "@/app/actions/history";

/** Local YYYY-MM-DD — never toISOString(), which would shift the day by the offset. */
function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(y, m - 1, d + days);
  return localDate(next);
}

function prettyDate(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === shiftDate(today, -1)) return "Yesterday";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function HistoryView({ initialDate }: { initialDate: string | null }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  /**
   * "Today" and the UTC offset are properties of the *viewer's* clock, so they
   * are resolved after mount rather than during render. Computing them inline
   * would run once on the server (UTC in production) and again in the browser
   * (the user's zone) — different days, a hydration mismatch, and a date picker
   * that disagrees with the user's calendar. It only looks correct in dev
   * because the server and browser share one machine.
   */
  const [clock, setClock] = useState<{ today: string; tz: number } | null>(null);
  const [date, setDate] = useState<string | null>(initialDate);
  const [data, setData] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const today = localDate(now);
    setClock({ today, tz: now.getTimezoneOffset() });
    setDate((d) => d ?? today);
  }, []);

  useEffect(() => {
    if (!clock || !date) return;
    let cancelled = false;
    setLoading(true);
    getDaySummary(date, clock.tz)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, clock]);

  const go = useCallback(
    (next: string) => {
      setDate(next);
      // Keep the date in the URL so a day is shareable / survives refresh.
      startTransition(() => router.replace(`/history?date=${next}`, { scroll: false }));
    },
    [router],
  );

  // Until the browser's clock is known the header renders without dates, so the
  // server HTML and the first client render agree.
  const today = clock?.today ?? null;
  const isToday = date !== null && date === today;
  const ready = clock !== null && date !== null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-2xl">History</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Everything you&apos;ve attempted, day by day.
          </p>
        </div>

        {/* Date picker — step a day at a time, or jump straight to one. */}
        <div className={cn("flex items-center gap-1.5", !ready && "invisible")}>
          <Button
            variant="outline"
            size="icon"
            onClick={() => date && go(shiftDate(date, -1))}
            disabled={!ready}
            aria-label="Previous day"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <label className="relative inline-flex items-center">
            <CalendarDays className="pointer-events-none absolute left-2.5 size-4 text-ink-muted" />
            <input
              type="date"
              value={date ?? ""}
              max={today ?? undefined}
              disabled={!ready}
              onChange={(e) => e.target.value && go(e.target.value)}
              aria-label="Show activity for date"
              className="h-9 rounded-md border border-line bg-paper-elev pl-8 pr-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>

          <Button
            variant="outline"
            size="icon"
            onClick={() => date && go(shiftDate(date, 1))}
            disabled={!ready || isToday}
            aria-label="Next day"
          >
            <ChevronRight className="size-4" />
          </Button>

          {ready && !isToday && (
            <Button variant="ghost" size="sm" onClick={() => go(today!)} className="text-ink-soft">
              Today
            </Button>
          )}
        </div>
      </div>

      <p className="min-h-5 text-sm font-medium text-ink-strong">
        {ready ? prettyDate(date!, today!) : null}
      </p>

      {!ready || loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-ink-muted">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : !data || data.attempted === 0 ? (
        <EmptyDay date={date!} today={today!} />
      ) : (
        <>
          <StatTiles data={data} />
          <div className="space-y-3">
            {SECTION_ORDER.filter((s) => data.sections.some((r) => r.section === s)).map((s) => (
              <SectionBlock
                key={s}
                row={data.sections.find((r) => r.section === s)!}
                date={date!}
                tz={clock!.tz}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Stats
 * ------------------------------------------------------------------ */

function StatTiles({ data }: { data: DaySummary }) {
  const tiles = [
    { label: "Questions attempted", value: String(data.attempted), icon: Sparkles },
    {
      label: "Correct",
      value: data.graded > 0 ? `${data.correct} / ${data.graded}` : "—",
      icon: Check,
    },
    {
      label: "Accuracy",
      value: data.accuracy === null ? "—" : `${data.accuracy}%`,
      icon: Sparkles,
    },
    { label: "Time spent", value: data.timeMin > 0 ? `${data.timeMin} min` : "—", icon: Clock },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border border-line bg-paper-elev p-4">
          <div className="flex items-center gap-2 text-ink-muted">
            <t.icon className="size-3.5" />
            <p className="text-xs font-semibold uppercase tracking-wider">{t.label}</p>
          </div>
          <p className="display mt-1.5 text-2xl tabular-nums">{t.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Section → type → attempts
 * ------------------------------------------------------------------ */

function SectionBlock({ row, date, tz }: { row: SectionRow; date: string; tz: number }) {
  const sec = SECTIONS[row.section];
  // Collapsed by default: Reading alone offers 15 task types, so opening every
  // section turned a day's practice into a page of scrolling. The header line
  // carries enough to decide whether to look inside.
  const [open, setOpen] = useState(false);

  // Most-practised types first — what you worked on is what you want to review.
  const ranked = [...row.types].sort((a, b) => b.attempted - a.attempted);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-paper-elev">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-paper-sunken"
      >
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", `chip-${sec.accent}`)}>
          <Sparkles className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{sec.label}</span>
          <span className="block text-xs text-ink-muted">
            {row.attempted} attempted
            {row.graded > 0 && ` · ${row.correct}/${row.graded} correct`}
            {` · ${ranked.length} task type${ranked.length !== 1 ? "s" : ""}`}
          </span>
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="border-t border-line">
          {ranked.map((t) => (
            <TypeRowBlock
              key={t.questionType}
              section={row.section}
              questionType={t.questionType}
              attempted={t.attempted}
              correct={t.correct}
              graded={t.graded}
              date={date}
              tz={tz}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The expand affordance. A bare 14px muted chevron didn't read as a control,
 * so it gets a tile with a border — the same shape the eye already reads as a
 * button elsewhere in the app.
 */
function Chevron({ open, small = false }: { open: boolean; small?: boolean }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-md border border-line bg-paper transition-colors",
        small ? "size-5" : "size-6",
      )}
      aria-hidden
    >
      <ChevronRight
        className={cn(
          "text-ink-soft transition-transform",
          small ? "size-3" : "size-3.5",
          open && "rotate-90",
        )}
      />
    </span>
  );
}

/**
 * How many marks were won, as a bar.
 *
 * Deliberately NOT called progress: it shows correct-out-of-graded, which is a
 * score. Progress would mean coverage of the question library — a lifetime
 * figure that means nothing inside a single day.
 */
function ScoreBar({ correct, graded }: { correct: number; graded: number }) {
  const pct = graded > 0 ? (correct / graded) * 100 : 0;
  return (
    <span className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-paper-sunken sm:w-28">
      <span
        className={cn(
          "block h-full rounded-full transition-all",
          // Colour carries the accuracy, so the number doesn't have to.
          pct >= 70 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-danger",
        )}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

function TypeRowBlock({
  section,
  questionType,
  attempted,
  correct,
  graded,
  date,
  tz,
}: {
  section: SectionKey;
  questionType: QuestionTypeKey;
  attempted: number;
  correct: number;
  graded: number;
  date: string;
  tz: number;
}) {
  const meta = QUESTION_TYPES[questionType];
  const [open, setOpen] = useState(false);
  const [attempts, setAttempts] = useState<AttemptRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    // Fetch on first expand only — the tree is cheap, the rows are not.
    if (next && attempts === null && !loading) {
      setLoading(true);
      getAttempts(date, tz, section, questionType)
        .then(setAttempts)
        .finally(() => setLoading(false));
    }
  };

  return (
    <div className={cn("border-b border-line last:border-0", open && "bg-paper-sunken/30")}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 py-2.5 pl-5 pr-4 text-left hover:bg-paper-sunken"
      >
        <Chevron open={open} small />
        <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{meta.label}</span>

        {graded > 0 ? (
          <>
            <ScoreBar correct={correct} graded={graded} />
            <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-ink-soft">
              {correct}/{graded}
            </span>
          </>
        ) : (
          // Writing/speaking carry no marks until AI band scoring exists.
          <span className="shrink-0 text-xs text-ink-muted">
            {attempted} answered · awaiting score
          </span>
        )}
      </button>

      {open && (
        <div className="bg-paper-sunken/40 pb-1 pl-12 pr-4">
          {loading && (
            <p className="flex items-center gap-2 py-2 text-xs text-ink-muted">
              <Loader2 className="size-3.5 animate-spin" /> Loading attempts…
            </p>
          )}
          {attempts?.length === 0 && !loading && (
            <p className="py-2 text-xs text-ink-muted">No attempts recorded.</p>
          )}
          {attempts?.map((a, i) => (
            <Link
              key={a.attemptId}
              href={`/history/${a.attemptId}`}
              className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-paper-elev"
            >
              <span className="grid size-5 shrink-0 place-items-center rounded bg-paper-elev font-mono text-[10px] tabular-nums text-ink-muted">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-ink-soft">
                {a.setTitle ?? "Untitled set"}
                <span className="ml-1.5 text-ink-muted">
                  · {a.questions} question{a.questions !== 1 ? "s" : ""}
                </span>
              </span>
              <AttemptScore attempt={a} />
              <span className="font-mono text-[11px] tabular-nums text-ink-muted">
                {a.createdAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
              <ChevronRight className="size-3.5 shrink-0 text-ink-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * An attempt's headline score: "3 / 4" for objective sets, a band for
 * AI-scored ones. A single tick would be a lie for a 4-gap table.
 */
function AttemptScore({ attempt }: { attempt: AttemptRow }) {
  if (attempt.graded === 0) {
    return attempt.avgBand !== null ? (
      <span className="rounded bg-info-soft px-1.5 py-0.5 font-mono text-[11px] font-semibold text-info">
        Band {attempt.avgBand.toFixed(1)}
      </span>
    ) : (
      <span className="rounded bg-paper-elev px-1.5 py-0.5 text-[11px] text-ink-muted">
        Awaiting score
      </span>
    );
  }
  const all = attempt.correct === attempt.graded;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums",
        all ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
      )}
    >
      {all ? <Check className="size-3" /> : <X className="size-3" />}
      {attempt.correct}/{attempt.graded}
    </span>
  );
}

function EmptyDay({ date, today }: { date: string; today: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line py-16">
      <CalendarDays className="size-8 text-ink-muted" />
      <p className="text-sm text-ink-muted">
        Nothing attempted {date === today ? "today yet" : `on ${prettyDate(date, today)}`}.
      </p>
      {/* This Button has no Slot/asChild support, so the Link wears its styles. */}
      <Link href="/practice" className={buttonVariants({ variant: "outline", size: "sm" })}>
        Start practising
      </Link>
    </div>
  );
}
