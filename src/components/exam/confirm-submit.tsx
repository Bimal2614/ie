"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Flag, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The check before a paper is handed in.
 *
 * The real test does this for one reason: submitting is irreversible and there
 * is no unanswered-question penalty, so a blank left by accident is a mark
 * thrown away for nothing. A candidate who has flagged three questions to come
 * back to, and then reaches for Submit out of habit with four minutes still on
 * the clock, should be told before it is too late rather than after.
 *
 * It is NOT shown when the clock runs out. The bell is not a decision the
 * candidate is making, and a dialog nobody is there to dismiss would just sit on
 * screen while the auto-submit happened behind it.
 */
export function ConfirmSubmit({
  open,
  title,
  detail,
  unanswered,
  flagged,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  /** What handing in actually costs here — the module, or the whole paper. */
  detail: string;
  unanswered: number;
  flagged: number;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // Focus lands on CANCEL, not confirm: the dangerous action should never be
    // one stray Enter away, and the whole point of this dialog is second thoughts.
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const clean = unanswered === 0;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-submit-title"
        className="w-full max-w-sm overflow-hidden rounded-xl border border-line bg-paper-elev shadow-[var(--shadow-md)]"
      >
        <div className="flex items-start gap-3 p-5">
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-lg",
              clean ? "chip-accent" : "bg-warning-soft text-warning",
            )}
          >
            <AlertTriangle className="size-4.5" />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-submit-title" className="text-sm font-semibold text-ink">
              {title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{detail}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="ml-auto grid size-7 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-paper-sunken hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* The two numbers worth interrupting someone for. */}
        <div className="flex gap-2 border-t border-line bg-paper-sunken/50 px-5 py-3 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-semibold",
              clean ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
            )}
          >
            {clean ? "All questions answered" : `${unanswered} unanswered`}
          </span>
          {flagged > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-warning-soft px-2 py-1 font-semibold text-warning">
              <Flag className="size-3" /> {flagged} flagged
            </span>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line p-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand/50 hover:text-ink"
          >
            Keep working
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-success px-3.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
