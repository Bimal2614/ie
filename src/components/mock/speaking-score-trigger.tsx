"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { mockScoringStatus, scoreMockSpeaking, scoreMockWriting } from "@/app/actions/mock";

/**
 * Waits for a finished sitting's Writing and Speaking bands, then refreshes the
 * report.
 *
 * IT WATCHES; IT DOES NOT START THE WORK. That distinction is the whole point of
 * this file. It used to call both scorers the moment it mounted, which was the
 * only thing that ever scored a mock — and when `finishMock` started scheduling
 * the same work with `after()`, the two began racing. The redirect lands here
 * within a second of hand-in, so the page fired the scorers while the background
 * run was mid-batch; both read the same `band IS NULL` rows and both paid a
 * provider for every answer. On a full sitting that is 26 calls where 13 were
 * needed. Idempotency does not prevent it: the scorers claim nothing when they
 * read, so two runs racing simply both see "unscored".
 *
 * So the bands now have exactly two sources, both server-side and neither
 * involving this component: `after()` at hand-in, and the sweeper cron behind it
 * (/api/cron/scoring) for whatever that could not finish. This polls until they
 * land, and offers a button if they never do — the same shape the practice
 * report has always had.
 */

/**
 * Tight at first, then patient.
 *
 * The early polls are for the normal case, where `after()` is already running
 * and a Writing band lands in a few seconds. The long tail is for the one that
 * did not: the sweeper leaves an attempt alone for three minutes before touching
 * it, so a schedule that gave up before then would tell a candidate their paper
 * could not be scored while the thing that scores it had not yet looked. This
 * runs a little past six minutes.
 */
const POLL_SCHEDULE_MS = [
  1500, 2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 15000, 20000, 20000,
  30000, 30000, 30000, 60000, 60000, 60000,
];

export function SpeakingScoreTrigger({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [waiting, setWaiting] = useState(true);
  const [gaveUp, setGaveUp] = useState(false);
  const [retrying, setRetrying] = useState(false);
  /**
   * Bumped by a retry to restart the poll.
   *
   * Without it the effect below never runs again: its schedule has already
   * finished, and flipping `waiting` back on is a render, not a new effect. The
   * spinner would then sit there for a band nothing was watching for.
   */
  const [round, setRound] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const run = async (step: number) => {
      if (!alive) return;

      let pending: number | null = null;
      try {
        pending = (await mockScoringStatus(sessionId)).pending;
      } catch {
        // Transient — the next tick asks again rather than giving up here.
      }
      if (!alive) return;

      if (pending === 0) {
        setWaiting(false);
        // Only re-render the report once there is actually something new on it.
        router.refresh();
        return;
      }

      if (step >= POLL_SCHEDULE_MS.length - 1) {
        setWaiting(false);
        setGaveUp(true);
        return;
      }
      timer = setTimeout(() => void run(step + 1), POLL_SCHEDULE_MS[step]);
    };

    void run(0);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, router, round]);

  /**
   * The ask-again path, behind a deliberate press.
   *
   * A button is what keeps this safe to exist at all: it cannot race the
   * background run, because by the time anyone can press it that run is long
   * over, and it costs a provider call only when a person decides an answer has
   * been waiting too long.
   */
  const retry = useCallback(async () => {
    setRetrying(true);
    try {
      await Promise.allSettled([scoreMockWriting(sessionId), scoreMockSpeaking(sessionId)]);
      router.refresh();
    } finally {
      setRetrying(false);
      setGaveUp(false);
      setWaiting(true);
      // Restarts the poll, so a band that lands a moment after the press still
      // reaches the page on its own.
      setRound((n) => n + 1);
    }
  }, [sessionId, router]);

  // Nothing left to say once the bands are in.
  if (!waiting && !gaveUp) return null;

  if (gaveUp) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-info-soft px-3 py-2 text-xs text-ink-soft">
        <Sparkles className="size-3.5" />
        <span>Some answers haven&apos;t been scored yet. Your work is saved.</span>
        <button
          type="button"
          onClick={() => void retry()}
          disabled={retrying}
          className="font-semibold underline underline-offset-2 disabled:opacity-60"
        >
          {retrying ? "Scoring…" : "Try scoring again"}
        </button>
      </div>
    );
  }

  return (
    <p className="flex items-center gap-2 rounded-lg bg-info-soft px-3 py-2 text-xs text-ink-soft">
      <Loader2 className="size-3.5 animate-spin" />
      Marking your Writing and Speaking answers. This takes a few seconds each — the report updates
      on its own.
    </p>
  );
}
