"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { parseGaps, isGap } from "@/lib/question-content";
import { AnnotatedText } from "./annotations";

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
  /**
   * Plays just the stretch of the recording where this gap is answered. Set
   * only for listening, where hunting one blank through six minutes of audio is
   * not practice.
   */
  playClip?: () => void;
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

  const { number, value, disabled, state, expected, onChange, playClip } = binding;

  return (
    // Anchor + focus scroll target so the mock's question palette can jump to
    // this exact gap. `scroll-mt` keeps it clear of the sticky exam header.
    <span id={`mq-${number}`} data-qnum={number} className="mx-1 inline-flex scroll-mt-28 flex-col align-middle">
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
        {playClip && (
          <button
            type="button"
            onClick={playClip}
            title="Play the part of the recording that answers this"
            aria-label={`Play the recording for question ${number}`}
            className="grid size-5 shrink-0 place-items-center rounded text-ink-muted transition-colors hover:bg-brand-soft hover:text-brand"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden>
              <path d="M8 2.5v11a.5.5 0 0 1-.83.37L3.9 11H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.9l3.27-2.87A.5.5 0 0 1 8 2.5Zm3.3 1.8a.75.75 0 0 1 1.02.28A6.5 6.5 0 0 1 13 8c0 1.23-.34 2.4-.94 3.42a.75.75 0 1 1-1.3-.76A5 5 0 0 0 11.5 8c0-.96-.27-1.86-.74-2.62a.75.75 0 0 1 .28-1.02Z" />
            </svg>
          </button>
        )}
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
  renderGap,
  run,
}: {
  text: string;
  resolve: GapResolver;
  width?: keyof typeof WIDTH;
  className?: string;
  /** Substitutes the text box — a flow-chart answered from a lettered box
   *  needs the same buttons a map does, not a free-text field. */
  renderGap?: (binding: ReturnType<GapResolver>) => ReactNode;
  /**
   * Makes this line highlightable, under this run id. The gaps between the
   * prose are not part of the run's text — an <input> has no characters — so
   * the offsets a mark is stored at are offsets into the AUTHORED sentence and
   * survive every keystroke typed into it.
   */
  run?: string;
}) {
  const segments = parseGaps(text);
  // Offsets are into the run, not the piece: each prose segment starts where
  // the segments before it ended, with the `[[n]]` markers contributing nothing.
  let base = 0;
  return (
    // pre-line: a real exam table cell stacks several lines against one gap
    // ("basic theory e.g. understanding the ___ / and tides"). Authoring that
    // as `\n` keeps the content readable; without this the browser would
    // collapse it onto one line.
    <span className={cn("whitespace-pre-line leading-loose", className)}>
      {segments.map((seg, i) => {
        if (isGap(seg)) {
          return renderGap ? (
            <span key={i}>{renderGap(resolve(seg.gap))}</span>
          ) : (
            <GapField key={i} binding={resolve(seg.gap)} width={width} />
          );
        }
        const at = base;
        base += seg.length;
        return <AnnotatedText key={i} run={run} text={seg} base={at} />;
      })}
    </span>
  );
}
