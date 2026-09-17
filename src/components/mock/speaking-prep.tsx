"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Headphones, Loader2, Lock, Mic, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The pause between the written paper and the interview.
 *
 * A real IELTS never runs Writing into Speaking. The candidate leaves the
 * written room, is met by an examiner, sits down and settles — minutes, not
 * seconds. Online there is no walk down the corridor, so the last thing a
 * candidate does before their first spoken word is put down a pen: the
 * microphone was never checked, the headphones are still on the desk, and Part
 * 1 question 1 is asked into an empty room. That answer is scored.
 *
 * So the hand-over buys the corridor back. One minute, fixed.
 *
 * THERE IS NOTHING TO PRESS, and that is the design, not an omission. A skip
 * button is pressed by everyone who thinks they are ready, which is everyone —
 * including the candidate whose browser has not been asked for the microphone
 * yet. The wait has to be spent to work.
 *
 * THE EXAM CLOCK IS NOT RUNNING HERE. The player holds the module hand-over
 * until this ends, so the Speaking timeline is rebased when the interview
 * actually starts and the candidate is not charged for the minute they were
 * made to sit still. See `advance` in <MockPlayer/>.
 */

/** How long the candidate is held. See the note above on why it is not skippable. */
export const SPEAKING_PREP_SECONDS = 60;

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CHECKS = [
  {
    Icon: Headphones,
    title: "Headphones on",
    detail: "The examiner asks each question once. There is no replay.",
  },
  {
    Icon: Mic,
    title: "Microphone ready",
    detail: "Allow access if your browser asks, and sit an arm's length away.",
  },
  {
    Icon: VolumeX,
    title: "Somewhere quiet",
    detail: "Background noise makes your answers harder to hear and to score.",
  },
] as const;

export function SpeakingPrep({
  seconds = SPEAKING_PREP_SECONDS,
  /** True once the countdown is over and the module is being opened. */
  handingOver,
  onDone,
}: {
  seconds?: number;
  handingOver: boolean;
  onDone: () => void;
}) {
  const [left, setLeft] = useState(seconds);
  const fired = useRef(false);
  // Held in a ref so a re-rendered parent cannot restart the countdown.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  /**
   * Counted against a DEADLINE, not by adding up ticks.
   *
   * A background tab has its intervals throttled, so a minute counted one
   * `setInterval` at a time becomes whatever the browser felt like giving —
   * always longer, never shorter. Polling a fixed instant four times a second
   * means the screen is honest the moment it comes back.
   */
  useEffect(() => {
    const deadline = Date.now() + seconds * 1000;
    const tick = () => {
      const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(s);
      if (s > 0 || fired.current) return;
      fired.current = true;
      window.clearInterval(iv);
      onDoneRef.current();
    };
    const iv = window.setInterval(tick, 250);
    return () => window.clearInterval(iv);
  }, [seconds]);

  /**
   * Full ring at the start, draining to empty at zero — then full again while
   * the module opens, so the hand-over reads as "done, fetching" rather than as
   * a ring that emptied and stopped.
   */
  const offset = handingOver ? 0 : CIRCUMFERENCE * (1 - left / seconds);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="speaking-prep-title"
      className="fixed inset-0 z-[70] overflow-y-auto bg-paper"
    >
      {/* A wash of the Speaking accent, so the change of room is felt before it
          is read. Behind everything and ignored by assistive tech. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(60%_60%_at_50%_0%,hsl(var(--section-speaking)/0.10),transparent_70%)]"
      />

      <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col items-center justify-center gap-6 px-6 py-8 sm:gap-7 sm:py-10">
        <span className="chip chip-success">
          <Check className="size-3.5" /> Writing handed in
        </span>

        {/* ---- the clock ---- */}
        <div
          className="relative grid size-40 shrink-0 place-items-center"
          role="timer"
          aria-label={`Speaking starts in ${left} seconds`}
        >
          <svg viewBox="0 0 160 160" className="absolute inset-0 size-full -rotate-90">
            <circle
              cx="80"
              cy="80"
              r={RADIUS}
              fill="none"
              strokeWidth="6"
              className="stroke-line"
            />
            <circle
              cx="80"
              cy="80"
              r={RADIUS}
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              className="stroke-section-speaking transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          {handingOver ? (
            <Loader2 className="size-8 animate-spin text-section-speaking" />
          ) : (
            <span className="flex flex-col items-center leading-none">
              <span
                className="text-5xl font-bold tabular-nums text-ink"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {left}
              </span>
              <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                {left === 1 ? "second" : "seconds"}
              </span>
            </span>
          )}
        </div>

        {/* ---- what is happening ---- */}
        <div className="text-center">
          <h1
            id="speaking-prep-title"
            className="text-xl font-bold text-ink sm:text-2xl"
          >
            {handingOver ? "Opening your interview…" : "Speaking starts automatically"}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
            {handingOver
              ? "Stay on this page. Part 1 is loading."
              : "Use this minute to get set up. Your examiner asks the first question as soon as the timer ends."}
          </p>
        </div>

        {/* ---- the three things worth checking ---- */}
        <ul className="w-full space-y-2">
          {CHECKS.map(({ Icon, title, detail }) => (
            <li
              key={title}
              className={cn(
                "flex items-start gap-3 rounded-xl border border-line bg-paper-elev px-4 py-3",
                "shadow-[var(--shadow-xs)] transition-opacity",
                handingOver && "opacity-50",
              )}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-section-speaking-soft text-section-speaking">
                <Icon className="size-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                  {detail}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <p className="inline-flex items-start gap-2 text-center text-xs leading-relaxed text-ink-muted">
          <Lock className="mt-px size-3.5 shrink-0" />
          <span>
            Nothing to press, and nothing to skip. Speaking only moves forward — once a question
            has been asked you cannot go back to it.
          </span>
        </p>
      </div>
    </div>
  );
}
