"use client";

import { useCallback, useId, useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OptionsLayout } from "@/lib/question-content";
import type { QuestionState } from "./question-input";
import { AnnotatedText } from "./annotations";

/**
 * Matching questions, the way the computer-delivered IELTS test presents them:
 * the numbered stems on the left, a bank of lettered options on the right, and
 * you DRAG an option into a blank.
 *
 * This replaces a per-row `<select>`. A dropdown is wrong twice over — it isn't
 * what the real test looks like, and it hides the option list behind a click so
 * a candidate can't scan all eight options while weighing a stem.
 *
 * Three ways to answer, because drag alone excludes people:
 *   • drag an option onto a blank (mouse)
 *   • tap an option, then tap a blank (touch — dragging on a phone is painful)
 *   • focus an option, Enter to pick it up, Tab to a blank, Enter to drop
 *
 * Options are NEVER consumed. Cambridge reuses letters — in C21 Test 1 Part 2
 * the answer to both 17 and 20 is C — so removing a used option from the bank
 * would make a correct paper impossible to complete.
 */

export type MatchingItem = {
  /**
   * Key this item's answer is stored under. Section content keys by exam
   * number; the older question_sets path keys by question uuid — the board
   * only needs it to be stable and unique, so it takes whatever the caller uses.
   */
  id: string;
  /** Number shown on the blank. */
  n: number;
  prompt?: string;
  /** Makes the stem highlightable, under this run id. See annotations.tsx. */
  run?: string;
  /**
   * Plays just the stretch of the recording where this item is answered. Set
   * only for listening; the board is also used for reading, where there is no
   * audio to seek.
   */
  onPlayClip?: () => void;
};

export type MatchingBinding = {
  /** Letter currently assigned to this number, if any. */
  key: string | undefined;
  state: QuestionState;
  /** Letter the key says is right — shown only after grading, when wrong. */
  expected?: string;
};

export function MatchingBoard({
  layout,
  items,
  bindingFor,
  disabled,
  onAssign,
  onClear,
}: {
  layout: OptionsLayout;
  items: MatchingItem[];
  bindingFor: (id: string) => MatchingBinding;
  disabled: boolean;
  onAssign: (id: string, key: string) => void;
  /**
   * Omit where the caller cannot delete an answer. The older question_sets
   * player only has "set this answer", so clearing there would write an empty
   * response — which grades as WRONG rather than as unattempted. Without this
   * callback the blank simply has no clear affordance; dropping another letter
   * still replaces it.
   */
  onClear?: (id: string) => void;
}) {
  /** The option "in hand" — set by tap or by keyboard pick-up. */
  const [held, setHeld] = useState<string | null>(null);
  /** Blank currently under a drag, for the drop highlight. */
  const [over, setOver] = useState<number | null>(null);
  const bankId = useId();

  const assign = useCallback(
    (id: string, key: string) => {
      onAssign(id, key);
      setHeld(null);
      setOver(null);
    },
    [onAssign],
  );

  /** Which numbers an option is currently sitting in, for the bank's badges. */
  const usedBy = (key: string) =>
    items.filter((i) => bindingFor(i.id).key === key).map((i) => i.n);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      {/* ── Left: the numbered stems, each with a blank ── */}
      <ul className="space-y-2.5">
        {items.map((item) => {
          const b = bindingFor(item.id);
          const filled = Boolean(b.key);
          const isOver = over === item.n;
          const canDrop = !disabled;

          return (
            <li key={item.n} id={`sq-${item.n}`} className="flex items-center gap-3 scroll-mt-28">
              <span className="min-w-0 flex-1 text-sm text-ink-soft">
                <AnnotatedText run={item.run} text={item.prompt ?? ""} />
              </span>
              {item.onPlayClip && (
                <button
                  type="button"
                  onClick={item.onPlayClip}
                  title="Play the part of the recording that answers this"
                  aria-label={`Play the recording for question ${item.n}`}
                  className="grid size-6 shrink-0 place-items-center rounded text-ink-muted transition-colors hover:bg-brand-soft hover:text-brand"
                >
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden>
                    <path d="M8 2.5v11a.5.5 0 0 1-.83.37L3.9 11H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.9l3.27-2.87A.5.5 0 0 1 8 2.5Zm3.3 1.8a.75.75 0 0 1 1.02.28A6.5 6.5 0 0 1 13 8c0 1.23-.34 2.4-.94 3.42a.75.75 0 1 1-1.3-.76A5 5 0 0 0 11.5 8c0-.96-.27-1.86-.74-2.62a.75.75 0 0 1 .28-1.02Z" />
                  </svg>
                </button>
              )}

              <button
                type="button"
                disabled={disabled}
                aria-label={
                  filled
                    ? `Question ${item.n}, answer ${b.key}.${onClear ? " Activate to clear." : ""}`
                    : `Question ${item.n}, empty. Activate to drop the selected option.`
                }
                onClick={() => {
                  if (disabled) return;
                  if (held) assign(item.id, held);
                  else if (filled) onClear?.(item.id);
                }}
                onDragOver={(e) => {
                  if (!canDrop) return;
                  e.preventDefault();
                  setOver(item.n);
                }}
                onDragLeave={() => setOver((c) => (c === item.n ? null : c))}
                onDrop={(e) => {
                  if (!canDrop) return;
                  e.preventDefault();
                  const key = e.dataTransfer.getData("text/plain");
                  if (key) assign(item.id, key);
                }}
                className={cn(
                  "flex h-11 w-44 shrink-0 items-center gap-2 rounded-lg border-2 px-2 text-left transition-colors",
                  !filled && "border-dashed",
                  b.state === "idle" &&
                    (isOver
                      ? "border-brand bg-brand-soft"
                      : held && !disabled
                        ? "border-brand/60 bg-brand-soft/40"
                        : "border-line bg-paper-elev"),
                  b.state === "correct" && "border-success/60 bg-success-soft",
                  b.state === "incorrect" && "border-danger/60 bg-danger-soft",
                  b.state === "review" && "border-line bg-paper-elev",
                  disabled && "cursor-default",
                )}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded bg-paper-sunken font-mono text-[11px] font-semibold tabular-nums text-ink-strong">
                  {item.n}
                </span>

                {filled ? (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="grid size-6 shrink-0 place-items-center rounded bg-brand font-mono text-[11px] font-semibold text-white">
                      {b.key}
                    </span>
                    {b.state === "correct" && <Check className="size-4 shrink-0 text-success" />}
                    {b.state === "incorrect" && (
                      <>
                        <X className="size-4 shrink-0 text-danger" />
                        {b.expected && (
                          <span className="truncate text-xs text-success">→ {b.expected}</span>
                        )}
                      </>
                    )}
                  </span>
                ) : b.state === "incorrect" && b.expected ? (
                  <span className="truncate text-xs text-success">answer {b.expected}</span>
                ) : (
                  <span className="truncate text-xs italic text-ink-muted">
                    {held ? "Tap to place here" : "Drop answer here"}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* ── Right: the option bank ── */}
      <div className="rounded-xl border border-line bg-paper-sunken/40 p-3">
        <p className="mb-2 px-1 text-xs italic text-ink-muted" id={bankId}>
          {disabled
            ? layout.title
            : held
              ? `Option ${held} picked up: choose a blank, or press Escape to cancel.`
              : "Drag and drop an option to fill in each blank."}
        </p>

        <ul className="space-y-2" aria-describedby={bankId}>
          {layout.options.map((o) => {
            const used = usedBy(o.key);
            const isHeld = held === o.key;

            return (
              <li key={o.key}>
                <button
                  type="button"
                  disabled={disabled}
                  draggable={!disabled}
                  aria-pressed={isHeld}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", o.key);
                    e.dataTransfer.effectAllowed = "copy";
                    setHeld(o.key);
                  }}
                  onDragEnd={() => setOver(null)}
                  onClick={() => !disabled && setHeld(isHeld ? null : o.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setHeld(null);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    isHeld
                      ? "border-brand bg-brand-soft ring-2 ring-brand/30"
                      : "border-line bg-paper-elev hover:border-brand/50 hover:bg-paper-sunken",
                    !disabled && "cursor-grab active:cursor-grabbing",
                    disabled && "cursor-default opacity-90",
                  )}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded bg-paper-sunken font-mono text-[11px] font-semibold text-ink-strong">
                    {o.key}
                  </span>
                  <span className="min-w-0 flex-1 font-medium text-ink-strong">{o.text}</span>
                  {/* Letters repeat in Cambridge, so show WHERE an option is
                      used rather than striking it out as spent. */}
                  {used.length > 0 && (
                    <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-brand">
                      {used.join(", ")}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
