"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, RotateCcw, X, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SECTIONS, QUESTION_TYPES, SET_NOUN, type SectionKey, type QuestionTypeKey } from "@/lib/ielts";
import type { Answer, SetLayout } from "@/lib/question-content";
import {
  getSetPaginated,
  submitSetAnswers,
  type PaginatedSetResult,
  type SetSubmissionResult,
} from "@/app/actions/questions";
import { scoreAttemptSpeaking } from "@/app/actions/speaking";
import { SetBody, type PlayerSet } from "./set-body";

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
  const [result, setResult] = useState<SetSubmissionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [, setAttemptedSets] = useState<Set<number>>(() => new Set(initialAttempted.setIndices));

  const sec = SECTIONS[section];
  const meta = QUESTION_TYPES[questionType];
  const currentSet = data.set;
  const totalSets = data.totalSets;
  const currentSetIndex = data.currentSetIndex;

  useEffect(() => {
    if (setPage === 1 && data === initialData) return;

    setLoading(true);
    setAnswers({});
    setResult(null);

    getSetPaginated(section, questionType, setPage)
      .then((res) => setData(res))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPage, section, questionType]);

  const goToSet = useCallback((page: number) => {
    setSetPage(page);
    setAnswers({});
    setResult(null);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const goBack = useCallback(() => {
    router.push(`/practice/${section}`);
  }, [router, section]);

  const handleRestart = useCallback(() => {
    setAnswers({});
    setResult(null);
    setRestartKey((k) => k + 1);
  }, []);

  const handleAnswer = useCallback((questionId: string, answer: Answer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  const handleSubmit = async () => {
    if (!currentSet) return;
    setSubmitting(true);
    try {
      const res = await submitSetAnswers(currentSet.id, answers);
      setResult(res);
      setAttemptedSets((prev) => new Set([...prev, currentSetIndex]));
      topRef.current?.scrollIntoView({ behavior: "smooth" });

      // Speaking bands are computed server-side after the fact — a SpeechSuper
      // call takes ~9s each, so blocking the submit on seven of them would
      // stall the UI. Rows show "awaiting score" until this fills them in.
      if (section === "speaking") {
        setScoring(true);
        scoreAttemptSpeaking(res.attemptId)
          .catch(() => {}) // a scoring outage must not break the attempt
          .finally(() => setScoring(false));
      }
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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goBack]);

  const answeredCount = currentSet
    ? currentSet.questions.filter((q) => answers[q.id] !== undefined).length
    : 0;
  const totalQsInSet = currentSet?.questions.length ?? 0;
  const progress = totalSets > 0 ? Math.round((currentSetIndex / totalSets) * 100) : 0;

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
  const isNumbered = section !== "speaking" && section !== "writing";
  const range =
    isNumbered && currentSet && totalQsInSet > 0
      ? totalQsInSet === 1
        ? `Question ${currentSet.startNumber}`
        : `Questions ${currentSet.startNumber}–${currentSet.startNumber + totalQsInSet - 1}`
      : "";
  const noun = SET_NOUN[section];

  return (
    <div className="mx-auto w-full max-w-6xl" ref={topRef}>
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

          <div className="hidden items-center gap-2 lg:flex">
            <div className="w-24">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <span className="font-mono text-xs tabular-nums text-ink-muted">{progress}%</span>
          </div>

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
              <SetBody
                set={playerSet}
                questions={currentSet.questions}
                answers={answers}
                results={result?.results ?? null}
                onAnswer={handleAnswer}
              />

              {!result ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper-sunken p-4">
                  <p className="text-sm text-ink-soft">
                    <span className="font-semibold text-ink">{answeredCount}</span> / {totalQsInSet}{" "}
                    answered
                  </p>
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={submitting || answeredCount === 0}
                    className="btn-lift"
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {submitting ? "Submitting…" : `Submit ${totalQsInSet > 1 ? "all answers" : "answer"}`}
                  </Button>
                </div>
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
                        {scoring ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Loader2 className="size-3.5 animate-spin" />
                            Scoring your speaking — this takes a few seconds per answer.
                          </span>
                        ) : (
                          <>
                            {result.subjective > 0 &&
                              `${result.subjective} response${result.subjective > 1 ? "s" : ""} sent for AI band scoring. `}
                            {result.total > 0 &&
                              `Accuracy ${Math.round((result.correct / result.total) * 100)}%`}
                          </>
                        )}
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

          <div className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper-elev px-2.5 py-1 text-xs text-ink-soft">
            <span className="font-mono tabular-nums text-ink-strong">{currentSetIndex + 1}</span>
            <span className="text-ink-muted">/</span>
            <span className="font-mono tabular-nums text-ink-muted">{totalSets}</span>
          </div>

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
    </div>
  );
}
