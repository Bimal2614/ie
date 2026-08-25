"use client";

import { useCallback, useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Fullscreen toggle for a practice or exam screen.
 *
 * Extracted from <ExamShell/> so the paginated practice session can offer it
 * too: writing a 250-word essay inside the app's sidebar and topbar wastes most
 * of the screen, and that route never rendered the exam shell.
 *
 * `target` is the element to expand — pass the player's own root so the app
 * chrome is left behind. Without one it falls back to the document element,
 * which expands the whole page.
 */
export function FullscreenButton({
  target,
  className,
}: {
  target?: React.RefObject<HTMLElement | null>;
  className?: string;
}) {
  const [isFull, setIsFull] = useState(false);

  // The browser can leave fullscreen without us (Escape, or the user's own
  // shortcut), so the button's state is read from the document, never assumed.
  useEffect(() => {
    const sync = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await (target?.current ?? document.documentElement).requestFullscreen();
    } catch {
      // Denied by the browser (an iframe without the permission, say). Nothing
      // to fall back to: the layout is already the best it can do inline.
    }
  }, [target]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isFull}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand/50 hover:text-ink",
        className,
      )}
    >
      {isFull ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
      <span className="hidden sm:inline">{isFull ? "Exit fullscreen" : "Fullscreen"}</span>
    </button>
  );
}
