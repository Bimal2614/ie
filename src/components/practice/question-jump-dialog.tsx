"use client";

import { CheckCircle, Circle, Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QuestionStatus } from "./question-navigator";

interface QuestionJumpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuestionStatus[];
  currentIndex: number;
  totalCount: number;
  onNavigate: (index: number) => void;
  sectionLabel?: string;
  typeLabel?: string;
  accentColor?: string;
}

export function QuestionJumpDialog({
  isOpen,
  onClose,
  questions,
  currentIndex,
  totalCount,
  onNavigate,
  sectionLabel,
  typeLabel,
  accentColor = "brand",
}: QuestionJumpDialogProps) {
  if (!isOpen) return null;

  const answeredCount = questions.filter((q) => q.status === "answered").length;
  const flaggedCount = questions.filter((q) => q.status === "flagged").length;
  const remaining = totalCount - answeredCount;

  const getStatus = (index: number): QuestionStatus["status"] => {
    const q = questions[index];
    if (!q) return "not-started";
    if (index === currentIndex) return "current";
    return q.status;
  };

  const getButtonClass = (index: number) => {
    const status = getStatus(index);
    const base = "relative flex items-center justify-center rounded-lg border-2 p-2 text-sm font-semibold transition-all duration-150 hover:shadow-md cursor-pointer aspect-square min-w-[44px]";
    switch (status) {
      case "current":
        return `${base} border-brand bg-brand-soft text-brand shadow-sm`;
      case "answered":
        return `${base} border-success/50 bg-success-soft text-success`;
      case "flagged":
        return `${base} border-warning/50 bg-warning-soft text-warning`;
      default:
        return `${base} border-line bg-paper-elev text-ink-muted hover:border-line-strong hover:text-ink`;
    }
  };

  const getIcon = (index: number) => {
    const status = getStatus(index);
    switch (status) {
      case "current":
        return <Circle className="h-3 w-3 fill-brand text-brand absolute top-0.5 right-0.5" />;
      case "answered":
        return <CheckCircle className="h-3 w-3 fill-success text-white absolute top-0.5 right-0.5" />;
      case "flagged":
        return <Flag className="h-3 w-3 fill-warning text-white absolute top-0.5 right-0.5" />;
      default:
        return null;
    }
  };

  const handleClick = (index: number) => {
    onNavigate(index);
    onClose();
  };

  // Group questions by 10s
  const groups: { start: number; end: number; items: number[] }[] = [];
  for (let i = 0; i < totalCount; i += 10) {
    const items: number[] = [];
    for (let j = i; j < Math.min(i + 10, totalCount); j++) items.push(j);
    groups.push({ start: i + 1, end: Math.min(i + 10, totalCount), items });
  }

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-line bg-paper-elev shadow-pop sm:inset-x-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper-elev/95 px-5 py-4 backdrop-blur-md rounded-t-2xl">
          <div>
            <h2 className="display text-lg">Question Navigation</h2>
            {sectionLabel && (
              <p className="text-xs text-ink-muted mt-0.5">
                {sectionLabel}{typeLabel ? ` · ${typeLabel}` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-md p-1.5 text-ink-muted hover:bg-paper-sunken hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3 px-5 py-4 border-b border-line bg-paper-sunken">
          <div className="text-center">
            <div className="text-xl font-bold text-ink-strong font-mono tabular-nums">{totalCount}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Total</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-success font-mono tabular-nums">{answeredCount}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Done</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-brand font-mono tabular-nums">{currentIndex + 1}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Current</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-ink-muted font-mono tabular-nums">{remaining}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Left</div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 px-5 py-3 border-b border-line text-xs">
          <span className="flex items-center gap-1.5">
            <Circle className="h-3.5 w-3.5 fill-brand text-brand" /> Current
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 fill-success text-white" /> Done
          </span>
          <span className="flex items-center gap-1.5">
            <Circle className="h-3.5 w-3.5 text-ink-muted" /> Not started
          </span>
        </div>

        {/* Question grid */}
        <div className="space-y-5 px-5 py-5">
          {groups.map((group) => (
            <div key={group.start}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Questions {group.start}–{group.end}
              </p>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
                {group.items.map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleClick(idx)}
                    className={getButtonClass(idx)}
                    aria-label={`Go to question ${idx + 1}`}
                  >
                    {idx + 1}
                    {getIcon(idx)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-center gap-3 border-t border-line bg-paper-elev/95 px-5 py-3 backdrop-blur-md rounded-b-2xl">
          <Button variant="outline" size="sm" onClick={() => handleClick(0)} disabled={currentIndex === 0}>
            Go to first
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleClick(totalCount - 1)} disabled={currentIndex === totalCount - 1}>
            Go to last
          </Button>
          <Button size="sm" onClick={onClose}>
            Continue
          </Button>
        </div>
      </div>
    </>
  );
}
