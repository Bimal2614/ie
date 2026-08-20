"use client";

import { useState, useCallback } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { anyUploadPending, type Answer } from "@/lib/question-content";
import { submitPractice, type PracticeResult } from "@/app/actions/practice";
import { SetBody, type PlayerSet, type PlayerQuestion } from "./set-body";
import { AttemptFeedback } from "./attempt-feedback";

export type { PlayerSet, PlayerQuestion };

/**
 * Single-set player for /practice/set/[id]. Rendering is <SetBody/>, the same
 * component the paginated session uses, so both routes show every question type
 * identically.
 */
export function QuestionPlayer({ set, questions }: { set: PlayerSet; questions: PlayerQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [pending, setPending] = useState(false);
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
      // Nothing to kick off: submitPractice schedules AI scoring server-side
      // after the response, so it no longer needs this tab to stay open.
    } finally {
      setPending(false);
    }
  };

  // Submitting while a recording is still uploading would store it with no
  // audio, so it could never be scored.
  const savingRecording = anyUploadPending(answers);

  // Writing and Speaking are scored by band, so the AI report is the result —
  // there are no marks to show and nothing to re-read in the question layout.
  const aiScored = set.section === "speaking" || set.section === "writing";

  if (result && aiScored) {
    return (
      <AttemptFeedback
        attemptId={result.attemptId}
        section={set.section}
        footer={
          <div className="flex justify-end">
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
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {result && (
        <div className="surface flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="display text-lg">
              {result.total > 0 ? `${result.correct} / ${result.total} correct` : "Response submitted"}
            </p>
            {result.subjective > 0 && (
              <p className="text-sm text-ink-muted">
                {result.subjective} response{result.subjective > 1 ? "s" : ""} sent for AI band
                scoring — your band appears in History once it lands.
              </p>
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
          <Button
            size="lg"
            onClick={onSubmit}
            disabled={pending || savingRecording}
            className="btn-lift"
          >
            {(pending || savingRecording) && <Loader2 className="h-4 w-4 animate-spin" />}
            {savingRecording ? "Saving recording…" : pending ? "Submitting…" : "Submit answers"}
          </Button>
        </div>
      )}
    </div>
  );
}
