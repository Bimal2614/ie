"use client";

import { useState, useCallback } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Answer } from "@/lib/question-content";
import { submitPractice, type PracticeResult } from "@/app/actions/practice";
import { scoreAttemptSpeaking } from "@/app/actions/speaking";
import { SetBody, type PlayerSet, type PlayerQuestion } from "./set-body";

export type { PlayerSet, PlayerQuestion };

/**
 * Single-set player for /practice/set/[id]. Rendering is <SetBody/>, the same
 * component the paginated session uses, so both routes show every question type
 * identically.
 */
export function QuestionPlayer({ set, questions }: { set: PlayerSet; questions: PlayerQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [pending, setPending] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<PracticeResult | null>(null);

  const handleAnswer = useCallback((qid: string, value: Answer) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }, []);

  const onSubmit = async () => {
    setPending(true);
    try {
      const res = await submitPractice(set.id, answers);
      setResult(res);
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Speaking bands are computed server-side after submit — each SpeechSuper
      // call takes a few seconds, so blocking the submit on them would stall.
      if (set.section === "speaking") {
        setScoring(true);
        scoreAttemptSpeaking(res.attemptId)
          .catch(() => {}) // a scoring outage must not break the attempt
          .finally(() => setScoring(false));
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {result && (
        <div className="surface flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="display text-lg">
              {result.total > 0 ? `${result.correct} / ${result.total} correct` : "Response submitted"}
            </p>
            {scoring ? (
              <p className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                <Loader2 className="size-3.5 animate-spin" />
                Scoring your speaking — a few seconds per answer.
              </p>
            ) : (
              result.subjective > 0 && (
                <p className="text-sm text-ink-muted">
                  {result.subjective} response{result.subjective > 1 ? "s" : ""} sent for AI band scoring.
                </p>
              )
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setResult(null);
              setAnswers({});
            }}
          >
            <RotateCcw className="h-4 w-4" /> Try again
          </Button>
        </div>
      )}

      <SetBody
        set={set}
        questions={questions}
        answers={answers}
        results={result?.results ?? null}
        onAnswer={handleAnswer}
      />

      {!result && (
        <div className="flex justify-end">
          <Button size="lg" onClick={onSubmit} disabled={pending} className="btn-lift">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? "Submitting…" : "Submit answers"}
          </Button>
        </div>
      )}
    </div>
  );
}
