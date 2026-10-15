"use client";

import { useEffect, useState } from "react";
import { Clock, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

function mmss(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * A count-up clock for question practice.
 *
 * Practice is untimed, but a candidate who only sits a mock once in a while
 * still needs to know how long a passage or an essay takes them — that is the
 * number that tells them whether they will finish on the day. So it counts up
 * rather than down, it stops on submit (what is left on it is "time taken"),
 * and it can be paused for a teacher stopping to explain something.
 *
 * `target` is the exam's own budget where there is one (Writing Task 1 is 20
 * minutes, Task 2 is 40). Past it the clock changes colour; nothing is cut off.
 */
export function PracticeClock({
  resetKey,
  stopped,
  target,
  className,
}: {
  /** Changes when a new set opens or the set restarts — the clock goes to 0:00. */
  resetKey: string;
  /** The set is submitted: freeze on the time taken. */
  stopped: boolean;
  target?: number;
  className?: string;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);

  // Reset during render rather than in an effect, so the old set's time never
  // shows for a frame on the new one.
  const [lastKey, setLastKey] = useState(resetKey);
  if (lastKey !== resetKey) {
    setLastKey(resetKey);
    setElapsed(0);
    setPaused(false);
  }

  const running = !stopped && !paused;
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, [running, resetKey]);

  const over = target !== undefined && elapsed > target;

  return (
    <button
      type="button"
      onClick={() => setPaused((p) => !p)}
      disabled={stopped}
      title={
        stopped
          ? `Time taken: ${mmss(elapsed)}`
          : paused
            ? "Paused. Click to resume"
            : `Time on this ${target ? "task" : "set"}${target ? ` (suggested ${target / 60} min)` : ""}. Click to pause`
      }
      aria-label={stopped ? `Time taken ${mmss(elapsed)}` : paused ? "Resume timer" : "Pause timer"}
      className={cn(
        "exam-timer inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-paper px-2 py-1 text-sm transition-colors enabled:hover:border-brand/50",
        paused && "opacity-60",
        className,
      )}
      data-state={over ? "warning" : "ok"}
    >
      {stopped ? (
        <Clock className="size-3.5" />
      ) : paused ? (
        <Play className="size-3.5" />
      ) : (
        <Pause className="size-3.5" />
      )}
      {stopped && <span className="hidden font-sans text-xs font-semibold text-ink-muted sm:inline">Took</span>}
      <span>{mmss(elapsed)}</span>
      {target !== undefined && !stopped && (
        <span className="hidden text-xs text-ink-muted sm:inline">/ {mmss(target)}</span>
      )}
    </button>
  );
}
