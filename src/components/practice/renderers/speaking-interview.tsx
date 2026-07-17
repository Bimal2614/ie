"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Answer } from "@/lib/question-content";
import { QuestionInput, type RenderQuestion } from "./question-input";

/**
 * Speaking Parts 1 and 3 — a live interview, one question at a time.
 *
 * The examiner asks; you answer; the next question comes. Showing all seven at
 * once would let a candidate read ahead and rehearse, which is exactly the
 * habit the real test punishes. So only the current question is on screen, and
 * answered ones collapse to a strip you can step back through.
 */
export function SpeakingInterview({
  topic,
  questions,
  answers,
  disabled,
  onAnswer,
}: {
  topic: string;
  questions: RenderQuestion[];
  answers: Record<string, Answer>;
  disabled: boolean;
  onAnswer: (questionId: string, value: Answer) => void;
}) {
  const [index, setIndex] = useState(0);
  const current = questions[index];
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const isAnswered = (id: string) => answers[id] !== undefined;
  const atLast = index === questions.length - 1;

  if (!current) return null;

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
            aria-label={`Question ${i + 1}${isAnswered(q.id) ? " (answered)" : ""}`}
            aria-current={i === index}
            className={cn(
              "grid size-7 place-items-center rounded-full border font-mono text-[11px] font-semibold tabular-nums transition-colors",
              i === index && "border-brand bg-brand text-white",
              i !== index && isAnswered(q.id) && "border-success/40 bg-success-soft text-success",
              i !== index && !isAnswered(q.id) && "border-line text-ink-muted hover:bg-paper-sunken",
            )}
          >
            {isAnswered(q.id) && i !== index ? <Check className="size-3.5" /> : i + 1}
          </button>
        ))}
      </div>

      {/* The one question on screen */}
      <div className="rounded-xl border border-line bg-paper-elev p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Question {index + 1}
        </p>
        <p className="mt-1.5 text-base font-medium text-ink">{current.prompt}</p>

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
              Last question — submit below when you&apos;re done.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
