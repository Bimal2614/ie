"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAttemptDetail, type AttemptDetail, type AttemptItem } from "@/app/actions/history";
import { AttemptAnswers } from "@/components/history/attempt-answers";
import { scoreAttemptSpeaking } from "@/app/actions/speaking";
import { scoreAttemptWriting } from "@/app/actions/writing";
import { aiScoringStatus } from "@/app/actions/ai-status";
import { isCurrentSpeakingFeedback } from "@/lib/scoring/speaking-feedback";
import { QUESTION_TYPES, type SectionKey } from "@/lib/ielts";

/**
 * The AI examiner's report for a just-submitted Writing or Speaking attempt.
 *
 * WHY THIS SCREEN EXISTS. Bands are computed server-side AFTER the response is
 * sent (a speaking call is ~15s, a Gemini grade a few seconds), so submit can
 * only ever say "sent for scoring". Until now that was the end of the flow: the
 * transcript, the band and the criteria all landed in the database and the
 * candidate was never shown them — they had to find their way to History and
 * know to refresh. The whole value of an AI examiner is the feedback, so the
 * attempt now ends here instead.
 *
 * HOW IT WAITS. Scoring is already running by the time this mounts, so this only
 * polls for the result — it does not start anything, which is what keeps a
 * refresh from paying for a second grade. Intervals widen as they go: the first
 * answer usually lands in a couple of seconds, and a seven-question Part 1 takes
 * a minute, so a fixed short interval would hammer the DB for the whole tail.
 *
 * WHEN IT GIVES UP. `after()` is bounded by the route's max duration, so a long
 * batch can genuinely be cut off part-way. Rather than spinning forever, this
 * stops and offers a retry — which is the ask-again path the scoring actions
 * were written for.
 */

/**
 * Widening backoff, ~90s total.
 *
 * Tight at the start and loose at the end, because that is the shape of the
 * work: answers are scored in parallel, so a set's bands land together within
 * about the time of one call (~15s) — the early polls are what make them appear
 * as soon as they are written. The long tail exists only for a batch big enough
 * to need a second wave.
 */
const POLL_SCHEDULE_MS = [
  900, 1200, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 15000,
];

/**
 * Will this answer ever get a band?
 *
 * An answer with no recording (the upload failed) or no text can never be
 * scored, so it must not count as "pending" — otherwise the screen waits out
 * the whole schedule for a result that is never coming.
 */
function awaitsBand(item: AttemptItem, section: SectionKey): boolean {
  if (item.band !== null) return false;
  if (section === "speaking") {
    // Bandless but already carrying feedback means the scorer heard no speech in
    // this recording — a settled answer, not one still on its way. Without this
    // the screen polls its whole schedule and then offers a retry that cannot
    // possibly succeed.
    if (isCurrentSpeakingFeedback(item.aiFeedback) && "unscorable" in item.aiFeedback) {
      return false;
    }
    return Boolean(item.audioUrl);
  }
  if (section === "writing") {
    const r = item.response as Record<string, unknown> | null;
    return typeof r?.text === "string" && r.text.trim().length > 0;
  }
  return false;
}

/** Mean of the bands that have landed, to the nearest half — the IELTS convention. */
function meanBand(items: AttemptItem[]): number | null {
  const bands = items
    .map((i) => (i.band === null ? null : Number(i.band)))
    .filter((b): b is number => b !== null && Number.isFinite(b));
  if (bands.length === 0) return null;
  return Math.round((bands.reduce((t, b) => t + b, 0) / bands.length) * 2) / 2;
}

export function AttemptFeedback({
  attemptId,
  section,
  footer,
}: {
  attemptId: string;
  section: SectionKey;
  /** The parent's own navigation (Try again / Next / Finish). */
  footer?: ReactNode;
}) {
  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [waiting, setWaiting] = useState(true);
  const [gaveUp, setGaveUp] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [failed, setFailed] = useState(false);
  /** Bumped to restart the poll after a manual retry. */
  const [attempt, setAttempt] = useState(0);
  /**
   * null until known. False means this deployment has no key for the scorer, so
   * there is nothing to wait for — a distinct state from "scoring is slow".
   */
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    aiScoringStatus()
      .then((st) => {
        if (alive) setConfigured(section === "writing" ? st.writing : st.speaking);
      })
      // Unknown is treated as available: a failed status check must not hide a
      // band that is actually on its way.
      .catch(() => {
        if (alive) setConfigured(true);
      });
    return () => {
      alive = false;
    };
  }, [section]);

  /**
   * Poll until every answer that can be scored has been.
   *
   * THE LIFECYCLE FLAG IS PER EFFECT RUN, NOT A REF. React StrictMode mounts,
   * unmounts and remounts in development, so a `cancelled` ref set by the first
   * cleanup stays set — the in-flight request returns, sees it, and bails, and
   * the screen spins forever with the bands sitting in the database. A local
   * `alive` closed over by this run cannot leak into the next one.
   *
   * Double-fetching under StrictMode is harmless here: this only READS. (The
   * guard-with-a-ref pattern belongs to triggers that spend money, like mock
   * scoring — not to a poll.)
   */
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const run = async (step: number) => {
      if (!alive) return;

      let next: AttemptDetail | null = null;
      try {
        next = await getAttemptDetail(attemptId);
      } catch {
        // Transient — the next tick retries rather than giving up here.
      }
      if (!alive) return;

      if (next) {
        setDetail(next);
        setFailed(false);
      }

      const pending = next ? next.items.filter((i) => awaitsBand(i, section)).length : 1;
      if (next && pending === 0) {
        setWaiting(false);
        return;
      }
      if (step >= POLL_SCHEDULE_MS.length - 1) {
        setWaiting(false);
        // No data at all means the read is broken; data with gaps means scoring
        // didn't finish. They need different messages.
        if (next) setGaveUp(true);
        else setFailed(true);
        return;
      }
      timer = setTimeout(() => void run(step + 1), POLL_SCHEDULE_MS[step]);
    };

    setGaveUp(false);
    // Fetch once either way — the answers still have to be shown — but only
    // keep waiting when a scorer exists to produce a band.
    if (configured === false) {
      void (async () => {
        try {
          const next = await getAttemptDetail(attemptId);
          if (alive) setDetail(next);
        } catch {
          if (alive) setFailed(true);
        } finally {
          if (alive) setWaiting(false);
        }
      })();
    } else {
      setWaiting(true);
      void run(0);
    }

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [attemptId, section, attempt, configured]);

  /** Ask again for whatever the background run couldn't finish, then re-poll. */
  const retry = async () => {
    setRetrying(true);
    try {
      const fn = section === "speaking" ? scoreAttemptSpeaking : scoreAttemptWriting;
      await fn(attemptId);
    } catch {
      setFailed(true);
    } finally {
      setRetrying(false);
    }
    // Restarts the effect above, which owns the polling.
    setAttempt((n) => n + 1);
  };

  const items = detail?.items ?? [];
  const pending = items.filter((i) => awaitsBand(i, section)).length;
  const scored = items.filter((i) => i.band !== null).length;
  const overall = meanBand(items);

  return (
    <div className="space-y-4">
      {/* ── The headline: the band, once there is one ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-paper-sunken p-5">
        <div className="flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              AI examiner feedback
            </p>
            <p className="display text-2xl">
              {overall !== null ? `Band ${overall.toFixed(1)}` : waiting ? "Scoring…" : "Not scored"}
            </p>
            <p className="text-sm text-ink-muted">
              {waiting && pending > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  {scored > 0
                    ? `${scored} of ${scored + pending} scored — this takes a few seconds each.`
                    : "Grading your answers — this takes a few seconds each."}
                </span>
              )}
              {!waiting && scored > 0 && (
                <>
                  {scored > 1 ? `Mean of ${scored} answers.` : "One answer."}
                  {pending > 0 && ` ${pending} could not be scored.`}
                </>
              )}
              {!waiting && scored === 0 && !failed && configured !== false && "No answer could be scored."}
              {configured === false &&
                `AI ${section} scoring is not configured on this server, so no band can be produced. Your answers are saved.`}
              {failed && "Scoring is unavailable right now — your answers are saved."}
            </p>
          </div>
        </div>

        {/* No retry when there is no scorer to retry against. */}
        {(gaveUp || failed) && pending > 0 && configured !== false && (
          <Button variant="outline" size="sm" onClick={retry} disabled={retrying}>
            {retrying ? (
              <Loader2 className="mr-1 size-3.5 animate-spin" />
            ) : (
              <RotateCcw className="mr-1 size-3.5" />
            )}
            {retrying ? "Scoring…" : "Retry scoring"}
          </Button>
        )}
      </div>

      {/* ── Per answer: what was asked, what was said, and how it scored ── */}
      {items.length === 0 && waiting ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-muted">
          <Loader2 className="size-4 animate-spin" /> Loading your answers…
        </div>
      ) : detail === null ? null : (
        <ol className="space-y-4">
          {items.map((item, i) => {
            // One attempt is one question type, so the type is the attempt's.
            const qt = detail.questionType;
            const meta = QUESTION_TYPES[qt];
            const stillWaiting = awaitsBand(item, section);
            return (
              <li key={item.responseId} className="rounded-xl border border-line bg-paper-elev p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                      {section === "writing" ? (meta?.label ?? "Task") : `Question ${item.number ?? i + 1}`}
                    </p>
                    {/* Part 2's question is a cue card, which the renderer draws
                        from `content` — so don't also print a bare prompt. */}
                    {item.question?.prompt && (
                      <p className="mt-0.5 text-sm font-medium text-ink">{item.question.prompt}</p>
                    )}
                  </div>
                  {/* The band is the score for these sections — is_correct stays null. */}
                  <span
                    className={cn(
                      "shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold",
                      item.band !== null
                        ? "bg-brand-soft text-brand"
                        : "bg-info-soft text-info",
                    )}
                  >
                    {item.band !== null
                      ? `Band ${Number(item.band).toFixed(1)}`
                      : stillWaiting
                        ? "Scoring…"
                        : "Not scored"}
                  </span>
                </div>

                <AttemptAnswers
                  questionType={qt}
                  content={item.question?.content ?? null}
                  correctAnswer={item.question?.correctAnswer ?? null}
                  response={item.response}
                  layout={detail.set?.layout ?? null}
                  gapNumber={item.number}
                  isCorrect={item.isCorrect}
                  transcript={item.transcript}
                  audioUrl={item.audioUrl}
                  aiFeedback={item.aiFeedback}
                />
              </li>
            );
          })}
        </ol>
      )}

      {footer}
    </div>
  );
}
