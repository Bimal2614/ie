"use client";

import { useEffect, useState } from "react";

import { watchDevtools } from "@/lib/devtools-watch";

/**
 * Open DevTools and the page is taken away from you.
 *
 * The detection lives in `@/lib/devtools-watch` (and documents honestly what it
 * can and cannot stop). This component is only the consequence, in two steps
 * that matter in this order:
 *
 *  1. Unmount the app. Returning a bare <div> instead of `children` tears down
 *     the whole React tree in the same commit — questions, transcripts, answer
 *     state and every <audio> element leave the DOM immediately, so there is
 *     nothing left in the Elements panel to read even if the navigation below
 *     is refused or slow.
 *  2. Leave the document. `about:blank` discards the page altogether, which
 *     also drops the Network panel's entries for it (DevTools clears the log on
 *     navigation unless "Preserve log" was ticked beforehand).
 *
 * It is one-way for the page load: closing DevTools again does not bring the
 * app back, because by then we are on a different document. A reload with the
 * tools shut is all it takes to return, which is the right cost for the false
 * positive we can never fully rule out.
 *
 * Mounted once, in the root layout, around everything.
 */
export function DevtoolsGuard({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => watchDevtools({ onOpen: () => setBlocked(true) }), []);

  useEffect(() => {
    if (!blocked) return;

    // Belt and braces for players created imperatively (`new Audio()` in the
    // listening tape), which no unmount reaches.
    document.querySelectorAll<HTMLMediaElement>("audio, video").forEach((el) => {
      try {
        el.pause();
        el.removeAttribute("src");
        el.load();
      } catch {
        // A detached or already-torn-down element — nothing to stop.
      }
    });

    try {
      window.location.replace("about:blank");
    } catch {
      // Navigation refused: step 1 has already emptied the page, so stay there.
    }
  }, [blocked]);

  if (blocked) return <div className="min-h-screen bg-white" aria-hidden />;

  return <>{children}</>;
}
