"use client";

import { ArrowLeft, ArrowRight, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type QuestionStatus = {
  index: number;
  status: "not-started" | "current" | "answered" | "flagged";
};

interface QuestionNavigatorProps {
  questions: QuestionStatus[];
  currentIndex: number;
  totalCount: number;
  onPrevious: () => void;
  onNext: () => void;
  onJump: () => void;
  accentColor?: string;
}

export function QuestionNavigator({
  questions,
  currentIndex,
  totalCount,
  onPrevious,
  onNext,
  onJump,
  accentColor = "brand",
}: QuestionNavigatorProps) {
  const completedCount = questions.filter((q) => q.status === "answered").length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < totalCount - 1;

  return (
    <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-b-xl border-t border-line bg-paper-elev/95 px-3 py-2.5 backdrop-blur-md sm:px-4">
      {/* Previous */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onPrevious}
        disabled={!hasPrev}
        className="text-ink-soft"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline ml-1">Previous</span>
      </Button>

      {/* Jump-to indicator */}
      <button
        type="button"
        onClick={onJump}
        aria-label="Jump to question"
        title="Jump to question"
        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper-elev px-2.5 py-1.5 text-xs text-ink-soft hover:border-line-strong hover:text-ink-strong transition-colors"
      >
        <Grid3X3 className="h-3.5 w-3.5" />
        <span className="font-mono tabular-nums text-ink-strong">
          {currentIndex + 1}
        </span>
        <span className="text-ink-muted">/</span>
        <span className="font-mono tabular-nums text-ink-muted">
          {totalCount}
        </span>
      </button>

      {/* Progress bar (desktop) */}
      <div className="hidden items-center gap-2 lg:flex">
        <div className="w-20">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-ink-muted">
          {progressPct}%
        </span>
      </div>

      {/* Next */}
      <Button
        size="sm"
        onClick={onNext}
        disabled={!hasNext}
      >
        <span className="hidden sm:inline mr-1">Next</span>
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
