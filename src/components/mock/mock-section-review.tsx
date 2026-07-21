"use client";

import { useState } from "react";
import { ChevronRight, Check, X, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUESTION_TYPES, type SectionKey } from "@/lib/ielts";
import type { SetLayout } from "@/lib/question-content";
import { getMockSectionReview, type MockSectionReview, type MockReviewItem } from "@/app/actions/mock";
import { AttemptAnswers } from "@/components/history/attempt-answers";

/**
 * The results drill-down: a section band that expands to its questions, each of
 * which expands to the full question, the candidate's answer, the correct
 * answer and the verdict. Data loads only when a section is opened — the report
 * itself stays light. Layout-aware rendering (tables, gap summaries) is reused
 * from the history review path.
 */
export function MockSectionReviewBlock({
  sessionId,
  section,
  label,
  accent,
  band,
  pending,
}: {
  sessionId: string;
  section: SectionKey;
  label: string;
  accent: string;
  band: string | null;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<MockSectionReview | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && data === null && !loading) {
      setLoading(true);
      getMockSectionReview(sessionId, section)
        .then(setData)
        .finally(() => setLoading(false));
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-paper-elev">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-paper-sunken"
      >
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", `chip-${accent}`)}>
          <span className="text-xs font-bold">{label[0]}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{label}</span>
          <span className="block text-xs text-ink-muted">
            {pending ? "Awaiting AI band score" : "Tap to review each question"}
          </span>
        </span>
        <span className="display shrink-0 text-xl tabular-nums text-ink">
          {band ?? <span className="text-sm text-ink-muted">—</span>}
        </span>
        <ChevronRight className={cn("size-4 shrink-0 text-ink-muted transition-transform", open && "rotate-90")} />
      </button>

      {open && (
        <div className="border-t border-line">
          {loading && (
            <p className="flex items-center gap-2 px-4 py-3 text-xs text-ink-muted">
              <Loader2 className="size-3.5 animate-spin" /> Loading…
            </p>
          )}
          {data?.items.length === 0 && !loading && (
            <p className="px-4 py-3 text-xs text-ink-muted">No answers recorded for this section.</p>
          )}
          {data?.items.map((item) => (
            <QuestionRow
              key={item.questionId}
              item={item}
              questionType={data.questionType}
              layout={data.set?.layout ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionRow({
  item,
  questionType,
  layout,
}: {
  item: MockReviewItem;
  questionType: MockSectionReview["questionType"];
  layout: SetLayout | null;
}) {
  const [open, setOpen] = useState(false);
  const meta = QUESTION_TYPES[questionType];
  const objective = item.isCorrect !== null;

  return (
    <div className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 py-2.5 pl-5 pr-4 text-left hover:bg-paper-sunken"
      >
        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full font-mono text-[10px] font-semibold tabular-nums",
            !objective ? "bg-info text-white" : item.isCorrect ? "bg-success text-white" : "bg-danger text-white",
          )}
        >
          {item.number}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
          {item.prompt ?? meta.label}
        </span>
        {item.timeSpentSec !== null && (
          <span className="hidden items-center gap-1 text-[11px] text-ink-muted sm:inline-flex">
            <Clock className="size-3" /> {item.timeSpentSec}s
          </span>
        )}
        {objective ? (
          <span
            className={cn(
              "grid size-5 shrink-0 place-items-center rounded-full",
              item.isCorrect ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
            )}
          >
            {item.isCorrect ? <Check className="size-3" /> : <X className="size-3" />}
          </span>
        ) : (
          <span className="shrink-0 rounded bg-info-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold text-info">
            {item.band ? `Band ${item.band}` : "AI"}
          </span>
        )}
        <ChevronRight className={cn("size-3.5 shrink-0 text-ink-muted transition-transform", open && "rotate-90")} />
      </button>

      {open && (
        <div className="space-y-3 bg-paper-sunken/40 px-5 pb-4 pt-1">
          <AttemptAnswers
            questionType={questionType}
            content={item.content}
            correctAnswer={item.correctAnswer}
            response={item.response}
            layout={layout}
            gapNumber={item.number}
            isCorrect={item.isCorrect}
            transcript={null}
            audioUrl={null}
            aiFeedback={item.aiFeedback}
          />
          {item.explanation && (
            <div className="rounded-lg bg-paper-elev p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Explanation</p>
              <p className="mt-1 text-sm text-ink-soft">{item.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
