"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Loader2, ChevronRight } from "lucide-react";
import { getCreditUsage, type CreditUsage } from "@/app/actions/credits";
import { LocalTime } from "@/components/history/local-time";
import { QUESTION_TYPES, SECTIONS } from "@/lib/ielts";
import { PLANS, cheapestPlanWith } from "@/lib/plans";
import { cn } from "@/lib/utils";

/**
 * The top bar's free-credits pill, and what opens when it is clicked.
 *
 * Candidates click the count expecting it to explain itself — Clarity showed
 * one clicking it twice, then hunting for Upgrade. So it opens: how many are
 * left, what each spent one went on (each linking to its review), and the plan
 * that makes scoring unlimited.
 *
 * The list is fetched on first open, not with the page: the top bar renders on
 * every signed-in route and almost nobody opens this.
 */
export function CreditsPopover({ credits }: { credits: number }) {
  const [open, setOpen] = useState(false);
  const [usage, setUsage] = useState<CreditUsage | null>(null);
  const [failed, setFailed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const unlimitedPlan = PLANS[cheapestPlanWith((p) => p.aiScoring)].label;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    // Re-read on every open: a credit spent since the last look must show.
    if (next) {
      setFailed(false);
      getCreditUsage()
        .then(setUsage)
        .catch(() => setFailed(true));
    }
  }

  // The session's count can trail a submit made in another tab; once the
  // ledger has been read, the pill and the popover agree on the fresh one.
  const remaining = usage?.remaining ?? credits;
  const spends = usage?.spends ?? [];
  const total = remaining + spends.length;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={`${remaining} free AI ${remaining === 1 ? "score" : "scores"} left for Writing and Speaking`}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-3 text-xs font-medium text-brand transition-colors hover:border-brand/60"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span className="font-semibold tabular-nums">{remaining}</span>
        <span className="hidden sm:inline">AI {remaining === 1 ? "credit" : "credits"} left</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Your free AI scores"
            className="surface fixed inset-x-4 top-14 z-50 overflow-hidden shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80"
          >
            <div className="border-b border-line px-4 pt-4 pb-3">
              <p className="text-sm font-semibold text-ink">
                {remaining} of {total} free AI {total === 1 ? "score" : "scores"} left
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">One credit scores one Writing task or one Speaking part.</p>
              <div className="mt-3 flex gap-1" aria-hidden>
                {Array.from({ length: total }, (_, i) => (
                  <span
                    key={i}
                    className={cn("h-1.5 flex-1 rounded-full", i < spends.length ? "bg-line-strong" : "bg-brand")}
                  />
                ))}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {usage === null && !failed ? (
                <p className="flex items-center gap-2 px-4 py-4 text-xs text-ink-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading your history…
                </p>
              ) : failed ? (
                <p className="px-4 py-4 text-xs text-ink-muted">Couldn&apos;t load your history. Try again in a moment.</p>
              ) : spends.length === 0 ? (
                <p className="px-4 py-4 text-xs text-ink-muted">
                  None used yet. Submit a Writing task or a Speaking part to get a band score.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {spends.map((s) => (
                    <li key={s.attemptId}>
                      <Link
                        href={`/history/${s.attemptId}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-paper-sunken"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">
                            {QUESTION_TYPES[s.questionType]?.label ?? s.questionType}
                          </p>
                          <p className="truncate text-xs text-ink-muted">
                            {SECTIONS[s.section]?.label ?? s.section} ·{" "}
                            <LocalTime value={s.spentAt} options={{ day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }} />
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                          {s.avgBand !== null ? s.avgBand.toFixed(1) : <span className="text-xs font-normal text-ink-muted">Scoring…</span>}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-line bg-paper-sunken px-4 py-3">
              <p className="text-xs text-ink-soft">
                {unlimitedPlan} and above score every Writing and Speaking answer, with no limit.
              </p>
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-accent text-sm font-semibold text-accent-foreground hover:bg-accent-hover"
              >
                Upgrade for unlimited scores <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
