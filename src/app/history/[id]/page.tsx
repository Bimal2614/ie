import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, X, Clock } from "lucide-react";
import { getAttemptDetail, type AttemptDetail } from "@/app/actions/history";
import { QUESTION_TYPES, SECTIONS } from "@/lib/ielts";
import type { Answer } from "@/lib/question-content";
import type { PlayerSet, PlayerQuestion, PlayerResult } from "@/components/practice/set-body";
import { AttemptReview } from "@/components/history/attempt-review";
import { AttemptAnswers } from "@/components/history/attempt-answers";
import { LocalTime, HistoryDayLink } from "@/components/history/local-time";

export const metadata: Metadata = { title: "Attempt · IELTSAce", robots: { index: false } };

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getAttemptDetail(id);
  if (!a) notFound();

  const sec = SECTIONS[a.section];
  const meta = QUESTION_TYPES[a.questionType];

  // Writing and speaking are read back as prose and audio — a disabled textarea
  // or a dead record button would be a worse review than the response itself.
  // Everything else is reviewed in its real layout.
  const proseReview = meta.family === "writing" || meta.family === "speaking";
  // Deleted questions leave nothing to re-render in the layout.
  const canReplay = a.set !== null && a.items.every((i) => i.questionId && i.question);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <HistoryDayLink
        iso={a.createdAt.toISOString()}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> History
      </HistoryDayLink>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="display text-xl">{meta.label}</h1>
        <span className={`chip chip-${sec.accent}`}>{sec.label}</span>
        {a.set?.title && <span className="chip">{a.set.title}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-paper-elev p-4">
        <AttemptScore correct={a.correct} graded={a.graded} items={a.items.length} />
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-ink-muted">
            Attempted{" "}
            <span className="font-medium text-ink-soft">
              <LocalTime value={a.createdAt.toISOString()} />
            </span>
          </span>
          {a.timeSpentSec !== null && (
            <span className="inline-flex items-center gap-1.5 text-ink-muted">
              <Clock className="size-3.5" />
              <span className="font-mono tabular-nums text-ink-soft">{a.timeSpentSec}s</span>
            </span>
          )}
        </div>
      </div>

      {!proseReview && canReplay ? (
        /* The passage/audio, the heading list or table, and every answer in
           place — the same screen it was answered on, with the marks filled in. */
        <AttemptReview {...toPlayerProps(a)} />
      ) : (
        <ProseReview attempt={a} />
      )}
    </div>
  );
}

/** Rebuild the practice player's inputs from the stored attempt. */
function toPlayerProps(a: AttemptDetail): {
  set: PlayerSet;
  questions: PlayerQuestion[];
  answers: Record<string, Answer>;
  results: PlayerResult[];
} {
  const s = a.set!;
  const questions: PlayerQuestion[] = a.items.map((i) => ({
    id: i.questionId!,
    questionType: a.questionType,
    prompt: i.question!.prompt,
    content: i.question!.content as Record<string, unknown> | null,
    wordLimitMin: i.question!.wordLimitMin,
    prepSeconds: i.question!.prepSeconds,
    speakSeconds: i.question!.speakSeconds,
  }));

  const answers: Record<string, Answer> = {};
  for (const i of a.items) {
    if (i.questionId) answers[i.questionId] = (i.response ?? {}) as Answer;
  }

  const results: PlayerResult[] = a.items.map((i) => ({
    questionId: i.questionId!,
    isCorrect: i.isCorrect,
    correctAnswer: i.question!.correctAnswer,
    explanation: i.question!.explanation,
  }));

  return {
    set: {
      id: s.id,
      title: s.title,
      instructions: s.instructions,
      section: a.section,
      questionType: a.questionType,
      passageText: s.passageText,
      audioUrl: s.audioUrl,
      imageUrl: s.imageUrl,
      layout: s.layout,
      startNumber: s.startNumber,
    },
    questions,
    answers,
    results,
  };
}

/** Writing/speaking, or an attempt whose questions were deleted. */
function ProseReview({ attempt: a }: { attempt: AttemptDetail }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      {a.set?.instructions && (
        <p className="rounded-xl border border-line bg-paper-elev p-4 text-sm text-ink-strong">
          {a.set.instructions}
        </p>
      )}

      <ol className="space-y-5">
        {a.items.map((item) => (
          <li key={item.responseId} className="space-y-3 rounded-xl border border-line p-4">
            <div className="flex items-start gap-3">
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold tabular-nums ${
                  item.isCorrect === null
                    ? "bg-info text-white"
                    : item.isCorrect
                      ? "bg-success text-white"
                      : "bg-danger text-white"
                }`}
              >
                {item.number ?? "?"}
              </span>
              <div className="min-w-0 flex-1">
                {item.question === null ? (
                  // questionId is set null when content is deleted — the answer
                  // and its mark survive.
                  <p className="text-sm italic text-ink-muted">
                    This question has since been removed; your answer is kept below.
                  </p>
                ) : (
                  item.question.prompt && (
                    <p className="text-sm font-medium text-ink">{item.question.prompt}</p>
                  )
                )}
              </div>
            </div>

            <AttemptAnswers
              questionType={a.questionType}
              content={item.question?.content ?? null}
              correctAnswer={item.question?.correctAnswer ?? null}
              response={item.response}
              layout={a.set?.layout ?? null}
              gapNumber={item.number}
              isCorrect={item.isCorrect}
              transcript={item.transcript}
              audioUrl={item.audioUrl}
              aiFeedback={item.aiFeedback}
            />

            {item.question?.explanation && (
              <div className="rounded-lg bg-paper-sunken p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Explanation
                </p>
                <p className="mt-1 text-sm text-ink-soft">{item.question.explanation}</p>
              </div>
            )}
          </li>
        ))}
      </ol>

      {a.set?.passageText && (
        <details className="rounded-xl border border-line bg-paper-elev p-4">
          <summary className="cursor-pointer text-sm font-medium text-ink-soft">
            Show the passage
          </summary>
          <article className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
            {a.set.passageText}
          </article>
        </details>
      )}
    </div>
  );
}

function AttemptScore({
  correct,
  graded,
  items,
}: {
  correct: number;
  graded: number;
  items: number;
}) {
  if (graded === 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg bg-info-soft px-3 py-1.5 text-sm font-semibold text-info">
        {items} response{items !== 1 ? "s" : ""} awaiting AI band score
      </span>
    );
  }
  const all = correct === graded;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${
        all ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
      }`}
    >
      {all ? <Check className="size-4" /> : <X className="size-4" />}
      <span className="tabular-nums">
        {correct} / {graded} correct
      </span>
    </span>
  );
}
