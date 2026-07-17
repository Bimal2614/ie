"use client";

import { useCallback } from "react";
import Image from "next/image";
import { Check, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  QUESTION_TYPES,
  SECTIONS,
  type SectionKey,
  type QuestionTypeKey,
  type QuestionTypeMeta,
  type SectionMeta,
} from "@/lib/ielts";
import type { Answer, SetLayout, OptionsLayout, CorrectAnswer } from "@/lib/question-content";
import { SetLayoutRenderer, layoutOwnsAnswers } from "./renderers/layouts";
import { QuestionInput, type RenderQuestion, type QuestionState } from "./renderers/question-input";
import { SpeakingInterview } from "./renderers/speaking-interview";
import type { GapBinding, GapResolver } from "./renderers/gap-field";

export type PlayerSet = {
  id: string;
  title: string;
  instructions: string | null;
  section: SectionKey;
  questionType: QuestionTypeKey;
  passageText: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  layout: SetLayout | null;
  startNumber: number;
};

export type PlayerQuestion = {
  id: string;
  questionType: QuestionTypeKey;
  prompt: string | null;
  content: Record<string, unknown> | null;
  wordLimitMin: number | null;
  prepSeconds: number | null;
  speakSeconds: number | null;
};

export type PlayerResult = {
  questionId: string;
  isCorrect: boolean | null;
  correctAnswer: unknown;
  explanation: string | null;
};

/** First accepted variant, for showing what the answer should have been. */
function expectedText(ca: unknown): string | undefined {
  const a = ca as CorrectAnswer | null;
  if (!a) return undefined;
  if ("any" in a) return a.any[0];
  if ("value" in a) return a.value;
  if ("key" in a) return a.key;
  if ("index" in a) return String.fromCharCode(65 + a.index);
  if ("indices" in a) return a.indices.map((i) => String.fromCharCode(65 + i)).join(", ");
  return undefined;
}

function stateFor(result: PlayerResult | undefined): QuestionState {
  if (!result) return "idle";
  if (result.isCorrect === null) return "review";
  return result.isCorrect ? "correct" : "incorrect";
}

export function SetBody({
  set,
  questions,
  answers,
  results,
  onAnswer,
}: {
  set: PlayerSet;
  questions: PlayerQuestion[];
  answers: Record<string, Answer>;
  results: PlayerResult[] | null;
  onAnswer: (questionId: string, value: Answer) => void;
}) {
  const meta = QUESTION_TYPES[set.questionType];
  const sec = SECTIONS[set.section];
  const disabled = results !== null;

  const resultFor = useCallback(
    (id: string) => results?.find((r) => r.questionId === id),
    [results],
  );

  // Exam numbering: the set says where its questions start, so passage 2 opens
  // at 14 exactly as the paper does.
  const numbered = questions.map((q, i) => ({ q, number: set.startNumber + i }));

  /** Gaps in the layout resolve to the question holding that exam number. */
  const resolve: GapResolver = (number) => {
    const hit = numbered.find((n) => n.number === number);
    if (!hit) return null;
    const result = resultFor(hit.q.id);
    const binding: GapBinding = {
      questionId: hit.q.id,
      number,
      value: (answers[hit.q.id]?.text as string) ?? "",
      disabled,
      state: stateFor(result),
      expected: result && result.isCorrect === false ? expectedText(result.correctAnswer) : undefined,
      onChange: (text) => onAnswer(hit.q.id, { text }),
    };
    return binding;
  };

  const optionsLayout = set.layout?.kind === "options" ? (set.layout as OptionsLayout) : null;
  // Gap-backed layouts collect every answer inline, so the question list below
  // would just be a duplicate set of inputs.
  const showQuestionRows = !layoutOwnsAnswers(set.layout);

  const stimulus = <Stimulus set={set} />;
  const isSplit = set.section === "reading" && !!set.passageText;

  // Speaking Parts 1 & 3 are an interview: one question at a time, by topic.
  const renderQuestions: RenderQuestion[] = numbered.map(({ q, number }) => ({
    id: q.id,
    number,
    questionType: q.questionType,
    prompt: q.prompt,
    content: q.content,
    wordLimitMin: q.wordLimitMin,
    prepSeconds: q.prepSeconds,
    speakSeconds: q.speakSeconds,
  }));

  if (meta.presentation === "sequential") {
    return (
      <div className="space-y-5">
        <InstructionBar set={set} meta={meta} sec={sec} />
        <SpeakingInterview
          topic={set.title}
          questions={renderQuestions}
          answers={answers}
          disabled={disabled}
          onAnswer={onAnswer}
        />
      </div>
    );
  }

  const body = (
    <div className="space-y-5">
      {set.layout && (
        <SetLayoutRenderer layout={set.layout} resolve={resolve} fallbackImage={set.imageUrl} />
      )}

      {showQuestionRows && (
        <ol className="space-y-4">
          {numbered.map(({ q, number }) => {
            const result = resultFor(q.id);
            const state = stateFor(result);
            const rq: RenderQuestion = {
              id: q.id,
              number,
              questionType: q.questionType,
              prompt: q.prompt,
              content: q.content,
              wordLimitMin: q.wordLimitMin,
              prepSeconds: q.prepSeconds,
              speakSeconds: q.speakSeconds,
            };
            const qMeta = QUESTION_TYPES[q.questionType];
            // Short answer prints its number inside the gap field itself.
            const numberInGap = qMeta.family === "completion";

            return (
              <li key={q.id} className="rounded-xl border border-line bg-paper-elev p-4">
                <div className="flex items-start gap-3">
                  {!numberInGap && (
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold tabular-nums",
                        state === "idle" && "bg-brand-soft text-brand",
                        state === "correct" && "bg-success text-white",
                        state === "incorrect" && "bg-danger text-white",
                        state === "review" && "bg-info text-white",
                      )}
                    >
                      {number}
                    </span>
                  )}
                  <div className="min-w-0 flex-1 space-y-3">
                    {q.prompt && <p className="text-sm font-medium text-ink">{q.prompt}</p>}
                    <QuestionInput
                      question={rq}
                      value={answers[q.id]}
                      disabled={disabled}
                      state={state}
                      options={optionsLayout}
                      onChange={(v) => onAnswer(q.id, v)}
                    />
                    {result && <ResultNote result={result} />}
                  </div>
                  {result && state !== "review" && (
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full",
                        state === "correct" ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
                      )}
                      aria-label={state === "correct" ? "Correct" : "Incorrect"}
                    >
                      {state === "correct" ? <Check className="size-4" /> : <X className="size-4" />}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <InstructionBar set={set} meta={meta} sec={sec} />

      {isSplit ? (
        // The real test puts the passage beside the questions, each scrolling
        // on its own. Stacks on narrow screens.
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            {stimulus}
          </div>
          <div>{body}</div>
        </div>
      ) : (
        <>
          {stimulus}
          {body}
        </>
      )}
    </div>
  );
}

/**
 * The instruction line — verbatim exam wording, in the section's colour.
 *
 * Deliberately does NOT repeat "Section · Type": every caller already shows it
 * in its own chrome (the session top bar, the set page's heading), so printing
 * it here put the same line on screen twice.
 */
function InstructionBar({
  set,
  meta,
  sec,
}: {
  set: PlayerSet;
  meta: QuestionTypeMeta;
  sec: SectionMeta;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-paper-elev p-4">
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", `chip-${sec.accent}`)}>
        <Sparkles className="size-4" />
      </span>
      <p className="min-w-0 text-sm text-ink-strong">{set.instructions ?? meta.instruction}</p>
    </div>
  );
}

function ResultNote({ result }: { result: PlayerResult }) {
  if (result.isCorrect === null) {
    return (
      <p className="rounded-lg bg-info-soft px-3 py-2 text-xs text-ink-soft">
        Submitted for AI band scoring.
      </p>
    );
  }
  const expected = expectedText(result.correctAnswer);
  return (
    <div className="space-y-1">
      {result.isCorrect === false && expected && (
        <p className="text-xs text-ink-soft">
          Correct answer: <span className="font-medium text-success">{expected}</span>
        </p>
      )}
      {result.explanation && <p className="text-xs text-ink-muted">{result.explanation}</p>}
    </div>
  );
}

/** Passage / audio / image — the one stimulus the whole set shares. */
function Stimulus({ set }: { set: PlayerSet }) {
  // A diagram layout renders the image itself, with pins on it.
  const imageOwnedByLayout = set.layout?.kind === "diagram";
  const hasImage = set.imageUrl && !imageOwnedByLayout;
  if (!set.audioUrl && !hasImage && !set.passageText) return null;

  return (
    <div className="space-y-4 rounded-xl border border-line bg-paper-elev p-5">
      {set.audioUrl && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Audio — plays once in the real test
          </p>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls preload="none" src={set.audioUrl} className="w-full" />
        </div>
      )}
      {hasImage && (
        <div className="overflow-hidden rounded-lg border border-line">
          <Image
            src={set.imageUrl!}
            alt={set.title}
            width={1000}
            height={640}
            className="h-auto w-full object-contain"
            unoptimized
          />
        </div>
      )}
      {set.passageText && (
        <article className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
          {set.passageText}
        </article>
      )}
    </div>
  );
}
