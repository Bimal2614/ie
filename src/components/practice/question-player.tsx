"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, RotateCcw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { anyUploadPending, isAnswered, type Answer } from "@/lib/question-content";
import { QUESTION_TYPES, SECTIONS, hasSideStimulus, isAiScored } from "@/lib/ielts";
import { submitPractice, type PracticeResult } from "@/app/actions/practice";
import { isPlanBlock, type PlanBlock } from "@/lib/plans";
import { PlanBlockDialog } from "./plan-block-dialog";
import { ExamShell, type StripPart } from "@/components/exam/exam-shell";
import { SplitPane } from "@/components/exam/split-pane";
import { SetBody, taskHeading, type PlayerSet, type PlayerQuestion } from "./set-body";
import { AttemptFeedback } from "./attempt-feedback";

export type { PlayerSet, PlayerQuestion };

/**
 * Single-set player for /practice/set/[id], in the exam's own layout.
 *
 * Rendering is <SetBody/>, the same component the paginated session and the
 * mock use. The chrome is <ExamShell/>, shared with section practice and the
 * mock — so a candidate drilling one question type sees the screen they will
 * sit, not a narrower document version of it.
 *
 * Answers are keyed by question uuid here (a set's questions are real rows),
 * while the answer strip along the bottom speaks in EXAM NUMBERS. `sheet` is
 * the mapping between the two.
 */
export function QuestionPlayer({
  set,
  questions,
  paperTitle,
  exitHref,
}: {
  set: PlayerSet;
  questions: PlayerQuestion[];
  /** "Reading · Matching headings" for the header. */
  paperTitle?: string;
  /** Where the header's way out leads — the exam covers the app's own nav. */
  exitHref?: string;
}) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PracticeResult | null>(null);
  /** Set when the plan refused the submit. The answers stay on screen. */
  const [blocked, setBlocked] = useState<PlanBlock | null>(null);
  const [current, setCurrent] = useState<number | null>(null);

  const handleAnswer = useCallback((qid: string, value: Answer) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }, []);

  const handleClear = useCallback((qid: string) => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[qid];
      return next;
    });
  }, []);

  /**
   * Every number on the answer sheet and the question it belongs to. A set's
   * questions are one mark each and numbered from the set's start, so this is a
   * straight run — unlike a section, where a paired "Choose TWO letters" puts
   * two squares on one input.
   */
  const sheet = useMemo(() => {
    const numbers: number[] = [];
    const idOf = new Map<number, string>();
    questions.forEach((q, i) => {
      const n = set.startNumber + i;
      numbers.push(n);
      idOf.set(n, q.id);
    });
    return { numbers, idOf };
  }, [questions, set.startNumber]);

  const answered = useMemo(() => {
    const done = new Set<number>();
    for (const n of sheet.numbers) {
      const id = sheet.idOf.get(n);
      if (id && isAnswered(answers[id])) done.add(n);
    }
    return done;
  }, [answers, sheet]);

  const jumpTo = useCallback((n: number) => {
    setCurrent(n);
    // SetBody anchors its rows as `mq-{n}`.
    const el = document.getElementById(`mq-${n}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.querySelector<HTMLElement>("input, textarea, button")?.focus({ preventScroll: true });
  }, []);

  const step = useCallback(
    (delta: number) => {
      const list = sheet.numbers;
      if (!list.length) return;
      const at = current === null ? -1 : list.indexOf(current);
      const next = Math.min(list.length - 1, Math.max(0, (at === -1 ? 0 : at) + delta));
      jumpTo(list[next]);
    },
    [current, jumpTo, sheet.numbers],
  );

  const onSubmit = async () => {
    setPending(true);
    setBlocked(null);
    try {
      const res = await submitPractice(set.id, answers);
      // A plan limit is not a failure: nothing is graded, nothing is cleared,
      // and the candidate keeps every answer they typed.
      if (isPlanBlock(res)) {
        setBlocked(res);
        return;
      }
      setResult(res);
      setCurrent(null);
      // Nothing to kick off: submitPractice schedules AI scoring server-side
      // after the response, so it no longer needs this tab to stay open.
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setResult(null);
    setBlocked(null);
    setAnswers({});
    setCurrent(null);
  };

  // Submitting while a recording is still uploading would store it with no
  // audio, so it could never be scored.
  const savingRecording = anyUploadPending(answers);

  // Writing and Speaking are scored by band, so the AI report is the result —
  // there are no marks to show and nothing to re-read in the question layout.
  const aiScored = isAiScored(set.section);

  const scoreCard = result ? (
    aiScored ? (
      // No footer: the exam shell already carries "Try again" and "Exit", so
      // repeating them inside the report would give two of each.
      <AttemptFeedback attemptId={result.attemptId} section={set.section} />
    ) : (
      <ScoreCard result={result} onRetry={reset} />
    )
  ) : null;

  const questionBlocks = aiScored && result ? null : (
    <SetBody
      set={set}
      questions={questions}
      answers={answers}
      results={result?.results ?? null}
      onAnswer={handleAnswer}
      onClearAnswer={handleClear}
      slot="questions"
      exam
    />
  );

  const twoPane = hasSideStimulus(set.section, set);

  const stimulus = (
    <SetBody
      set={set}
      questions={questions}
      answers={answers}
      results={null}
      onAnswer={handleAnswer}
      slot="stimulus"
      exam
    />
  );

  const body = twoPane ? (
    <SplitPane
      className="h-full"
      storageKey={`exam-split-${set.section}`}
      left={<div className="p-4 sm:p-5">{stimulus}</div>}
      right={
        <div className="space-y-4 p-4 sm:p-5">
          {scoreCard}
          {questionBlocks}
        </div>
      }
    />
  ) : (
    <div className="h-full overflow-y-auto">
      <div
        className={cn(
          "space-y-4 p-4 sm:p-5",
          set.section === "speaking" && "mx-auto max-w-2xl",
        )}
      >
        {stimulus}
        {scoreCard}
        {questionBlocks}
      </div>
    </div>
  );

  const sec = SECTIONS[set.section];
  const meta = QUESTION_TYPES[set.questionType];
  const parts: StripPart[] = [
    { id: set.id, label: meta?.label ?? sec.label, numbers: sheet.numbers },
  ];

  /**
   * The shell owns the instruction band here: asking a slot for questions
   * returns the rows alone, without the bar above them. For Writing this is the
   * task prompt itself; for everything else the instruction line.
   */
  const instruction = taskHeading(set, questions);

  const lastIndex = sheet.numbers.length - 1;
  const at = current === null ? -1 : sheet.numbers.indexOf(current);

  return (
    <ExamShell
      title={paperTitle ?? set.title}
      partLabel={meta?.label ?? sec.label}
      instruction={instruction}
      badges={
        <>
          <span className={cn("chip", `chip-${sec.accent}`)}>{sec.label}</span>
          {sheet.numbers.length > 0 && (
            <span className="chip">
              Q{sheet.numbers[0]}-{sheet.numbers[lastIndex]}
            </span>
          )}
        </>
      }
      onClearAll={result ? undefined : () => setAnswers({})}
      // Empty boxes left behind by a cleared gap are not answers, so the
      // button greys out in step with the counter on the answer strip.
      clearDisabled={!Object.values(answers).some(isAnswered)}
      parts={parts}
      activePartId={set.id}
      answered={answered}
      current={current}
      onJump={(n) => jumpTo(n)}
      onPrev={() => step(-1)}
      onNext={() => step(1)}
      canPrev={current === null || at > 0}
      canNext={current === null || at < lastIndex}
      onSubmit={result ? reset : onSubmit}
      submitting={pending || savingRecording}
      submitLabel={result ? "Try again" : savingRecording ? "Saving recording…" : "Submit"}
      menu={
        exitHref ? (
          <Link
            href={exitHref}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand/50 hover:text-ink"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">Exit</span>
          </Link>
        ) : null
      }
      footerNote={
        result
          ? result.total > 0
            ? `${result.correct} / ${result.total} correct`
            : `${result.subjective} response${result.subjective === 1 ? "" : "s"} sent for scoring`
          : `${answered.size} / ${sheet.numbers.length} answered`
      }
    >
      {body}
      {/* Over the paper, not in place of it: the answers stay visible behind. */}
      <PlanBlockDialog block={blocked} onClose={() => setBlocked(null)} />
    </ExamShell>
  );
}

function ScoreCard({ result, onRetry }: { result: PracticeResult; onRetry: () => void }) {
  const pct = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;
  const tone = pct >= 75 ? "success" : pct >= 50 ? "warning" : "danger";

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-paper-elev shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "grid size-14 shrink-0 place-items-center rounded-xl",
              tone === "success" && "bg-success-soft text-success",
              tone === "warning" && "bg-warning-soft text-warning",
              tone === "danger" && "bg-danger-soft text-danger",
            )}
          >
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <p className="display text-2xl">
              {result.total > 0 ? `${result.correct} / ${result.total}` : "Submitted"}
            </p>
            <p className="text-sm text-ink-muted">
              {result.total > 0 ? `${pct}% correct` : "Sent for AI band scoring"}
              {result.subjective > 0 &&
                ` · ${result.subjective} response${result.subjective > 1 ? "s" : ""} sent for AI band scoring`}
            </p>
          </div>
        </div>

        <Button variant="outline" onClick={onRetry}>
          <RotateCcw className="size-4" /> Try again
        </Button>
      </div>

      <div className="flex items-center gap-2 border-t border-line bg-paper-sunken px-5 py-2.5 text-xs text-ink-muted">
        <Target className="size-3.5" />
        Correct answers and explanations are shown against each question.
      </div>
    </div>
  );
}
