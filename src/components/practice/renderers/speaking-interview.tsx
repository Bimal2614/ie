"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioStimulus } from "@/components/practice/audio-stimulus";
import { cn } from "@/lib/utils";
import { isAnswered } from "@/lib/question-content";
import type { Answer } from "@/lib/question-content";
import { QuestionInput, type RenderQuestion } from "./question-input";

/**
 * Speaking Parts 1 and 3 — a live interview, one question at a time.
 *
 * The examiner asks; you answer; the next question comes. Showing all seven at
 * once would let a candidate read ahead and rehearse, which is exactly the
 * habit the real test punishes. So only the current question is on screen, and
 * answered ones collapse to a strip you can step back through.
 *
 * THE QUESTION IS HEARD, NOT READ. On test day nothing is printed: the examiner
 * speaks and the candidate answers. `spokenOnly` is the mock, which hides the
 * text and plays the clip — decoding an accent in real time is part of what is
 * being tested, and a mock that prints the question rehearses the wrong skill.
 * Practice and section practice show both, because that is where you look up
 * the word you missed.
 */
export function SpeakingInterview({
  topic,
  questions,
  answers,
  disabled,
  spokenOnly = false,
  onAnswer,
}: {
  topic: string;
  questions: RenderQuestion[];
  answers: Record<string, Answer>;
  disabled: boolean;
  /** Mock: play the question instead of printing it. */
  spokenOnly?: boolean;
  onAnswer: (questionId: string, value: Answer) => void;
}) {
  const [index, setIndex] = useState(0);
  const current = questions[index];
  const answeredCount = questions.filter((q) => isAnswered(answers[q.id])).length;
  const answeredById = (id: string) => isAnswered(answers[id]);
  const atLast = index === questions.length - 1;

  if (!current) return null;

  /**
   * Hiding the text is conditional on there BEING a clip. A question with
   * neither — content still being voiced, or a failed upload — would otherwise
   * be a blank card the candidate cannot answer, which is worse than a mock
   * that prints one question.
   */
  const hideText = spokenOnly && Boolean(current.promptAudioSrc);

  return (
    <div className="space-y-4">
      {/* Topic + progress — Part 1 is organised by topic, like the real interview. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper-elev p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg chip-speaking">
            <MessageCircle className="size-4" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Topic</p>
            <p className="text-sm font-medium text-ink">{topic}</p>
          </div>
        </div>
        <p className="font-mono text-xs tabular-nums text-ink-muted">
          {answeredCount} of {questions.length} answered
        </p>
      </div>

      {/* Question dots — jump around, see what's done. */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, i) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Question ${i + 1}${answeredById(q.id) ? " (answered)" : ""}`}
            aria-current={i === index}
            className={cn(
              "grid size-7 place-items-center rounded-full border font-mono text-[11px] font-semibold tabular-nums transition-colors",
              i === index && "border-brand bg-brand text-white",
              i !== index && answeredById(q.id) && "border-success/40 bg-success-soft text-success",
              i !== index && !answeredById(q.id) && "border-line text-ink-muted hover:bg-paper-sunken",
            )}
          >
            {answeredById(q.id) && i !== index ? <Check className="size-3.5" /> : i + 1}
          </button>
        ))}
      </div>

      {/* The one question on screen */}
      <div className="rounded-xl border border-line bg-paper-elev p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Question {index + 1}
        </p>

        {current.promptAudioSrc ? (
          <ExaminerAudio
            // Remounting per question resets the player and re-arms the single
            // automatic play; one shared element would keep the previous
            // question's progress and its "already played" state.
            key={current.id}
            src={current.promptAudioSrc}
          />
        ) : null}

        {hideText ? (
          <p className="mt-3 text-sm text-ink-muted">
            The examiner asks this question aloud, as in the real test. Play it as many times as
            you need, then record your answer.
          </p>
        ) : (
          <p className="mt-3 text-base font-medium text-ink">{current.prompt}</p>
        )}

        <div className="mt-4">
          <QuestionInput
            question={current}
            value={answers[current.id]}
            disabled={disabled}
            state="idle"
            options={null}
            onChange={(v) => onAnswer(current.id, v)}
          />
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIndex((i) => i - 1)}
            disabled={index === 0}
            className="text-ink-soft"
          >
            <ArrowLeft className="size-4" />
            <span className="ml-1">Previous</span>
          </Button>

          {!atLast ? (
            <Button size="sm" onClick={() => setIndex((i) => i + 1)} className="btn-lift">
              <span className="mr-1">Next question</span>
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <p className="text-xs text-ink-muted">
              Last question: submit below when you&apos;re done.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The examiner asking one question — the listening player, not a second one.
 *
 * AudioStimulus already draws its own controls rather than the browser's, for
 * the reason set out in that file: `<audio controls>` is a download button with
 * a waveform attached. Reusing it means one player to maintain, one set of
 * no-download rules, and a volume the candidate set on a listening part still
 * holding here.
 */
function ExaminerAudio({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement | null>(null);

  /**
   * Ask once, unprompted — that is the examiner speaking without being invited
   * to. Browsers refuse autoplay until the page has been interacted with, so
   * this is best-effort and the player's own button is what guarantees it.
   */
  useEffect(() => {
    ref.current?.play().catch(() => {});
  }, []);

  return <AudioStimulus src={src} audioRef={ref} className="mt-3" />;
}
