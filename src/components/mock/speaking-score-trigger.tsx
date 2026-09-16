"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { mockScoringStatus } from "@/app/actions/mock";

/**
 * Waits for a finished sitting's Writing and Speaking bands, then refreshes the
 * report.
 *
 * IT WATCHES; IT DOES NOT START THE WORK, AND IT NEVER ASKS THE CANDIDATE TO.
 * That distinction is the whole point of this file. It used to call both scorers
 * the moment it mounted, which was the only thing that ever scored a mock — and
 * when `finishMock` started scheduling the same work with `after()`, the two
 * began racing. The redirect lands here within a second of hand-in, so the page
 * fired the scorers while the background run was mid-batch; both read the same
 * `band IS NULL` rows and both paid a provider for every answer. On a full
 * sitting that is 26 calls where 13 were needed.
 *
 * So the bands have exactly two sources, both server-side and neither involving
 * this component: `after()` at hand-in, and the sweeper cron behind it
 * (/api/cron/scoring) for whatever that could not finish. The sweeper runs every
 * five minutes and keeps picking a sitting up for three hours, so an answer that
 * misses the fast path is retried without anyone deciding to retry it.
 *
 * WHICH IS WHY THERE IS NO BUTTON. This used to end in "Try scoring again",
 * inherited from the days before the cron existed, when a candidate noticing was
 * genuinely the only recovery. Now it duplicates work that is already queued and
 * coming — and it asks a candidate who has just sat a three-hour paper to
 * administer their own marking. All that is left to do is say so, and wait.
 */

/**
 * Tight at first, then patient, and it outlasts the sweeper rather than the
 * fast path.
 *
 * The early polls are for the normal case, where `after()` is already running
 * and a Writing band lands in a few seconds. The long tail is for the one that
 * did not: the sweeper leaves a sitting alone for six minutes before touching
 * it and then only runs on the next five-minute tick, so a band can legitimately
 * be eleven minutes away before the work even starts. A schedule that stopped
 * watching at seven would go quiet exactly when the thing that rescues it was
 * getting going. This runs a little past twenty minutes.
 */
const POLL_SCHEDULE_MS = [
  1500, 2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 15000, 20000, 20000,
  30000, 30000, 30000, 60000, 60000, 60000, 60000, 60000, 60000, 60000, 60000, 60000, 60000,
  60000, 60000, 60000, 60000, 60000, 60000,
];

export function SpeakingScoreTrigger({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [waiting, setWaiting] = useState(true);
  /** The watch ran out before the bands landed. The scoring has not. */
  const [stillOut, setStillOut] = useState(false);

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
        setStillOut(true);
        return;
      }
      timer = setTimeout(() => void run(step + 1), POLL_SCHEDULE_MS[step]);
    };

    void run(0);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, router]);

  // Nothing left to say once the bands are in.
  if (!waiting && !stillOut) return null;

  if (stillOut) {
    return (
      <p className="flex flex-wrap items-center gap-2 rounded-lg bg-info-soft px-3 py-2 text-xs text-ink-soft">
        <Sparkles className="size-3.5" />
        <span>
          Some answers are still being marked. Your work is saved and scoring retries on its own —
          open this report again shortly and the bands will be here.
        </span>
      </p>
    );
  }

  return (
    <p className="flex items-center gap-2 rounded-lg bg-info-soft px-3 py-2 text-xs text-ink-soft">
      <Loader2 className="size-3.5 animate-spin" />
      <span>Marking your Writing and Speaking answers — this page updates itself.</span>
    </p>
  );
}
