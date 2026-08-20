"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { Check, X, Sparkles, Flag, Volume2 } from "lucide-react";
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
import { MatchingBoard } from "./renderers/matching-board";
import { QuestionInput, type RenderQuestion, type QuestionState } from "./renderers/question-input";
import { ReportQuestionButton } from "./report-question";
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
/** The slice of the recording where one question is answered. */
type AudioWindow = { fromFrac: number; toFrac: number; approx?: boolean };

function windowOf(content: Record<string, unknown> | null): AudioWindow | null {
  const a = content?.audio as AudioWindow | undefined;
  return a && typeof a.fromFrac === "number" && typeof a.toFrac === "number" ? a : null;
}

/**
 * Play just the moment that answers one question.
 *
 * The window is stored as a fraction of the transcript, not seconds — the
 * element already knows the real duration, so nothing had to measure or slice
 * the audio. Padding is generous, and doubly so for a window that had to be
 * interpolated, because landing a few seconds late means the answer has already
 * been said.
 */
function useAudioClip(ref: React.RefObject<HTMLAudioElement | null>) {
  const stopAt = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTime = () => {
      if (stopAt.current !== null && el.currentTime >= stopAt.current) {
        el.pause();
        stopAt.current = null;
      }
    };
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [ref]);

  return useCallback(
    (w: AudioWindow) => {
      const el = ref.current;
      if (!el) return;
      const start = () => {
        if (!Number.isFinite(el.duration) || el.duration <= 0) return;
        const lead = w.approx ? 12 : 6;
        const tail = w.approx ? 8 : 4;
        stopAt.current = Math.min(el.duration, w.toFrac * el.duration + tail);
        el.currentTime = Math.max(0, w.fromFrac * el.duration - lead);
        void el.play();
      };
      // `preload="metadata"` usually has the duration already; if the browser
      // has not fetched it yet, wait for it rather than seeking into NaN.
      if (Number.isFinite(el.duration) && el.duration > 0) start();
      else el.addEventListener("loadedmetadata", start, { once: true });
    },
    [ref],
  );
}

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
  onClearAnswer,
  flagged,
  onToggleFlag,
}: {
  set: PlayerSet;
  questions: PlayerQuestion[];
  answers: Record<string, Answer>;
  results: PlayerResult[] | null;
  onAnswer: (questionId: string, value: Answer) => void;
  onClearAnswer?: (questionId: string) => void;
  /** Client-side "mark for review" set + toggle (optional — omitted in mock review). */
  flagged?: Set<string>;
  onToggleFlag?: (questionId: string) => void;
}) {
  const meta = QUESTION_TYPES[set.questionType];
  const sec = SECTIONS[set.section];
  const disabled = results !== null;
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;

  const resultFor = useCallback(
    (id: string) => results?.find((r) => r.questionId === id),
    [results],
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playClip = useAudioClip(audioRef);
  const clipFor = useCallback(
    (q: PlayerQuestion) => (set.audioUrl ? windowOf(q.content) : null),
    [set.audioUrl],
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
      ...(clipFor(hit.q) ? { playClip: () => playClip(clipFor(hit.q)!) } : {}),
    };
    return binding;
  };

  const optionsLayout = set.layout?.kind === "options" ? (set.layout as OptionsLayout) : null;
  // Gap-backed layouts collect every answer inline, so the question list below
  // would just be a duplicate set of inputs.
  const showQuestionRows = !layoutOwnsAnswers(set.layout);
  // Matching answers against a shared option bank, which the exam presents as a
  // drag-and-drop board — never a dropdown. Same component the section-wise
  // player uses, so both routes look like the real test.
  const isMatching = QUESTION_TYPES[set.questionType]?.family === "matching";

  const stimulus = <Stimulus set={set} audioRef={audioRef} />;
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
      {isMatching && optionsLayout ? (
        <MatchingBoard
          layout={optionsLayout}
          items={numbered.map(({ q, number }) => {
            const clip = clipFor(q);
            return {
              id: q.id,
              n: number,
              prompt: q.prompt ?? undefined,
              ...(clip ? { onPlayClip: () => playClip(clip) } : {}),
            };
          })}
          disabled={disabled}
          bindingFor={(id) => {
            const r = resultFor(id);
            return {
              key: answers[id]?.key as string | undefined,
              state: stateFor(r),
              expected: r && r.isCorrect === false ? expectedText(r.correctAnswer) : undefined,
            };
          }}
          onAssign={(id, key) => onAnswer(id, { key })}
        />
      ) : (
        <>
      {set.layout && (
        <SetLayoutRenderer
          layout={set.layout}
          resolve={resolve}
          fallbackImage={set.imageUrl ? `/api/media/${set.id}/image` : null}
        />
      )}

      {showQuestionRows && (
        <div className="space-y-3">
          {!disabled && questions.length > 1 && (
            <div className="flex items-center gap-3 text-sm">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-sunken">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
              </div>
              <span className="shrink-0 tabular-nums text-ink-muted">
                {answeredCount} / {questions.length} answered
                {flagged && flagged.size > 0 && ` · ${flagged.size} flagged`}
              </span>
            </div>
          )}
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
              // Anchor for the mock question palette; scroll-mt clears the
              // sticky exam header. `numberInGap` rows anchor on their gap field.
              <li
                key={q.id}
                id={numberInGap ? undefined : `mq-${number}`}
                data-qnum={number}
                className={cn(
                  "scroll-mt-28 rounded-xl border border-line bg-paper-elev p-4",
                  flagged?.has(q.id) && "ring-1 ring-warning/60",
                )}
              >
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
                    {clipFor(q) && (
                      <button
                        type="button"
                        onClick={() => playClip(clipFor(q)!)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2 py-1 text-xs text-ink-soft transition-colors hover:border-brand/50 hover:text-ink"
                      >
                        <Volume2 className="size-3.5" />
                        Play this part
                      </button>
                    )}
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
                  <div className="flex shrink-0 items-center gap-1">
                    {!disabled && onClearAnswer && answers[q.id] !== undefined && (
                      <button
                        type="button"
                        onClick={() => onClearAnswer(q.id)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-paper-sunken hover:text-ink"
                      >
                        Clear
                      </button>
                    )}
                    {result && state !== "review" && (
                      <span
                        className={cn(
                          "grid size-6 place-items-center rounded-full",
                          state === "correct" ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
                        )}
                        aria-label={state === "correct" ? "Correct" : "Incorrect"}
                      >
                        {state === "correct" ? <Check className="size-4" /> : <X className="size-4" />}
                      </span>
                    )}
                    {onToggleFlag && (
                      <button
                        type="button"
                        onClick={() => onToggleFlag(q.id)}
                        title={flagged?.has(q.id) ? "Unflag" : "Flag for review"}
                        aria-label="Flag for review"
                        aria-pressed={flagged?.has(q.id) ?? false}
                        className="grid size-7 place-items-center rounded-md text-ink-muted transition-colors hover:bg-paper-sunken hover:text-ink"
                      >
                        <Flag className={cn("size-4", flagged?.has(q.id) && "fill-warning text-warning")} />
                      </button>
                    )}
                    <ReportQuestionButton questionId={q.id} />
                  </div>
                </div>
              </li>
            );
          })}
          </ol>
        </div>
      )}
        </>
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
function Stimulus({ set, audioRef }: { set: PlayerSet; audioRef: React.RefObject<HTMLAudioElement | null> }) {
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
          {/* Auth-gated route → short-lived presigned S3 URL; bucket never exposed. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio ref={audioRef} controls preload="metadata" src={`/api/media/${set.id}`} className="w-full" />
        </div>
      )}
      {hasImage && (
        <div className="overflow-hidden rounded-lg border border-line">
          <Image
            // Same auth-gated indirection as the audio: the stored value is a
            // private s3:// object, which no <img> can load directly.
            src={`/api/media/${set.id}/image`}
            alt={set.title}
            width={1000}
            height={640}
            className="h-auto w-full object-contain"
            unoptimized
          />
        </div>
      )}
      {set.passageText && (
        // Copy-protected: auth-gated practice content only (never on indexed pages).
        <article
          className="select-none whitespace-pre-line text-sm leading-relaxed text-ink-soft"
          onCopy={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {set.passageText}
        </article>
      )}
    </div>
  );
}
