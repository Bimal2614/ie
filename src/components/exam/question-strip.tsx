"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The answer-sheet strip along the bottom of the exam.
 *
 * One part — section practice — is just the number row. A whole paper, which is
 * what the mock test sits, gets a tab per part: the open one shows its numbers,
 * the others collapse to a count and expand on click. Same component either
 * way, so the two never drift apart visually.
 */

export type StripPart = {
  id: string;
  /** "Part 1", "Passage 2" — whatever the paper calls it. */
  label: string;
  /** Exam numbers in this part, in order. */
  numbers: number[];
};

export function QuestionStrip({
  parts,
  activePartId,
  answered,
  flagged,
  locked,
  current,
  onJump,
  onSelectPart,
  onToggleFlag,
}: {
  parts: StripPart[];
  activePartId: string;
  answered: Set<number>;
  flagged?: Set<number>;
  /**
   * Questions that can no longer be opened — Speaking in a mock, where the
   * interview only moves forward. Omitted everywhere else: a Reading or
   * Listening paper stays open until it is handed in.
   */
  locked?: Set<number>;
  /** The number the viewport is on, highlighted as "you are here". */
  current?: number | null;
  onJump: (n: number, partId: string) => void;
  /** Omit for a single part — nothing to switch to. */
  onSelectPart?: (partId: string) => void;
  /**
   * Flag a question from the answer sheet itself.
   *
   * The per-question Flag button only exists on types that draw a question ROW —
   * so a whole Listening part answered as a table or a set of notes had no way to
   * mark anything at all, which is most of the module. The sheet has a square for
   * every number whatever its type, so it is the one place flagging can be
   * complete. It is also where the real test keeps its review markers.
   */
  onToggleFlag?: (n: number) => void;
}) {
  // Which part's numbers are on show. Follows the active part, but the
  // candidate can peek at another part's sheet without leaving this one.
  const [openId, setOpenId] = useState(activePartId);
  useEffect(() => setOpenId(activePartId), [activePartId]);

  const multi = parts.length > 1;

  return (
    <nav
      aria-label="Question navigator"
      className="flex items-stretch gap-2 overflow-x-auto border-t border-line bg-paper-elev/95 px-3 py-2 backdrop-blur"
    >
      {parts.map((part) => {
        const open = part.id === openId;
        const isActive = part.id === activePartId;
        const done = part.numbers.filter((n) => answered.has(n)).length;

        // A part is behind you once every question in it is closed.
        const partLocked = Boolean(locked) && part.numbers.every((n) => locked!.has(n));

        if (multi && !open) {
          return (
            <button
              key={part.id}
              type="button"
              disabled={partLocked}
              title={partLocked ? `${part.label} is finished — the interview has moved on` : undefined}
              onClick={() => {
                setOpenId(part.id);
                onSelectPart?.(part.id);
              }}
              className={cn(
                "flex min-w-[9rem] flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2",
                "text-sm transition-colors",
                isActive
                  ? "border-brand/50 bg-brand-soft text-brand"
                  : "border-line bg-paper text-ink-soft enabled:hover:border-brand/40 enabled:hover:text-ink",
                partLocked && "cursor-default opacity-45",
              )}
            >
              <span className="font-semibold">{part.label}:</span>
              <span className="text-xs tabular-nums text-ink-muted">
                {done}/{part.numbers.length} answered
              </span>
            </button>
          );
        }

        return (
          <div
            key={part.id}
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-lg border px-3 py-1.5",
              multi ? "border-brand/50 bg-brand-soft/40" : "border-line bg-paper",
            )}
          >
            <span className="shrink-0 text-sm font-semibold text-ink-strong">{part.label}:</span>
            <div className="flex flex-wrap gap-1">
              {part.numbers.map((n) => {
                const isAnswered = answered.has(n);
                const isFlagged = flagged?.has(n);
                const isLocked = locked?.has(n) ?? false;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={isLocked}
                    onClick={() => onJump(n, part.id)}
                    onContextMenu={
                      onToggleFlag
                        ? (e) => {
                            e.preventDefault();
                            onToggleFlag(n);
                          }
                        : undefined
                    }
                    title={
                      isLocked
                        ? `Question ${n} has been asked — the interview has moved on`
                        : onToggleFlag
                          ? `Question ${n} — right-click to flag for review`
                          : undefined
                    }
                    aria-label={`Question ${n}${isAnswered ? ", answered" : ", not answered"}${
                      isFlagged ? ", flagged for review" : ""
                    }${isLocked ? ", closed" : ""}`}
                    aria-current={current === n ? "true" : undefined}
                    className={cn(
                      "relative grid size-7 place-items-center rounded border font-mono text-[11px] font-semibold tabular-nums transition-colors",
                      isAnswered
                        ? "border-brand bg-brand text-white"
                        : "border-line bg-paper-elev text-ink-soft enabled:hover:border-brand/50 enabled:hover:text-brand",
                      // Still legible — a closed question is a record of what
                      // was asked, not something to hide.
                      isLocked && "cursor-default opacity-45",
                      current === n && "ring-2 ring-brand/40 ring-offset-1 ring-offset-paper",
                    )}
                  >
                    {n}
                    {isFlagged && (
                      <span
                        className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-warning"
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
