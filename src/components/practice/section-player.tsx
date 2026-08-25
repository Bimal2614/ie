"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, RotateCcw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { anyUploadPending, type Answer } from "@/lib/question-content";
import { hasSideStimulus, isAiScored, rawToBand, SECTIONS, type SectionKey } from "@/lib/ielts";
import {
  submitSectionPractice,
  type SectionPracticeResult,
} from "@/app/actions/section-practice";
import { ExamShell, type StripPart } from "@/components/exam/exam-shell";
import { SplitPane } from "@/components/exam/split-pane";
import { SectionBody, type ClientSectionView } from "./section-body";
import { AttemptFeedback } from "./attempt-feedback";

/**
 * Player for one `practice_sections` row, in the exam's own layout.
 *
 * Answers are keyed by EXAM NUMBER rather than a question uuid — items live in
 * the section's jsonb and have no row of their own, so the number on the answer
 * sheet is their identity all the way from the input to `user_responses`.
 *
 * The chrome (timer, navigation, answer strip) is <ExamShell/>, shared with the
 * mock test. What changes per section is only which panes the body gets:
 *
 *   reading   passage  | questions      (draggable divider)
 *   writing   the chart | prompt + editor, when there is a chart
 *   listening recording on top, questions full width beneath
 *   speaking  one narrow column, the way the interview is actually sat
 */
export function SectionPlayer({
  section,
  paperTitle,
  exitHref,
}: {
  section: ClientSectionView;
  /** "Cambridge 19 · Test 2 · Reading" for the header. */
  paperTitle?: string;
  /** Where the header's way out leads — the exam covers the app's own nav. */
  exitHref?: string;
}) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SectionPracticeResult | null>(null);
  const [current, setCurrent] = useState<number | null>(null);

  const handleAnswer = useCallback((n: number, value: Answer) => {
    setAnswers((prev) => ({ ...prev, [String(n)]: value }));
  }, []);

  const handleClear = useCallback((n: number) => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[String(n)];
      return next;
    });
  }, []);

  /**
   * Every number on the answer sheet, and the input each one belongs to.
   *
   * A paired "Choose TWO letters" prints as 23 AND 24 on the sheet but is a
   * single input anchored at 23, so both squares have to lead back to it.
   */
  const sheet = useMemo(() => {
    const numbers: number[] = [];
    const anchorOf = new Map<number, number>();
    for (const group of section.questions.groups) {
      for (const item of group.items) {
        for (let k = 0; k < (item.marks ?? 1); k++) {
          numbers.push(item.n + k);
          anchorOf.set(item.n + k, item.n);
        }
      }
    }
    return { numbers, anchorOf };
  }, [section]);

  /** A sheet number counts as answered when its input has a value. */
  const answered = useMemo(() => {
    const done = new Set<number>();
    for (const n of sheet.numbers) {
      if (answers[String(sheet.anchorOf.get(n))] !== undefined) done.add(n);
    }
    return done;
  }, [answers, sheet]);

  const jumpTo = useCallback(
    (n: number) => {
      setCurrent(n);
      const anchor = sheet.anchorOf.get(n) ?? n;
      const el =
        document.getElementById(`mq-${anchor}`) ?? document.getElementById(`sq-${anchor}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.querySelector<HTMLElement>("input, textarea, button")?.focus({ preventScroll: true });
    },
    [sheet],
  );

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
    try {
      setResult(await submitSectionPractice(section.id, answers));
      setCurrent(null);
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setResult(null);
    setAnswers({});
    setCurrent(null);
  };

  // A part is 10 of the paper's 40 marks, so a band off this alone would be an
  // invention — the indicative band is only shown for a full 40-mark section.
  const band = useMemo(() => {
    if (!result || result.total < 40) return null;
    if (section.sectionType !== "listening" && section.sectionType !== "reading") return null;
    return rawToBand(section.sectionType, result.correct);
  }, [result, section.sectionType]);

  // Speaking is an interview, so exactly one question is on screen and the
  // shell's Previous/Next moves between them. Leaving a question unmounts its
  // recorder, which stops and uploads the take — so Next saves the answer.
  const oneAtATime = section.sectionType === "speaking";
  const focus = oneAtATime ? (current ?? sheet.numbers[0] ?? null) : null;
  const focusIndex = focus === null ? -1 : sheet.numbers.indexOf(focus);

  const sec = SECTIONS[section.sectionType as SectionKey];
  const parts: StripPart[] = [
    {
      id: section.id,
      label: section.partNumber ? `Part ${section.partNumber}` : sec.label,
      numbers: sheet.numbers,
    },
  ];

  // A recording still uploading would be submitted with no audio to score.
  const savingRecording = anyUploadPending(answers);

  // Writing and Speaking are scored by band, not by right/wrong, so a marks
  // card has nothing to report for them — the AI report is the result.
  const aiScored = isAiScored(section.sectionType);

  const scoreCard = result ? (
    aiScored ? (
      // No footer: the exam shell already carries "Try again" and "Exit", so
      // repeating them inside the report would give two of each.
      <AttemptFeedback attemptId={result.attemptId} section={section.sectionType as SectionKey} />
    ) : (
      <ScoreCard result={result} band={band} onRetry={reset} />
    )
  ) : null;

  const questions = aiScored && result ? null : (
    <SectionBody
      section={section}
      answers={answers}
      results={result?.results ?? null}
      onAnswer={handleAnswer}
      onClearAnswer={handleClear}
      slot="questions"
      // Once graded, the whole interview is shown so every answer can be
      // reviewed together.
      focusNumber={result ? null : focus}
      // The band above the panes is this group's header. A part that mixes
      // task types keeps a header per group to tell them apart.
      groupHeaders={section.questions.groups.length > 1}
    />
  );

  const twoPane = hasSideStimulus(section.sectionType, section);

  const body = twoPane ? (
    <SplitPane
      className="h-full"
      storageKey={`exam-split-${section.sectionType}`}
      left={
        <div className="p-4 sm:p-5">
          <SectionBody
            section={section}
            answers={answers}
            results={null}
            onAnswer={handleAnswer}
            slot="stimulus"
          />
        </div>
      }
      right={
        <div className="space-y-4 p-4 sm:p-5">
          {scoreCard}
          {questions}
        </div>
      }
    />
  ) : (
    <div className="h-full overflow-y-auto">
      <div
        className={cn(
          "space-y-4 p-4 sm:p-5",
          section.sectionType === "speaking" && "mx-auto max-w-2xl",
        )}
      >
        <SectionBody
          section={section}
          answers={answers}
          results={null}
          onAnswer={handleAnswer}
          slot="stimulus"
        />
        {scoreCard}
        {questions}
      </div>
    </div>
  );

  return (
    <ExamShell
      title={paperTitle ?? section.title}
      partLabel={section.partNumber ? `Part ${section.partNumber}` : sec.label}
      instruction={section.instructions}
      badges={
        <>
          <span className={cn("chip", `chip-${sec.accent}`)}>{sec.label}</span>
          <span className="chip">
            Q{section.startNumber}-{section.endNumber}
          </span>
        </>
      }
      parts={parts}
      activePartId={section.id}
      answered={answered}
      current={current}
      onJump={(n) => jumpTo(n)}
      onPrev={() => step(-1)}
      onNext={() => step(1)}
      canPrev={oneAtATime ? focusIndex > 0 : current === null || sheet.numbers.indexOf(current) > 0}
      canNext={
        oneAtATime
          ? focusIndex < sheet.numbers.length - 1
          : current === null || sheet.numbers.indexOf(current) < sheet.numbers.length - 1
      }
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
          : oneAtATime && focusIndex >= 0
            ? `Question ${focusIndex + 1} of ${sheet.numbers.length} · ${answered.size} recorded`
            : `${answered.size} / ${sheet.numbers.length} answered`
      }
    >
      {body}
    </ExamShell>
  );
}

function ScoreCard({
  result,
  band,
  onRetry,
}: {
  result: SectionPracticeResult;
  band: number | null;
  onRetry: () => void;
}) {
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

        <div className="flex items-center gap-3">
          {band !== null && (
            <div className="rounded-xl bg-brand-soft px-4 py-2 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">Band</p>
              <p className="display text-2xl text-brand">{band.toFixed(1)}</p>
            </div>
          )}
          <Button variant="outline" onClick={onRetry}>
            <RotateCcw className="size-4" /> Try again
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line bg-paper-sunken px-5 py-2.5 text-xs text-ink-muted">
        <Target className="size-3.5" />
        Correct answers and explanations are shown against each question.
      </div>
    </div>
  );
}
