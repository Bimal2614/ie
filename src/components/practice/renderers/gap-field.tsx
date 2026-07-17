"use client";

import { cn } from "@/lib/utils";
import { parseGaps, isGap } from "@/lib/question-content";

/**
 * A gap is a question. The layout renderers below don't know about question
 * ids — they ask the resolver for the binding behind an exam number and render
 * whatever comes back, so one summary/table can span many questions.
 */
export type GapBinding = {
  questionId: string;
  number: number;
  value: string;
  disabled: boolean;
  state: "idle" | "correct" | "incorrect" | "review";
  /** Shown under the gap once graded and wrong. */
  expected?: string;
  onChange: (text: string) => void;
};

export type GapResolver = (number: number) => GapBinding | null;

const WIDTH = {
  sm: "w-20",
  md: "w-32",
  lg: "w-44",
} as const;

/**
 * One numbered blank, sitting inline in the sentence the way the real paper
 * prints it — not a detached "Answer 1" box below the prompt.
 */
export function GapField({
  binding,
  width = "md",
}: {
  binding: GapBinding | null;
  width?: keyof typeof WIDTH;
}) {
  // A gap with no question behind it means the layout and the question rows
  // disagree; show the marker rather than silently swallowing it.
  if (!binding) {
    return (
      <span className="mx-0.5 rounded border border-dashed border-danger/50 px-1.5 text-xs text-danger">
        unbound gap
      </span>
    );
  }

  const { number, value, disabled, state, expected, onChange } = binding;

  return (
    <span className="mx-1 inline-flex flex-col align-middle">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border bg-paper-elev px-1.5 py-1 transition-colors",
          "focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20",
          state === "idle" && "border-line",
          state === "correct" && "border-success/50 bg-success-soft",
          state === "incorrect" && "border-danger/50 bg-danger-soft",
          state === "review" && "border-info/50 bg-info-soft",
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
          aria-hidden
        >
          {number}
        </span>
        <input
          type="text"
          aria-label={`Question ${number}`}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted/60 disabled:cursor-default",
            WIDTH[width],
          )}
        />
      </span>
      {state === "incorrect" && expected && (
        <span className="mt-0.5 pl-1 text-[11px] text-success">{expected}</span>
      )}
    </span>
  );
}

/**
 * Renders a text block, turning `[[14]]` markers into live gaps and leaving the
 * surrounding prose intact.
 */
export function GapText({
  text,
  resolve,
  width = "md",
  className,
}: {
  text: string;
  resolve: GapResolver;
  width?: keyof typeof WIDTH;
  className?: string;
}) {
  const segments = parseGaps(text);
  return (
    <span className={cn("leading-loose", className)}>
      {segments.map((seg, i) =>
        isGap(seg) ? (
          <GapField key={i} binding={resolve(seg.gap)} width={width} />
        ) : (
          <span key={i}>{seg}</span>
        ),
      )}
    </span>
  );
}
