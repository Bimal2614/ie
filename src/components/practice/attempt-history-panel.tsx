"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, Loader2, ExternalLink, History } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SECTIONS,
  QUESTION_TYPES,
  SET_NOUN,
  type SectionKey,
  type QuestionTypeKey,
} from "@/lib/ielts";
import {
  getSetAttempts,
  getRecentAttempts,
  getQuestionAnswers,
  getAttemptPreview,
  type AttemptRow,
  type AttemptDetail,
  type QuestionHistory,
  type QuestionAnswerRow,
} from "@/app/actions/history";
import { AttemptAnswers } from "@/components/history/attempt-answers";
import { AttemptScoreChip } from "@/components/history/attempt-score";
import { LocalTime } from "@/components/history/local-time";

/**
 * Your record of THE THING ON SCREEN, without leaving the player.
 *
 * The header used to link straight to /history. That link is a trapdoor: the
 * player holds the answers, the flags and the current set in component state,
 * so following it discards a half-finished set and comes back at set 1. And it
 * landed on a day view the candidate then had to drill down through — day →
 * section → type — to reach the very attempts they were already looking for.
 *
 * So the same question is answered in place: your past goes at this, newest
 * first, each expandable to the answers and the marks. The full review is still
 * one click away at /history/[id], deliberately in a NEW TAB — the session in
 * this one stays exactly where it was.
 *
 * ONE COMPONENT, THREE SCOPES — because "this" is whatever the player is
 * showing, and the panel is told which:
 *
 *   a question  Speaking Parts 1 and 3 are an interview: the set is a TOPIC and
 *               its questions are asked one at a time, each recorded and banded
 *               on its own. So the list is that question's own answers.
 *   a set       Everything else. A passage, a recording or a task is answered
 *               and marked as ONE thing, so the attempt is the unit — and the
 *               attempts listed are the ones at the set in front of you.
 *   the type    Fallback for a player with no set on screen. Nothing narrower
 *               can be asked, and a wider answer beats an empty panel.
 *
 * The type-wide list used to be the only scope, and it was the wrong one: the
 * panel opened on Recording 48 and listed four OTHER recordings, so the one
 * fact it was opened for — have I sat this before, and how did it go — had to
 * be dug out of five set titles. /history, in the footer, is still the way to
 * see everything.
 */
export function AttemptHistoryPanel({
  open,
  onClose,
  section,
  questionType,
  setId = null,
  setTitle = null,
  focusQuestionId = null,
  focusQuestionPrompt = null,
}: {
  open: boolean;
  onClose: () => void;
  section: SectionKey;
  questionType: QuestionTypeKey;
  /**
   * The set on screen. Supplying it scopes the list to that set's own attempts;
   * null falls back to the task type, for a player with nothing loaded.
   */
  setId?: string | null;
  /** Printed at the top, so it is obvious WHICH set is being reported on. */
  setTitle?: string | null;
  /**
   * The one question on screen, for surfaces that ask them one at a time.
   * Supplying it narrows the panel one step further, to that question's own
   * answers; null keeps the attempt list, which is right wherever a whole set
   * is sat at once.
   *
   * Ids rather than the objects they name: they are dependencies of the fetch,
   * and an object rebuilt by the parent on every render would refetch on every
   * keystroke that reaches the player.
   */
  focusQuestionId?: string | null;
  /** Printed at the top, in place of the set title. */
  focusQuestionPrompt?: string | null;
}) {
  const [rows, setRows] = useState<AttemptRow[] | null>(null);
  const [history, setHistory] = useState<QuestionHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const sec = SECTIONS[section];
  const meta = QUESTION_TYPES[questionType];
  const perQuestion = focusQuestionId !== null;
  /** What this panel is reporting on, printed under the header. */
  const subject = perQuestion ? focusQuestionPrompt : setId ? setTitle : null;

  /**
   * Re-fetched on every open, not once per mount. The attempt a candidate most
   * wants to see is the one they just submitted, and a list cached from the
   * first open would be missing exactly that. The set and the focused question
   * are dependencies too: both change while the player stays mounted.
   */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    // Dropped rather than left on screen while the next one loads: the header
    // names what is being reported on, so a stale list under a new subject
    // would read as that subject's history.
    if (focusQuestionId) setHistory(null);
    else setRows(null);
    const load = focusQuestionId
      ? getQuestionAnswers(focusQuestionId).then((h) => {
          if (!cancelled) setHistory(h);
        })
      : (setId ? getSetAttempts(setId) : getRecentAttempts(section, questionType)).then((r) => {
          if (!cancelled) setRows(r);
        });
    load
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, section, questionType, setId, focusQuestionId]);

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

  const answers = perQuestion ? (history?.answers ?? null) : null;
  // Nothing on screen yet, so a spinner is the whole panel rather than a
  // flicker over a list that is about to be replaced by the same list.
  const blank = perQuestion ? history === null : rows === null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/40"
      role="dialog"
      aria-modal="true"
      aria-label={perQuestion ? "Your past answers to this question" : "Your past attempts"}
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
            <h3 className="text-sm font-semibold text-ink">
              {perQuestion ? "Your past answers" : "Your past attempts"}
            </h3>
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

        {/* The subject itself, unabbreviated. Without it a column of dates and
            scores could belong to any question in the topic, or to any of the
            sixty-odd recordings in the type. */}
        {subject && (
          <p className="border-b border-line bg-paper-sunken/50 px-4 py-2.5 text-sm font-medium text-ink">
            {subject}
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {loading && blank && (
            <p className="flex items-center justify-center gap-2 py-16 text-sm text-ink-muted">
              <Loader2 className="size-4 animate-spin" />{" "}
              {perQuestion ? "Loading your answers…" : "Loading your attempts…"}
            </p>
          )}

          {error && (
            <p className="py-16 text-center text-sm text-ink-muted">
              Couldn&apos;t load your {perQuestion ? "answers" : "attempts"}. Close this and try
              again.
            </p>
          )}

          {(perQuestion ? answers?.length === 0 : rows?.length === 0) && !loading && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <History className="size-7 text-ink-muted" />
              <p className="text-sm text-ink-muted">
                {perQuestion
                  ? "You haven't answered this question yet."
                  : setId
                    ? `You haven't attempted this ${SET_NOUN[section].toLowerCase()} yet.`
                    : `No attempts at ${meta.label.toLowerCase()} yet.`}
              </p>
              <p className="text-xs text-ink-muted">
                {perQuestion
                  ? "Answer it and your recording, transcript and band appear here."
                  : "Submit this one and it will appear here with its score."}
              </p>
            </div>
          )}

          <ul className="space-y-2">
            {perQuestion && history
              ? history.answers.map((answer, i) => (
                  <AnswerCard
                    key={answer.responseId}
                    answer={answer}
                    question={history}
                    // The newest is the answer they just gave, so it opens
                    // itself rather than making them click for the band they
                    // came to see.
                    initiallyOpen={i === 0}
                  />
                ))
              : rows?.map((row) => (
                  <AttemptCard
                    key={row.attemptId}
                    row={row}
                    // Scoped to one set, every row carries the SAME title, which
                    // is already printed above the list — so the date leads
                    // instead, and it is the date that tells two goes apart.
                    showTitle={!setId}
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
 * One past answer to the question on screen.
 *
 * Everything it draws came back with the list — one question's answers are a
 * handful of rows, and the recording is a `preload="none"` element rather than
 * a payload — so unlike an attempt row there is no second round trip behind the
 * chevron, and no reason to make the candidate click for the newest one.
 */
function AnswerCard({
  answer,
  question,
  initiallyOpen,
}: {
  answer: QuestionAnswerRow;
  question: QuestionHistory;
  initiallyOpen: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <li
      className={cn(
        "overflow-hidden rounded-xl border border-line bg-paper",
        open && "border-brand/40",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-paper-sunken"
      >
        <span className="min-w-0 flex-1 truncate text-sm text-ink">
          <LocalTime value={answer.createdAt.toISOString()} />
        </span>
        <AttemptScoreChip
          // One answer, so the objective score is 0/1 or 1/1 — and for the
          // speaking parts this panel exists for, `isCorrect` is null and the
          // chip prints the band instead.
          correct={answer.isCorrect === true ? 1 : 0}
          graded={answer.isCorrect === null ? 0 : 1}
          avgBand={answer.band}
          className="shrink-0"
        />
        <ChevronRight
          className={cn("size-4 shrink-0 text-ink-muted transition-transform", open && "rotate-90")}
        />
      </button>

      {open && (
        <div className="border-t border-line bg-paper-sunken/40 px-3 py-3">
          {/* The same renderer /history/[id] uses, so the recording, the
              transcript and the examiner's notes read identically in both. */}
          <AttemptAnswers
            questionType={question.questionType}
            content={question.content}
            correctAnswer={question.correctAnswer}
            response={answer.response}
            layout={question.layout}
            // The prompt is printed once at the top of the panel — every row
            // here answers the same question, so there is no number to place.
            gapNumber={null}
            isCorrect={answer.isCorrect}
            transcript={answer.transcript}
            audioUrl={answer.audioUrl}
            aiFeedback={answer.aiFeedback}
          />

          {/* The whole sitting this answer belonged to: the rest of the topic,
              and the other questions' bands. */}
          <a
            href={`/history/${answer.attemptId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-brand/50 hover:text-ink"
          >
            Open full review <ExternalLink className="size-3" />
          </a>
        </div>
      )}
    </li>
  );
}

/**
 * One attempt: the score first, the answers on demand.
 *
 * The detail is a second round trip, so it is only fetched when a row is
 * actually opened — a candidate glancing at "4/4 · 3/4 · 2/4" to see whether
 * they are improving never pays for it.
 */
function AttemptCard({ row, showTitle }: { row: AttemptRow; showTitle: boolean }) {
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
        {/* Whichever of the two lines identifies the attempt takes the top.
            Across a whole type that is the set; within one set every row shares
            it, and what tells two goes apart is when they were sat. */}
        <span className="min-w-0 flex-1">
          {showTitle && (
            <span className="block truncate text-sm font-medium text-ink">
              {row.setTitle ?? "Untitled set"}
            </span>
          )}
          <span
            className={cn(
              "block",
              showTitle ? "text-xs text-ink-muted" : "text-sm text-ink",
            )}
          >
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
