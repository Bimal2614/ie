"use client";

import { useCallback, useEffect, useState } from "react";
import { Minus, Plus, Type } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Text size, the way the computer-delivered IELTS offers it.
 *
 * The real test puts a text-size control in its settings bar with three steps,
 * and candidates genuinely use it — a 900-word passage at the default size is
 * punishing on a small laptop, and it is the single most common accessibility
 * request in a timed reading paper. Offering it is also fairer: a candidate who
 * spends the first two minutes squinting has lost two minutes.
 *
 * HOW IT SCALES. The step is written as `data-exam-text` on the ROOT element,
 * and one CSS rule changes the root font size (see globals.css). Tailwind's type
 * scale is in `rem`, which resolves against exactly that — so every size, gap
 * and pane width moves together and the layout stays in proportion. Scaling a
 * container instead would have done nothing at all: `text-sm` is 0.875rem
 * wherever it appears, and rem never looks at its parent.
 *
 * WHY THE ROOT AND NOT THE PLAYER. Because the exam covers the whole viewport
 * (`fixed inset-0`), the root IS the exam while it is open. The attribute is
 * removed on unmount, so the setting cannot leak into the rest of the app.
 */

export type TextStep = "standard" | "large" | "xlarge";

const STEPS: TextStep[] = ["standard", "large", "xlarge"];

const LABEL: Record<TextStep, string> = {
  standard: "Standard",
  large: "Large",
  xlarge: "Extra large",
};

/**
 * Remembered across sittings, and across the modules within one.
 *
 * A candidate who needs larger text needs it in Reading as much as in
 * Listening, and re-setting it at every module hand-over — on a clock that does
 * not stop — would be its own small penalty.
 */
const STORAGE_KEY = "ielts:exam-text-size";

function isStep(v: unknown): v is TextStep {
  return typeof v === "string" && (STEPS as string[]).includes(v);
}

function read(): TextStep {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isStep(stored) ? stored : "standard";
  } catch {
    // Private windows and blocked site data throw on access, not just on write.
    return "standard";
  }
}

export function TextSizeControl({ className }: { className?: string }) {
  // Starts at "standard" and corrects itself after mount rather than reading
  // storage during render: the server has no localStorage, and a mismatch here
  // is a hydration error on every exam screen.
  const [step, setStep] = useState<TextStep>("standard");

  useEffect(() => {
    setStep(read());
  }, []);

  // Publish to the root, and take it back down when the exam closes.
  useEffect(() => {
    const root = document.documentElement;
    if (step === "standard") root.removeAttribute("data-exam-text");
    else root.setAttribute("data-exam-text", step);
    return () => root.removeAttribute("data-exam-text");
  }, [step]);

  const move = useCallback((delta: number) => {
    setStep((current) => {
      const next = STEPS[Math.min(STEPS.length - 1, Math.max(0, STEPS.indexOf(current) + delta))];
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Not being able to remember the choice is no reason to refuse to apply it.
      }
      return next;
    });
  }, []);

  const at = STEPS.indexOf(step);

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center rounded-md border border-line bg-paper",
        className,
      )}
      // A group label, so a screen reader announces what the two buttons change
      // rather than reading "minus, plus" with no subject.
      role="group"
      aria-label={`Text size: ${LABEL[step]}`}
    >
      <button
        type="button"
        onClick={() => move(-1)}
        disabled={at === 0}
        aria-label="Decrease text size"
        className="grid h-7 w-7 place-items-center rounded-l-md text-ink-soft transition-colors enabled:hover:text-ink disabled:opacity-35"
      >
        <Minus className="size-3.5" />
      </button>

      {/* The current step, and what the control is for. `aria-hidden` because
          the group label above already announces both. */}
      <span
        aria-hidden
        className="flex items-center gap-1 border-x border-line px-1.5 text-ink-soft"
        title={`Text size: ${LABEL[step]}`}
      >
        <Type className="size-3.5" />
        <span className="hidden text-[10px] font-semibold tabular-nums lg:inline">{at + 1}/3</span>
      </span>

      <button
        type="button"
        onClick={() => move(1)}
        disabled={at === STEPS.length - 1}
        aria-label="Increase text size"
        className="grid h-7 w-7 place-items-center rounded-r-md text-ink-soft transition-colors enabled:hover:text-ink disabled:opacity-35"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
