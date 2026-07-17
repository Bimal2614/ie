"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { scoreMockSpeaking } from "@/app/actions/mock";

/**
 * Kicks off speaking AI scoring for a finished mock, then refreshes the report.
 *
 * Why here and not at submit: finishMock redirects straight to this page, so the
 * player never gets a chance to trigger anything — and scoring inline would hold
 * the submit open for several seconds per answer. The action is idempotent
 * (it only touches rows that have audio and no band), so a refresh or a second
 * visit can't double-score or re-charge the API.
 */
export function SpeakingScoreTrigger({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"scoring" | "done" | "failed">("scoring");
  // React runs effects twice in dev StrictMode; without this the action fires
  // twice on every mount.
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    scoreMockSpeaking(sessionId)
      .then((res) => {
        setState("done");
        // Only re-render the report if a band actually landed.
        if (res.scored > 0) router.refresh();
      })
      .catch(() => setState("failed"));
  }, [sessionId, router]);

  if (state === "done") return null;

  return (
    <p
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
        state === "failed" ? "bg-danger-soft text-danger" : "bg-info-soft text-ink-soft"
      }`}
    >
      {state === "scoring" ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          Scoring your speaking answers — this takes a few seconds each. The report will update
          automatically.
        </>
      ) : (
        <>
          <Sparkles className="size-3.5" />
          Speaking couldn&apos;t be scored right now. Your answers are saved — reload to retry.
        </>
      )}
    </p>
  );
}
