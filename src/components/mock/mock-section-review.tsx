"use client";

import { useState } from "react";
import { ChevronRight, Check, X, Clock, Loader2, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUESTION_TYPES, type QuestionTypeKey, type SectionKey } from "@/lib/ielts";
import type { SetLayout } from "@/lib/question-content";
import {
  getMockSectionReview,
  type MockReviewItem,
  type MockReviewPart,
  type MockSectionReview,
} from "@/app/actions/mock";
import { AttemptAnswers } from "@/components/history/attempt-answers";

/**
 * The results drill-down: a module band that expands to its parts, each part to
 * its questions, and each question to the full item, the candidate's answer, the
 * correct answer and the verdict.
 *
 * A MODULE HAS PARTS. Listening is four recordings and Reading three passages,
 * so an expanded module is a list of parts rather than a flat run of 40 rows —
 * "I lost Passage 3" is the thing a candidate wants to see, and a flat list
 * hides it. Data loads only when a module is opened, so the report itself stays
 * light. Layout-aware rendering (tables, gap summaries) is reused from the
 * history review path.
 */
export function MockSectionReviewBlock({
  sessionId,
  section,
  label,
  accent,
  band,
  pending,
  raw,
  total,
}: {
  sessionId: string;
  section: SectionKey;
  label: string;
  accent: string;
  band: string | null;
  pending: boolean;
  raw?: number | null;
  total?: number | null;
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
            {pending
              ? "Awaiting AI band score"
              : raw !== null && raw !== undefined && total
                ? `${raw} of ${total} marks · tap to review`
                : "Tap to review each question"}
          </span>
        </span>
        <span className="display shrink-0 text-xl tabular-nums text-ink">
          {band ?? <span className="text-sm text-ink-muted">-</span>}
        </span>
        <ChevronRight
          className={cn("size-4 shrink-0 text-ink-muted transition-transform", open && "rotate-90")}
        />
      </button>

      {open && (
        <div className="border-t border-line">
          {loading && (
            <p className="flex items-center gap-2 px-4 py-3 text-xs text-ink-muted">
              <Loader2 className="size-3.5 animate-spin" /> Loading…
            </p>
          )}
          {!loading && (data === null || data.parts.length === 0) && (
            <p className="px-4 py-3 text-xs text-ink-muted">
              Nothing to review for this module.
            </p>
          )}
          {data?.parts.map((part) => (
            <PartBlock key={`${part.sectionId}-${part.startNumber}`} part={part} />
          ))}
        </div>
      )}
    </div>
  );
}

/** One task group inside a module — a passage, a recording, or a writing task. */
function PartBlock({ part }: { part: MockReviewPart }) {
  const [open, setOpen] = useState(false);
  const meta = QUESTION_TYPES[part.questionType];
  const scored = part.items.filter((i) => i.isCorrect !== null);
  const earned = part.items.reduce((n, i) => n + i.earned, 0);
  const marks = scored.reduce((n, i) => n + i.marks, 0);
  const first = part.items[0]?.number;
  const last = part.items[part.items.length - 1];
  const range =
    first === undefined
      ? ""
      : last && last.number + last.marks - 1 > first
        ? `${first}-${last.number + last.marks - 1}`
        : String(first);

  return (
    <div className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-paper-sunken"
      >
        <span className="shrink-0 rounded bg-paper-sunken px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-ink-soft">
          {range}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{part.title}</span>
          <span className="block text-[11px] text-ink-muted">{meta?.label ?? part.questionType}</span>
        </span>
        {marks > 0 && (
          <span className="shrink-0 font-mono text-xs tabular-nums text-ink-soft">
            {earned}/{marks}
          </span>
        )}
        <ChevronRight
          className={cn("size-3.5 shrink-0 text-ink-muted transition-transform", open && "rotate-90")}
        />
      </button>

      {open &&
        part.items.map((item) => (
          <QuestionRow
            key={item.key}
            item={item}
            questionType={part.questionType}
            layout={part.layout}
          />
        ))}
    </div>
  );
}

function QuestionRow({
  item,
  questionType,
  layout,
}: {
  item: MockReviewItem;
  questionType: QuestionTypeKey;
  layout: SetLayout | null;
}) {
  const [open, setOpen] = useState(false);
  const meta = QUESTION_TYPES[questionType];
  const objective = item.isCorrect !== null;
  // An item nobody answered is neither right nor wrong — showing it as a red
  // cross claims the candidate got it wrong when they never saw it.
  const skipped = item.response === null || item.response === undefined;

  return (
    <div className="border-t border-line/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 py-2.5 pl-8 pr-4 text-left hover:bg-paper-sunken"
      >
        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full font-mono text-[10px] font-semibold tabular-nums",
            skipped
              ? "bg-paper-sunken text-ink-muted"
              : !objective
                ? "bg-info text-white"
                : item.isCorrect
                  ? "bg-success text-white"
                  : "bg-danger text-white",
          )}
        >
          {item.number}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
          {item.prompt ?? meta?.label ?? questionType}
        </span>
        {item.timeSpentSec !== null && (
          <span className="hidden items-center gap-1 text-[11px] text-ink-muted sm:inline-flex">
            <Clock className="size-3" /> {item.timeSpentSec}s
          </span>
        )}
        {skipped ? (
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-paper-sunken text-ink-muted">
            <Minus className="size-3" />
          </span>
        ) : objective ? (
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
        <ChevronRight
          className={cn("size-3.5 shrink-0 text-ink-muted transition-transform", open && "rotate-90")}
        />
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
            transcript={item.transcript}
            audioUrl={item.audioUrl}
            aiFeedback={item.aiFeedback}
          />
          {item.explanation && (
            <div className="rounded-lg bg-paper-elev p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Explanation
              </p>
              <p className="mt-1 text-sm text-ink-soft">{item.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
