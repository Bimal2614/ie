"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GapBinding } from "./gap-field";

/**
 * Answering a layout from a shared box, by dragging.
 *
 * "Complete the flow-chart. Choose FOUR answers from the box" is a placement
 * task, not a typing task: the computer-delivered test shows the box beside the
 * chart and you drag a phrase into a blank. A dropdown was wrong twice over — it
 * isn't what the real test looks like, and it hides the options behind a click
 * so a candidate can't scan them all while weighing a step.
 *
 * WHY THIS IS A CONTEXT RATHER THAN A BOARD COMPONENT. <MatchingBoard/> owns its
 * whole two-column layout, which works because a matching question IS stems and
 * a bank. Here the blanks are buried INSIDE the flow-chart's boxes, wherever the
 * `[[n]]` marker happens to sit, so the drop targets cannot be lifted out into a
 * column. The provider carries the "held" option down to whatever draws the gap.
 *
 * Three ways to answer, because drag alone excludes people:
 *   • drag an option onto a blank (mouse)
 *   • tap an option, then tap a blank (touch — dragging on a phone is painful)
 *   • focus an option, Enter to pick it up, Tab to a blank, Enter to drop
 *
 * Options are NEVER consumed. Cambridge reuses letters, so removing a used one
 * from the box could make a correct paper impossible to finish.
 */

export type Choice = { key: string; text: string };

type BankState = {
  choices: Choice[];
  /** The option "in hand" — set by tap or keyboard pick-up. */
  held: string | null;
  setHeld: (key: string | null) => void;
  /** Gap number currently under a drag, for the drop highlight. */
  over: number | null;
  setOver: (n: number | null) => void;
  disabled: boolean;
  /** Which gap numbers each option currently sits in. */
  usedBy: (key: string) => number[];
  /** Registered so the bank can show where each option has been placed. */
  register: (n: number, key: string | undefined) => void;
};

const BankContext = createContext<BankState | null>(null);

export function useChoiceBank(): BankState | null {
  return useContext(BankContext);
}

export function ChoiceBankProvider({
  choices,
  disabled,
  children,
}: {
  choices: Choice[];
  disabled: boolean;
  children: React.ReactNode;
}) {
  const [held, setHeld] = useState<string | null>(null);
  const [over, setOver] = useState<number | null>(null);
  // Filled gaps, so the box can badge an option with where it has been used.
  const [placed, setPlaced] = useState<Record<number, string>>({});

  const register = useCallback((n: number, key: string | undefined) => {
    setPlaced((prev) => {
      if (key === undefined) {
        if (!(n in prev)) return prev;
        const next = { ...prev };
        delete next[n];
        return next;
      }
      if (prev[n] === key) return prev;
      return { ...prev, [n]: key };
    });
  }, []);

  const usedBy = useCallback(
    (key: string) =>
      Object.entries(placed)
        .filter(([, v]) => v === key)
        .map(([n]) => Number(n))
        .sort((a, b) => a - b),
    [placed],
  );

  const value = useMemo(
    () => ({ choices, held, setHeld, over, setOver, disabled, usedBy, register }),
    [choices, held, over, disabled, usedBy, register],
  );

  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
}

/* ------------------------------------------------------------------ *
 * The blank, inline wherever the layout puts it
 * ------------------------------------------------------------------ */

export function ChoiceSlot({ binding }: { binding: GapBinding | null }) {
  const bank = useChoiceBank();
  const register = bank?.register;
  const number = binding?.number;
  // A gap stores its answer as text, so the letter placed in it IS the value —
  // nothing about the answer shape or the grader had to change for this.
  const assigned = binding?.value || undefined;

  // Told to the box in an effect, not during render: reporting upward while
  // rendering is what makes React complain about setting state in a render pass.
  useEffect(() => {
    if (register && number !== undefined) register(number, assigned);
  }, [register, number, assigned]);

  if (!binding || !bank) return null;

  const { state, expected } = binding;
  const n = binding.number;
  const choice = bank.choices.find((c) => c.key === assigned);
  const isOver = bank.over === n;
  const canDrop = !bank.disabled;
  // A word-list box (key === text) would otherwise print the same word twice.
  const lettered = choice ? choice.key !== choice.text : true;

  const place = (key: string) => {
    binding.onChange(key);
    bank.setHeld(null);
    bank.setOver(null);
  };

  return (
    <button
      type="button"
      id={`mq-${n}`}
      data-qnum={n}
      disabled={bank.disabled}
      aria-label={
        assigned
          ? `Question ${n}, answer ${assigned}. Activate to clear.`
          : `Question ${n}, empty. Activate to drop the selected option.`
      }
      onClick={() => {
        if (bank.disabled) return;
        if (bank.held) place(bank.held);
        // Clearing writes an empty answer, exactly as deleting the text from a
        // typed gap does — same behaviour, not a new hazard.
        else if (assigned) place("");
      }}
      onDragOver={(e) => {
        if (!canDrop) return;
        e.preventDefault();
        bank.setOver(n);
      }}
      onDragLeave={() => bank.setOver(bank.over === n ? null : bank.over)}
      onDrop={(e) => {
        if (!canDrop) return;
        e.preventDefault();
        const key = e.dataTransfer.getData("text/plain");
        if (key) place(key);
      }}
      className={cn(
        "mx-1 inline-flex min-h-9 min-w-28 max-w-full scroll-mt-28 items-center gap-1.5 rounded-md border-2 px-2 py-1 align-middle text-left transition-colors",
        !assigned && "border-dashed",
        state === "idle" &&
          (isOver
            ? "border-brand bg-brand-soft"
            : bank.held && !bank.disabled
              ? "border-brand/60 bg-brand-soft/40"
              : "border-line bg-paper"),
        state === "correct" && "border-success/60 bg-success-soft",
        state === "incorrect" && "border-danger/60 bg-danger-soft",
        state === "review" && "border-line bg-paper",
        bank.disabled && "cursor-default",
      )}
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded font-mono text-[10px] font-semibold tabular-nums",
          state === "idle" && "bg-brand-soft text-brand",
          state === "correct" && "bg-success text-white",
          state === "incorrect" && "bg-danger text-white",
          state === "review" && "bg-info text-white",
        )}
      >
        {n}
      </span>

      {choice ? (
        <span className="flex min-w-0 items-center gap-1.5">
          {lettered && (
            <span className="grid size-5 shrink-0 place-items-center rounded bg-brand font-mono text-[10px] font-semibold text-white">
              {choice.key}
            </span>
          )}
          <span className="min-w-0 text-xs text-ink-strong">{choice.text}</span>
          {state === "correct" && <Check className="size-3.5 shrink-0 text-success" />}
          {state === "incorrect" && (
            <>
              <X className="size-3.5 shrink-0 text-danger" />
              {expected && <span className="shrink-0 text-xs text-success">-&gt; {expected}</span>}
            </>
          )}
        </span>
      ) : state === "incorrect" && expected ? (
        <span className="text-xs text-success">answer {expected}</span>
      ) : (
        <span className="text-xs italic text-ink-muted">
          {bank.held ? "Tap to place" : "Drop here"}
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * The box of options
 * ------------------------------------------------------------------ */

export function ChoiceBank({ title }: { title?: string }) {
  const bank = useChoiceBank();
  const bankId = useId();
  if (!bank) return null;

  return (
    <div className="rounded-xl border border-line bg-paper-sunken/40 p-3">
      <p className="mb-2 px-1 text-xs italic text-ink-muted" id={bankId}>
        {bank.disabled
          ? (title ?? "Options")
          : bank.held
            ? `Option ${bank.held} picked up — choose a blank, or press Escape to cancel.`
            : "Drag and drop an option to fill in each blank."}
      </p>

      <ul className="space-y-2" aria-describedby={bankId}>
        {bank.choices.map((o) => {
          const used = bank.usedBy(o.key);
          const isHeld = bank.held === o.key;
          const lettered = o.key !== o.text;

          return (
            <li key={o.key}>
              <button
                type="button"
                disabled={bank.disabled}
                draggable={!bank.disabled}
                aria-pressed={isHeld}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", o.key);
                  e.dataTransfer.effectAllowed = "copy";
                  bank.setHeld(o.key);
                }}
                onDragEnd={() => bank.setOver(null)}
                onClick={() => !bank.disabled && bank.setHeld(isHeld ? null : o.key)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") bank.setHeld(null);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  isHeld
                    ? "border-brand bg-brand-soft ring-2 ring-brand/30"
                    : "border-line bg-paper-elev hover:border-brand/50 hover:bg-paper-sunken",
                  !bank.disabled && "cursor-grab active:cursor-grabbing",
                  bank.disabled && "cursor-default opacity-90",
                )}
              >
                {lettered && (
                  <span className="grid size-6 shrink-0 place-items-center rounded bg-paper-sunken font-mono text-[11px] font-semibold text-ink-strong">
                    {o.key}
                  </span>
                )}
                <span className="min-w-0 flex-1 font-medium text-ink-strong">{o.text}</span>
                {/* Letters repeat in Cambridge, so show WHERE an option is used
                    rather than striking it out as spent. */}
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
  );
}
