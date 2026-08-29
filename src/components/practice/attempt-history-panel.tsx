"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, Loader2, ExternalLink, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTIONS, QUESTION_TYPES, type SectionKey, type QuestionTypeKey } from "@/lib/ielts";
import {
  getRecentAttempts,
  getAttemptPreview,
  type AttemptRow,
  type AttemptDetail,
} from "@/app/actions/history";
import { AttemptAnswers } from "@/components/history/attempt-answers";
import { AttemptScoreChip } from "@/components/history/attempt-score";
import { LocalTime } from "@/components/history/local-time";

/**
 * Past attempts at THIS task type, without leaving the player.
 *
 * The header used to link straight to /history. That link is a trapdoor: the
 * player holds the answers, the flags and the current set in component state,
 * so following it discards a half-finished set and comes back at set 1. And it
 * landed on a day view the candidate then had to drill down through — day →
 * section → type — to reach the very attempts they were already looking for.
 *
 * So the same question is answered in place: the last dozen attempts at this
 * type, newest first, each expandable to the answers and the marks. The full
 * review is still one click away at /history/[id], deliberately in a NEW TAB —
 * the session in this one stays exactly where it was.
 */
export function AttemptHistoryPanel({
  open,
  onClose,
  section,
  questionType,
  currentSetId,
}: {
  open: boolean;
  onClose: () => void;
  section: SectionKey;
  questionType: QuestionTypeKey;
  /** The set on screen, so its own past attempts can be called out. */
  currentSetId: string | null;
}) {
  const [rows, setRows] = useState<AttemptRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const sec = SECTIONS[section];
  const meta = QUESTION_TYPES[questionType];

  /**
   * Re-fetched on every open, not once per mount. The attempt a candidate most
   * wants to see is the one they just submitted, and a list cached from the
   * first open would be missing exactly that.
   */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    getRecentAttempts(section, questionType)
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, section, questionType]);

  // Esc closes, as it does for the jump-to-passage palette.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/40"
      role="dialog"
      aria-modal="true"
      aria-label="Your past attempts"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* max-w-lg, not md: the answer renderer puts "your answer" and "the
          correct answer" side by side, and a full option sentence in each
          wrapped to four lines a column narrower than this. */}
      <aside className="flex h-full w-full max-w-lg flex-col border-l border-line bg-paper-elev shadow-xl">
        <header className="flex items-start gap-3 border-b border-line px-4 py-3">
          <span
            className={cn(
              "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
              `chip-${sec.accent}`,
            )}
          >
            <History className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-ink">Your past attempts</h3>
            <p className="truncate text-xs text-ink-muted">
              {sec.label} · {meta.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink-muted hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {loading && rows === null && (
            <p className="flex items-center justify-center gap-2 py-16 text-sm text-ink-muted">
              <Loader2 className="size-4 animate-spin" /> Loading your attempts…
            </p>
          )}

          {error && (
            <p className="py-16 text-center text-sm text-ink-muted">
              Couldn&apos;t load your attempts. Close this and try again.
            </p>
          )}

          {rows?.length === 0 && !loading && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <History className="size-7 text-ink-muted" />
              <p className="text-sm text-ink-muted">
                No attempts at {meta.label.toLowerCase()} yet.
              </p>
              <p className="text-xs text-ink-muted">
                Submit this one and it will appear here with its score.
              </p>
            </div>
          )}

          <ul className="space-y-2">
            {rows?.map((row) => (
              <AttemptCard
                key={row.attemptId}
                row={row}
                isCurrentSet={currentSetId !== null && row.setId === currentSetId}
              />
            ))}
          </ul>
        </div>

        <footer className="border-t border-line px-4 py-2.5">
          {/* New tab for the same reason the per-attempt link opens in one: the
              set behind this panel is unsaved until it is submitted. */}
          <a
            href="/history"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
          >
            All practice history <ExternalLink className="size-3" />
          </a>
        </footer>
      </aside>
    </div>
  );
}

/**
 * One attempt: the score first, the answers on demand.
 *
 * The detail is a second round trip, so it is only fetched when a row is
 * actually opened — a candidate glancing at "4/4 · 3/4 · 2/4" to see whether
 * they are improving never pays for it.
 */
function AttemptCard({ row, isCurrentSet }: { row: AttemptRow; isCurrentSet: boolean }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(() => {
    if (!open && detail === null && !loading) {
      setLoading(true);
      getAttemptPreview(row.attemptId)
        .then(setDetail)
        .finally(() => setLoading(false));
    }
    setOpen((o) => !o);
  }, [open, detail, loading, row.attemptId]);

  return (
    <li
      className={cn(
        "overflow-hidden rounded-xl border border-line bg-paper",
        open && "border-brand/40",
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-paper-sunken"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-ink">
              {row.setTitle ?? "Untitled set"}
            </span>
            {isCurrentSet && (
              <span className="shrink-0 rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                On screen
              </span>
            )}
          </span>
          <span className="block text-xs text-ink-muted">
            <LocalTime value={row.createdAt.toISOString()} /> · {row.questions} question
            {row.questions !== 1 ? "s" : ""}
          </span>
        </span>
        <AttemptScoreChip
          correct={row.correct}
          graded={row.graded}
          avgBand={row.avgBand}
          className="shrink-0"
        />
        <ChevronRight
          className={cn("size-4 shrink-0 text-ink-muted transition-transform", open && "rotate-90")}
        />
      </button>

      {open && (
        <div className="border-t border-line bg-paper-sunken/40 px-3 py-3">
          {loading && (
            <p className="flex items-center gap-2 text-xs text-ink-muted">
              <Loader2 className="size-3.5 animate-spin" /> Loading answers…
            </p>
          )}

          {detail && (
            <>
              <ol className="space-y-3">
                {detail.items.map((item) => (
                  <li key={item.responseId} className="flex gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full font-mono text-[10px] font-semibold tabular-nums text-white",
                        item.isCorrect === null
                          ? "bg-info"
                          : item.isCorrect
                            ? "bg-success"
                            : "bg-danger",
                      )}
                    >
                      {item.number ?? "?"}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {item.question?.prompt && (
                        <p className="text-xs font-medium text-ink">{item.question.prompt}</p>
                      )}
                      {/* The same renderer /history/[id] uses, so "you picked B"
                          reads identically in both places. */}
                      <AttemptAnswers
                        questionType={detail.questionType}
                        content={item.question?.content ?? null}
                        correctAnswer={item.question?.correctAnswer ?? null}
                        response={item.response}
                        layout={detail.set?.layout ?? null}
                        gapNumber={item.number}
                        isCorrect={item.isCorrect}
                        transcript={item.transcript}
                        audioUrl={item.audioUrl}
                        aiFeedback={item.aiFeedback}
                      />
                    </div>
                  </li>
                ))}
              </ol>

              <a
                href={`/history/${row.attemptId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-brand/50 hover:text-ink"
              >
                Open full review <ExternalLink className="size-3" />
              </a>
            </>
          )}
        </div>
      )}
    </li>
  );
}
