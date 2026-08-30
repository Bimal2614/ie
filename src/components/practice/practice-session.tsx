"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, RotateCcw, X, AlertCircle, Loader2, LayoutGrid, Check, History, Flag, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SECTIONS,
  QUESTION_TYPES,
  SET_NOUN,
  hasSideStimulus,
  isAiScored,
  type SectionKey,
  type QuestionTypeKey,
} from "@/lib/ielts";
import { anyUploadPending, isAnswered, type Answer, type SetLayout } from "@/lib/question-content";
import { getSetPaginated, type PaginatedSetResult } from "@/app/actions/questions";
import { submitPractice, type SetSubmissionResult } from "@/app/actions/practice";
import { isPlanBlock, type PlanBlock } from "@/lib/plans";
import { PlanBlockDialog } from "./plan-block-dialog";
import { FullscreenButton } from "@/components/exam/fullscreen-button";
import { TextSizeControl } from "@/components/exam/text-size-control";
import { SplitPane } from "@/components/exam/split-pane";
import { SetBody, taskHeading, type PlayerSet } from "./set-body";
import { InstructionBar } from "./question-body";
import { AttemptFeedback } from "./attempt-feedback";
import { AttemptHistoryPanel } from "./attempt-history-panel";

/**
 * Set-based practice player.
 *
 * IELTS shares one passage/recording across several questions, so navigation is
 * set-by-set and the whole set is submitted at once. All rendering lives in
 * <SetBody/>, which /practice/set/[id] uses too — the per-type layouts stay
 * identical across both routes.
 */
interface PracticeSessionProps {
  section: SectionKey;
  questionType: QuestionTypeKey;
  initialData: PaginatedSetResult;
  initialAttempted: { setIndices: number[] };
}

export function PracticeSession({
  section,
  questionType,
  initialData,
  initialAttempted,
}: PracticeSessionProps) {
  const router = useRouter();
  const topRef = useRef<HTMLDivElement>(null);

  const [setPage, setSetPage] = useState(1); // 1-indexed
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<SetSubmissionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /** Set when the plan refused the submit. The answers stay on screen. */
  const [blocked, setBlocked] = useState<PlanBlock | null>(null);
  /** "Clear all" is armed by the first click and fires on the second. */
  const [confirmClear, setConfirmClear] = useState(false);

  const toggleFlag = useCallback((id: string) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const [attemptedSets, setAttemptedSets] = useState<Set<number>>(() => new Set(initialAttempted.setIndices));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const sec = SECTIONS[section];
  const meta = QUESTION_TYPES[questionType];
  const currentSet = data.set;
  const totalSets = data.totalSets;
  const currentSetIndex = data.currentSetIndex;

  useEffect(() => {
    if (setPage === 1 && data === initialData) return;

    setLoading(true);
    setAnswers({});
    setFlagged(new Set());
    setResult(null);

    getSetPaginated(section, questionType, setPage)
      .then((res) => setData(res))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPage, section, questionType]);

  const goToSet = useCallback((page: number) => {
    setSetPage(page);
    setAnswers({});
    setFlagged(new Set());
    setResult(null);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  const goBack = useCallback(() => {
    router.push(`/practice/${section}`);
  }, [router, section]);

  const handleRestart = useCallback(() => {
    setAnswers({});
    setFlagged(new Set());
    setResult(null);
    setRestartKey((k) => k + 1);
  }, []);

  const handleAnswer = useCallback((questionId: string, answer: Answer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  const clearAnswer = useCallback((questionId: string) => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }, []);

  /**
   * Empties the whole set from one place at the top.
   *
   * This replaces the "Clear" that used to appear in a row the moment it was
   * answered: it widened the gutter and shrank the options next to it, so the
   * card moved under the cursor on the very click that summoned it. One button
   * that is always there cannot do that. Losing ten answers (or an essay) to a
   * stray click would be worse than the twitch, so it arms first and clears on
   * the second click.
   */
  const clearAllAnswers = useCallback(() => {
    setAnswers({});
    // The Writing autosave only writes when there IS something to save, so a
    // cleared essay would come straight back on the next reload unless the
    // stored draft goes with it.
    if (currentSet) {
      try {
        localStorage.removeItem(`ielts:draft:${currentSet.id}`);
      } catch {}
    }
  }, [currentSet]);

  // A button left armed on one set must not still be armed on the next.
  useEffect(() => {
    setConfirmClear(false);
  }, [currentSet?.id, result]);

  // Resume the last set the user was on for this question type.
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(`ielts:lastpage:${section}:${questionType}`));
      if (saved > 1) setSetPage(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(`ielts:lastpage:${section}:${questionType}`, String(setPage));
    } catch {}
  }, [setPage, section, questionType]);

  // Autosave the WRITING draft so a refresh doesn't lose a long essay.
  useEffect(() => {
    if (!currentSet || section !== "writing" || result) return;
    if (Object.keys(answers).length === 0) return;
    try {
      localStorage.setItem(`ielts:draft:${currentSet.id}`, JSON.stringify(answers));
    } catch {}
  }, [answers, currentSet, section, result]);

  // Restore a saved writing draft when the set loads (runs after the reset).
  useEffect(() => {
    if (!currentSet || section !== "writing") return;
    try {
      const raw = localStorage.getItem(`ielts:draft:${currentSet.id}`);
      if (raw) {
        const draft = JSON.parse(raw) as Record<string, Answer>;
        if (draft && Object.keys(draft).length > 0) {
          setAnswers(draft);
          setNotice("Draft restored from your last session.");
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSet?.id]);

  // Warn before leaving with un-submitted answers.
  useEffect(() => {
    if (result || Object.keys(answers).length === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [answers, result]);

  const handleSubmit = async () => {
    if (!currentSet) return;
    setSubmitting(true);
    setNotice(null);
    setBlocked(null);
    try {
      const res = await submitPractice(currentSet.id, answers);
      // A plan limit is not a throttle and not a failure: it gets its own
      // notice, keeps the draft, and does not mark the set as attempted.
      if (isPlanBlock(res)) {
        setBlocked(res);
        return;
      }
      setResult(res);
      try { localStorage.removeItem(`ielts:draft:${currentSet.id}`); } catch {}
      setAttemptedSets((prev) => new Set([...prev, currentSetIndex]));
      topRef.current?.scrollIntoView({ behavior: "smooth" });

      // Writing & Speaking bands are filled in server-side after the response
      // (see scheduleAttemptScoring) — an AI call takes a few seconds each, so
      // blocking submit on several would stall the UI. Rows show "awaiting
      // score" until they land. Deliberately NOT triggered from here any more:
      // the submit already started it, and asking again would score the same
      // answers a second time and bill for both.
    } catch {
      // Most likely a rate-limit throttle (server messages are redacted in prod).
      setNotice("You're going too fast: please wait a moment and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextAfterFeedback = () => {
    if (data.hasNextSet) goToSet(setPage + 1);
    else goBack();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Never hijack typing in a field.
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      /**
       * AN OPEN OVERLAY OWNS THE KEYBOARD.
       *
       * Escape here exits the whole session, so with a dialog on top of the
       * player it did the one thing the dialog exists to avoid: one keypress
       * discarded a half-answered set to dismiss a panel. Enter and the arrows
       * were no better — they submitted or paged a set the candidate could not
       * see. The panel closes itself on Escape; the palette is closed here
       * because it has no handler of its own.
       */
      if (historyOpen) return;
      if (paletteOpen) {
        if (e.key === "Escape") { e.preventDefault(); setPaletteOpen(false); }
        return;
      }
      if (e.key === "Escape") { e.preventDefault(); goBack(); return; }
      // Enter: submit while answering, or advance after feedback.
      if (e.key === "Enter") {
        e.preventDefault();
        if (result) handleNextAfterFeedback();
        else if (!submitting && Object.keys(answers).length > 0) handleSubmit();
        return;
      }
      // Arrows move between passages (only before submitting).
      if (!result) {
        if (e.key === "ArrowLeft" && data.hasPreviousSet) { e.preventDefault(); goToSet(setPage - 1); }
        else if (e.key === "ArrowRight" && data.hasNextSet) { e.preventDefault(); goToSet(setPage + 1); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goBack, result, submitting, answers, data.hasPreviousSet, data.hasNextSet, setPage, paletteOpen, historyOpen]);

  const answeredCount = currentSet
    ? currentSet.questions.filter((q) => isAnswered(answers[q.id])).length
    : 0;
  const totalQsInSet = currentSet?.questions.length ?? 0;
  // Disabling the button is also what disarms it.
  const armedClear = confirmClear && answeredCount > 0;

  const playerSet: PlayerSet | null = currentSet
    ? {
        id: currentSet.id,
        title: currentSet.title,
        instructions: currentSet.instructions,
        section: currentSet.section,
        questionType: currentSet.questionType,
        passageText: currentSet.passageText,
        audioUrl: currentSet.audioUrl,
        imageUrl: currentSet.imageUrl,
        layout: (currentSet.layout as SetLayout | null) ?? null,
        startNumber: currentSet.startNumber,
      }
    : null;

  // Exam-style continuous numbering, e.g. "Questions 14–20". Speaking is a
  // spoken interview with no numbered answer sheet, so a range there would be
  // an invention — it shows the topic name instead.
  // The two AI-scored sections: no marks to report, so the report is the result.
  const aiScored = isAiScored(section);

  /**
   * Does this set's stimulus belong beside the questions? Shared rule, so a
   * Task 1 chart cannot sit beside the editor on one route and above it here.
   */
  /**
   * The one question these top-bar controls act on. Only defined for a
   * single-task set — with ten questions on screen "flag the question" has no
   * referent, and those rows keep their own per-row controls.
   */
  const taskControls =
    currentSet && currentSet.questions.length === 1 && !result
      ? {
          id: currentSet.questions[0].id,
          flagged: flagged.has(currentSet.questions[0].id),
        }
      : null;

  const sideStimulus = Boolean(
    playerSet && hasSideStimulus(section, playerSet) && !(aiScored && result),
  );

  /**
   * With the panes split, <SetBody/> is asked for the questions alone and
   * returns them without the instruction above them, so it is drawn here. For
   * Writing that line is the task prompt itself.
   */
  const instructionText =
    playerSet && currentSet ? taskHeading(playerSet, currentSet.questions) : null;
  // A recording still on its way to storage would be submitted with no audio
  // and could never be scored, so submit waits for it.
  const savingRecording = anyUploadPending(answers);
  const isNumbered = !aiScored;
  const range =
    isNumbered && currentSet && totalQsInSet > 0
      ? totalQsInSet === 1
        ? `Question ${currentSet.startNumber}`
        : `Questions ${currentSet.startNumber}-${currentSet.startNumber + totalQsInSet - 1}`
      : "";
  const noun = SET_NOUN[section];

  return (
    <div className="practice-root mx-auto w-full max-w-6xl" ref={topRef}>
      <PlanBlockDialog block={blocked} onClose={() => setBlocked(null)} />
      {notice && (
        <div className="mb-3 rounded-lg border border-warning/40 bg-warning-soft px-4 py-2.5 text-sm text-ink-soft">
          {notice}
        </div>
      )}
      <div className="surface pb-0">
        {/* ── Top bar ── */}
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
          <Button variant="ghost" size="sm" onClick={goBack} className="text-ink-soft">
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              {sec.label} · {meta.label}
            </p>
            {/* The set's own name (a speaking topic) belongs to the body, which
                prints it next to the questions — so this stays a locator. */}
            <p className="display text-sm">
              {range && <>{range} · </>}
              <span className={cn(range && "font-normal text-ink-muted")}>
                {noun} {currentSetIndex + 1} of {totalSets}
              </span>
            </p>
          </div>

          {/* Flag marks the task for review; it belongs up here only when the
              set IS one task, since with ten questions on screen "flag the
              question" has no referent and those rows carry their own.

              Clear is different: it is set-wide, so it is here for every type.
              Per-row Clear buttons appeared only once a row was answered, which
              moved the layout on the click that created them. */}
          <div className="hidden items-center gap-1 sm:flex">
            {taskControls && (
              <button
                type="button"
                onClick={() => toggleFlag(taskControls.id)}
                title={
                  taskControls.flagged
                    ? "Remove your review mark"
                    : "Mark for review — a private bookmark, only you see it"
                }
                aria-label="Mark this question for review"
                aria-pressed={taskControls.flagged}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold transition-colors hover:border-brand/50 hover:text-ink",
                  taskControls.flagged ? "text-warning" : "text-ink-soft",
                )}
              >
                <Flag className={cn("size-3.5", taskControls.flagged && "fill-warning")} />
                <span className="hidden lg:inline">{taskControls.flagged ? "Flagged" : "Flag"}</span>
              </button>
            )}
            {!result && totalQsInSet > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (!armedClear) setConfirmClear(true);
                  else {
                    clearAllAnswers();
                    setConfirmClear(false);
                  }
                }}
                onBlur={() => setConfirmClear(false)}
                disabled={answeredCount === 0}
                title={
                  armedClear
                    ? "Click again to clear"
                    : totalQsInSet === 1
                      ? "Clear your answer"
                      : `Clear all ${totalQsInSet} answers`
                }
                aria-label={totalQsInSet === 1 ? "Clear your answer" : "Clear all answers in this set"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border bg-paper px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40",
                  armedClear
                    ? "border-danger/60 text-danger"
                    : "border-line text-ink-soft enabled:hover:border-brand/50 enabled:hover:text-ink",
                )}
              >
                <Eraser className="size-3.5" />
                {/* Fixed width: the label swaps between two lengths, and this
                    button has the fullscreen and history controls next to it. */}
                <span className="hidden w-14 lg:inline-block">{armedClear ? "Sure?" : "Clear all"}</span>
              </button>
            )}
          </div>

          {/* Writing a 250-word essay inside the sidebar and topbar wastes most
              of the screen, so this route offers the same fullscreen control the
              exam shell has. `topRef` is the player's own root, so the app
              chrome is what gets left behind. */}
          <FullscreenButton target={topRef} className="hidden sm:inline-flex" />

          {/* Same control the exam shell carries, so a candidate who sets their
              text size in a mock finds it already set in question practice. */}
          <TextSizeControl className="hidden sm:inline-flex" />

          {/* Past attempts and their bands. This used to be a link to
              /history, which threw away the set in progress to get there — it
              opens the same record in a panel over the player instead. */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHistoryOpen(true)}
            title="Your previous attempts and bands"
            aria-label="Previous attempts and bands"
            aria-haspopup="dialog"
            className="text-ink-soft"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRestart}
            title="Restart current set"
            aria-label="Restart current set"
            className="text-ink-soft"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            title="Exit session"
            aria-label="Exit session"
            className="text-danger hover:text-danger"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Content ── */}
        <div className="min-h-[50vh] px-4 py-5 sm:px-6 sm:py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-7 w-7 animate-spin text-brand" />
              <p className="text-sm text-ink-muted">Loading passage…</p>
            </div>
          ) : playerSet && currentSet ? (
            <div key={`${currentSet.id}-${restartKey}`} className="space-y-6">
              {/* A Task 1 chart and a Reading passage have to stay in view while
                  the answer is written, so they take their own pane instead of
                  pushing the questions off the screen. Same <SplitPane/> and the
                  same <SetBody/> slots the single-set and section players use. */}
              {sideStimulus ? (
                <div className="space-y-4">
                  <InstructionBar text={instructionText} section={section} />
                  {/* Both panes take the SAME height and scroll inside it, so a
                      tall chart no longer leaves the editor beside it ending
                      halfway down. Sized off the viewport minus this route's own
                      chrome; in fullscreen `.practice-root:fullscreen` gives it
                      the whole screen. */}
                  <SplitPane
                    className="h-[calc(100dvh-19rem)] min-h-[24rem]"
                    storageKey={`exam-split-${section}`}
                    left={
                      <div className="h-full overflow-y-auto pr-1">
                        <SetBody
                          set={playerSet}
                          questions={currentSet.questions}
                          answers={answers}
                          results={null}
                          onAnswer={handleAnswer}
                          slot="stimulus"
                          exam
                        />
                      </div>
                    }
                    right={
                      <div className="flex h-full min-h-0 flex-col overflow-y-auto pl-1">
                        <SetBody
                          set={playerSet}
                          questions={currentSet.questions}
                          answers={answers}
                          results={result?.results ?? null}
                          onAnswer={handleAnswer}
                          onClearAnswer={clearAnswer}
                          flagged={flagged}
                          onToggleFlag={toggleFlag}
                          slot="questions"
                          exam
                        />
                      </div>
                    }
                  />
                </div>
              ) : (
                <SetBody
                  set={playerSet}
                  questions={currentSet.questions}
                  answers={answers}
                  results={result?.results ?? null}
                  onAnswer={handleAnswer}
                  onClearAnswer={clearAnswer}
                  flagged={flagged}
                  onToggleFlag={toggleFlag}
                  exam
                />
              )}

              {!result ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper-sunken p-4">
                  <p className="text-sm text-ink-soft">
                    <span className="font-semibold text-ink">{answeredCount}</span> / {totalQsInSet}{" "}
                    answered
                  </p>
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={submitting || savingRecording || answeredCount === 0}
                    className="btn-lift"
                  >
                    {(submitting || savingRecording) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {savingRecording
                      ? "Saving recording…"
                      : submitting
                        ? "Submitting…"
                        : `Submit ${totalQsInSet > 1 ? "all answers" : "answer"}`}
                  </Button>
                </div>
              ) : (
                aiScored ? (
                /* Writing and Speaking have no right/wrong to report — the AI
                   report IS the result, so it replaces the score card rather
                   than sitting under it. */
                <AttemptFeedback
                  attemptId={result.attemptId}
                  section={section}
                  footer={
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={handleRestart}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Try again
                      </Button>
                      <Button size="sm" onClick={handleNextAfterFeedback}>
                        {data.hasNextSet ? `Next ${noun.toLowerCase()}` : "Finish"}
                      </Button>
                    </div>
                  }
                />
              ) : (
                <div
                  className={cn(
                    "rounded-xl border p-5",
                    result.total > 0 && result.correct === result.total
                      ? "border-success/40 bg-success-soft"
                      : "border-line bg-paper-sunken",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="display text-lg">
                        {result.total > 0
                          ? result.correct === result.total
                            ? "Perfect score"
                            : `${result.correct} / ${result.total} correct`
                          : "Response submitted"}
                      </p>
                      <p className="text-sm text-ink-muted">
                        {result.subjective > 0 &&
                          `${result.subjective} response${result.subjective > 1 ? "s" : ""} sent for AI band scoring. `}
                        {result.total > 0 &&
                          `Accuracy ${Math.round((result.correct / result.total) * 100)}%`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleRestart}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Try again
                      </Button>
                      <Button size="sm" onClick={handleNextAfterFeedback}>
                        {data.hasNextSet ? "Next passage" : "Finish"}
                      </Button>
                    </div>
                  </div>
                </div>
              )
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <AlertCircle className="h-8 w-8 text-ink-muted" />
              <p className="text-sm text-ink-muted">No sets available for this type yet.</p>
              <Button variant="outline" onClick={goBack}>
                Go back
              </Button>
            </div>
          )}
        </div>

        {/* ── Set navigation ── */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-b-xl border-t border-line bg-paper-elev/95 px-3 py-2.5 backdrop-blur-md sm:px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToSet(setPage - 1)}
            disabled={!data.hasPreviousSet}
            className="text-ink-soft"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Previous</span>
          </Button>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            title="Jump to a passage"
            aria-label={`Passage ${currentSetIndex + 1} of ${totalSets}: open list`}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper-elev px-2.5 py-1 text-xs text-ink-soft transition-colors hover:border-brand/50 hover:bg-brand-soft"
          >
            <LayoutGrid className="size-3.5 text-ink-muted" />
            <span className="font-mono tabular-nums text-ink-strong">{currentSetIndex + 1}</span>
            <span className="text-ink-muted">/</span>
            <span className="font-mono tabular-nums text-ink-muted">{totalSets}</span>
          </button>

          <Button
            size="sm"
            onClick={() => goToSet(setPage + 1)}
            disabled={!data.hasNextSet}
            className="btn-lift"
          >
            <span className="mr-1 hidden sm:inline">Next</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Past attempts ── */}
      <AttemptHistoryPanel
        open={historyOpen}
        onClose={closeHistory}
        section={section}
        questionType={questionType}
        currentSetId={currentSet?.id ?? null}
      />

      {/* ── Passage palette ── */}
      {paletteOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Jump to a passage"
          onClick={(e) => e.target === e.currentTarget && setPaletteOpen(false)}
        >
          <div className="w-full max-w-lg rounded-2xl border border-line bg-paper-elev p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-ink">Jump to a {noun.toLowerCase()}</h3>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {attemptedSets.size} of {totalSets} attempted
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaletteOpen(false)}
                aria-label="Close"
                className="text-ink-muted hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 grid max-h-[55vh] grid-cols-6 gap-2 overflow-y-auto sm:grid-cols-8">
              {Array.from({ length: totalSets }, (_, i) => {
                const isCurrent = i === currentSetIndex;
                const isDone = attemptedSets.has(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      goToSet(i + 1);
                      setPaletteOpen(false);
                    }}
                    aria-current={isCurrent ? "true" : undefined}
                    className={cn(
                      "relative grid aspect-square place-items-center rounded-lg border font-mono text-sm tabular-nums transition-colors",
                      isCurrent
                        ? "border-brand bg-brand text-white"
                        : isDone
                          ? "border-success/40 bg-success-soft text-ink hover:border-success"
                          : "border-line bg-paper text-ink-soft hover:border-brand/50 hover:bg-brand-soft",
                    )}
                  >
                    {i + 1}
                    {isDone && !isCurrent && (
                      <Check className="absolute right-0.5 top-0.5 size-2.5 text-success" strokeWidth={3} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded border border-brand bg-brand" /> Current
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded border border-success/40 bg-success-soft" /> Attempted
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded border border-line bg-paper" /> Not yet
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
