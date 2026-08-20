"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Clock, Loader2, Maximize2, Minimize2, Send } from "lucide-react";
import { QuestionStrip, type StripPart } from "./question-strip";

/**
 * The chrome every timed IELTS screen shares.
 *
 * Layout is fixed to the viewport rather than the document: the passage and the
 * questions scroll independently inside it, and the timer, the navigation and
 * the answer-sheet strip never move. That is how the real test behaves, and it
 * is what makes a long passage usable beside a long question list.
 *
 * Section practice and the mock test both render through here so the two cannot
 * drift — the mock passes every part to the strip, practice passes one.
 */

function pad(n: number) {
  return String(Math.floor(n)).padStart(2, "0");
}

function clock(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  return `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`;
}

export function ExamShell({
  title,
  partLabel,
  instruction,
  badges,
  menu,
  remainingSec,
  timerState,
  parts,
  activePartId,
  answered,
  flagged,
  current,
  onJump,
  onSelectPart,
  onPrev,
  onNext,
  canPrev = true,
  canNext = true,
  onSubmit,
  submitting,
  submitLabel = "Submit",
  footerNote,
  children,
}: {
  /** "Cambridge 19 · Test 2 · Reading" — shown top-left beside the size control. */
  title: string;
  /** "Part 1" — the band under the header. */
  partLabel?: string;
  instruction?: string | null;
  badges?: React.ReactNode;
  menu?: React.ReactNode;
  /**
   * Seconds left, for a timed sitting. Omitted, the shell counts up instead —
   * practice is untimed, but a candidate still wants to know how long they took.
   */
  remainingSec?: number;
  timerState?: "ok" | "warning" | "critical";
  parts: StripPart[];
  activePartId: string;
  answered: Set<number>;
  flagged?: Set<number>;
  current?: number | null;
  onJump: (n: number, partId: string) => void;
  onSelectPart?: (partId: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  onSubmit?: () => void;
  submitting?: boolean;
  submitLabel?: string;
  footerNote?: React.ReactNode;
  children: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement | null>(null);
  const [isFull, setIsFull] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const counting = remainingSec === undefined;
  useEffect(() => {
    if (!counting) return;
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, [counting]);

  // The browser can leave fullscreen without us (Escape, or the user's own
  // shortcut), so the button's state is read from the document, never assumed.
  useEffect(() => {
    const sync = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleFull = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.current?.requestFullscreen();
    } catch {
      // Denied by the browser (an iframe without the permission, say). The
      // layout already fills the viewport, so there is nothing to fall back to.
    }
  }, []);

  const state = timerState ?? "ok";

  return (
    <div
      ref={root}
      className="flex h-[100dvh] flex-col overflow-hidden bg-paper text-ink"
    >
      {/* ---- header: size control · clock · menu ---- */}
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-paper-elev px-3 py-2">
        {/* The way out sits first: this screen covers the app's own navigation,
            so leaving is the one control a candidate must never hunt for. */}
        {menu ? <div className="shrink-0">{menu}</div> : null}

        <button
          type="button"
          onClick={toggleFull}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand/50 hover:text-ink"
        >
          {isFull ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          {isFull ? "Exit fullscreen" : "Fullscreen"}
        </button>

        <p className="min-w-0 flex-1 truncate text-xs text-ink-muted sm:text-sm">{title}</p>

        <span
          className="exam-timer inline-flex shrink-0 items-center gap-1.5 text-base tabular-nums sm:text-lg"
          data-state={state}
          aria-label={counting ? "Time elapsed" : "Time remaining"}
        >
          <Clock className="size-4" />
          {clock(counting ? elapsed : remainingSec!)}
        </span>
      </header>

      {/* ---- instruction band ---- */}
      {(partLabel || instruction || badges) && (
        <div className="shrink-0 border-b border-line bg-paper-elev/60 px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            {partLabel && (
              <span className="text-sm font-bold text-ink-strong">{partLabel}</span>
            )}
            {badges}
          </div>
          {instruction && (
            <p className="mt-0.5 text-sm leading-snug text-ink-soft">{instruction}</p>
          )}
        </div>
      )}

      {/* ---- body: the panes scroll, the chrome does not ---- */}
      <div className="min-h-0 flex-1">{children}</div>

      {/* ---- navigation ---- */}
      <div className="flex shrink-0 items-center gap-3 border-t border-line bg-paper-elev px-3 py-2">
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onPrev}
            disabled={!onPrev || !canPrev}
            aria-label="Previous question"
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors enabled:hover:border-brand/50 enabled:hover:text-ink disabled:opacity-40"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">Previous</span>
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!onNext || !canNext}
            aria-label="Next question"
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors enabled:hover:border-brand/50 enabled:hover:text-ink disabled:opacity-40"
          >
            <span className="hidden sm:inline">Next</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>

        <div className="min-w-0 flex-1 truncate text-center text-xs text-ink-muted">
          {footerNote}
        </div>

        {onSubmit && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-success px-3.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            {submitLabel}
          </button>
        )}
      </div>

      {/* ---- answer sheet ---- */}
      <div className="shrink-0">
        <QuestionStrip
          parts={parts}
          activePartId={activePartId}
          answered={answered}
          flagged={flagged}
          current={current}
          onJump={onJump}
          onSelectPart={onSelectPart}
        />
      </div>
    </div>
  );
}

export type { StripPart };
