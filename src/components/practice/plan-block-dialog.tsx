"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Lock, X, ArrowRight } from "lucide-react";
import type { PlanBlock } from "@/lib/plans";

/**
 * What a candidate is told when their plan will not evaluate the work they just
 * submitted.
 *
 * THE ANSWER IS NOT LOST. Nothing is graded, nothing is written, and every
 * answer stays exactly where it was — closing this dialog puts them back in
 * front of their own work. That is the whole reason the block happens here
 * rather than at the door: practising a Task 2 essay is worth doing on any
 * plan, and only the AI examiner's band is behind the paywall.
 *
 * Deliberately not styled as an error. A plan limit is a normal state of the
 * product; red would tell someone their work broke when it did not.
 */
export function PlanBlockDialog({
  block,
  onClose,
}: {
  block: PlanBlock | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!block) return;
    // Focus lands on the way BACK to the paper, not on the purchase button: the
    // candidate interrupted mid-practice did not ask to be sent shopping.
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [block, onClose]);

  if (!block) return null;

  const title =
    block.code === "quota_exhausted"
      ? "That's your free questions for this month"
      : "This answer needs a paid plan to evaluate";

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-block-title"
        className="w-full max-w-sm overflow-hidden rounded-xl border border-line bg-paper-elev shadow-[var(--shadow-md)]"
      >
        <div className="flex items-start gap-3 p-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
            <Lock className="size-4.5" />
          </span>
          <div className="min-w-0">
            <h2 id="plan-block-title" className="text-sm font-semibold text-ink">
              {title}
            </h2>
            {/* The server wrote this: it knows the tier, the allowance and the
                reset date, so the wording is not duplicated here. */}
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{block.message}</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Your answers are still here — nothing has been lost.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto grid size-7 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-paper-sunken hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        {block.limit !== undefined && (
          <div className="border-t border-line bg-paper-sunken/50 px-5 py-3 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-soft px-2 py-1 font-semibold text-brand">
              {block.used} of {block.limit} used this month
            </span>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-line p-3">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand/50 hover:text-ink"
          >
            Keep practising
          </button>
          <Link
            href={block.upgradeHref}
            className="inline-flex items-center gap-1.5 rounded-md bg-green px-3.5 py-1.5 text-xs font-semibold text-green-ink transition-[filter] hover:brightness-105"
          >
            Purchase a plan <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
