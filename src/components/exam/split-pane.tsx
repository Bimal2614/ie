"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Two panes with a divider the candidate can drag.
 *
 * Reading a passage and answering against it is a two-column job, and how much
 * room each side wants is personal — a long passage wants width, a diagram
 * wants none. The divider is a real `separator` with keyboard support, because
 * dragging is a mouse-only gesture and this is exam furniture.
 *
 * Below `lg` the split collapses to stacked blocks: two 45%-wide columns on a
 * phone are unreadable. `!basis-auto` is what undoes the inline flex-basis
 * there — an important declaration in the stylesheet outranks a plain inline
 * one, which a Tailwind class alone could not do.
 */

const MIN = 25;
const MAX = 75;
const STEP = 4;

export function SplitPane({
  left,
  right,
  initial = 50,
  storageKey,
  className,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  /** Left pane width as a percentage. */
  initial?: number;
  /** Remembers the candidate's ratio across parts and reloads. */
  storageKey?: string;
  className?: string;
}) {
  const [pct, setPct] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const frame = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    const saved = Number(window.localStorage.getItem(storageKey));
    if (Number.isFinite(saved) && saved >= MIN && saved <= MAX) setPct(saved);
  }, [storageKey]);

  const commit = useCallback(
    (next: number) => {
      const clamped = Math.min(MAX, Math.max(MIN, next));
      setPct(clamped);
      if (storageKey) window.localStorage.setItem(storageKey, String(Math.round(clamped)));
    },
    [storageKey],
  );

  // Tracked on the window so a fast drag that outruns the narrow handle keeps
  // going, and so releasing outside the frame still ends it.
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const box = frame.current?.getBoundingClientRect();
      if (!box || box.width === 0) return;
      commit(((e.clientX - box.left) / box.width) * 100);
    };
    const stop = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    // Stops the passage being text-selected while the divider is dragged.
    const previous = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      document.body.style.userSelect = previous;
    };
  }, [dragging, commit]);

  return (
    <div ref={frame} className={cn("flex min-h-0 flex-col lg:flex-row", className)}>
      <div
        className="min-h-0 min-w-0 shrink-0 overflow-y-auto max-lg:!basis-auto lg:h-full"
        style={{ flexBasis: `${pct}%` }}
      >
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize the passage and question panes"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        tabIndex={0}
        onPointerDown={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDoubleClick={() => commit(initial)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") commit(pct - STEP);
          else if (e.key === "ArrowRight") commit(pct + STEP);
          else if (e.key === "Home") commit(MIN);
          else if (e.key === "End") commit(MAX);
          else if (e.key === "Enter") commit(initial);
          else return;
          e.preventDefault();
        }}
        className={cn(
          "group relative hidden shrink-0 cursor-col-resize touch-none items-center justify-center",
          "border-x border-line bg-paper-sunken transition-colors lg:flex lg:w-2",
          "hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
          dragging && "bg-brand-soft",
        )}
        title="Drag to resize · double-click to reset"
      >
        <span
          className={cn(
            "pointer-events-none absolute grid h-7 w-5 place-items-center rounded border border-line",
            "bg-paper-elev text-ink-muted shadow-sm transition-colors",
            "group-hover:border-brand/50 group-hover:text-brand",
            dragging && "border-brand/50 text-brand",
          )}
          aria-hidden
        >
          <svg viewBox="0 0 16 16" className="size-3" fill="currentColor">
            <path d="M5.2 4.3 1.9 7.6a.55.55 0 0 0 0 .8l3.3 3.3a.55.55 0 0 0 .94-.4V4.7a.55.55 0 0 0-.94-.4Zm5.6 0a.55.55 0 0 0-.94.4v6.6a.55.55 0 0 0 .94.4l3.3-3.3a.55.55 0 0 0 0-.8Z" />
          </svg>
        </span>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto lg:h-full">{right}</div>
    </div>
  );
}
