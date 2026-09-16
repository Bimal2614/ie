"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, MessageCircle, Play, Volume1, Volume2, VolumeX } from "lucide-react";
import { NO_DOWNLOAD_MEDIA_ATTRS } from "@/lib/media-attrs";
import { cn } from "@/lib/utils";

/**
 * The examiner asking one question in a mock — heard once, and then gone.
 *
 * THE SPEAKING EQUIVALENT OF ListeningTape, and it exists for the same reason.
 * AudioStimulus is the practice player: it seeks, it pauses, it replays, because
 * practice is where you listen again for the word you missed. On test day the
 * examiner asks once. A seek bar on a mock question is a rewind button on a
 * person, and what it actually buys the candidate is the habit of asking for a
 * repetition that the real examiner will not give.
 *
 * SO THERE ARE NO TRANSPORT CONTROLS. Volume, and only volume — that changes
 * whether you hear the question, not how many times. The one button here is the
 * autoplay fallback: browsers refuse to start audio before the page has been
 * interacted with, and a candidate staring at a silent question with nothing to
 * press is worse than a button that can only ever be pressed once. It is gone
 * the moment the clip starts, and nothing brings it back once the clip ends.
 *
 * `onEnded` fires exactly once per question, however the clip was started —
 * which is what makes it safe to hang "the recorder opens now" off it.
 */

/** Shared with ListeningTape and AudioStimulus, so one level holds everywhere. */
const VOLUME_KEY = "ielts:listening-volume";

function readVolume(): number {
  try {
    const v = Number(window.localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 1;
  } catch {
    // Private windows throw on read, not just on write.
    return 1;
  }
}

type Phase = "starting" | "blocked" | "playing" | "asked";

export function ExaminerPrompt({
  src,
  onEnded,
  className,
}: {
  src: string;
  /** The question has been asked in full. Fires once, and never on a pause. */
  onEnded?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [progress, setProgress] = useState(0);
  // Starts at full and corrects after mount: the server has no localStorage, and
  // reading it during render is a hydration mismatch.
  const [volume, setVolume] = useState(1);
  const lastAudible = useRef(1);
  /**
   * The clip is spent. Checked before every play, because `play()` is reachable
   * from the autoplay effect and from the fallback button, and neither may
   * restart a question the candidate has already been asked.
   */
  const spent = useRef(false);

  useEffect(() => {
    setVolume(readVolume());
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.volume = volume;
  }, [volume]);

  const changeVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolume(clamped);
    try {
      window.localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {
      // Not being able to remember it is no reason to refuse to apply it.
    }
  }, []);

  const play = useCallback(() => {
    const el = ref.current;
    if (!el || spent.current) return;
    el.play().then(
      () => setPhase("playing"),
      // Autoplay refused until the page has been interacted with. Normal, not an
      // error — the button below is what guarantees the question is heard.
      () => setPhase((p) => (p === "playing" ? p : "blocked")),
    );
  }, []);

  /**
   * It asks itself. That is the examiner opening their mouth: nobody invites
   * them to. Mount-only — a re-run on any other dependency would be a second
   * asking of the same question.
   */
  useEffect(() => {
    play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const asked = phase === "asked";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-line bg-paper-sunken px-3 py-2",
        className,
      )}
      // The right-click menu is the other way a browser offers to save the
      // recording, and it is drawn by the browser rather than by us.
      onContextMenu={(e) => e.preventDefault()}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg",
          asked ? "bg-success-soft text-success" : "chip-speaking",
        )}
      >
        {asked ? <Check className="size-4" /> : <MessageCircle className="size-4" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {asked
            ? "Question asked"
            : phase === "blocked"
              ? "Question ready"
              : "The examiner is speaking"}
        </p>
        {/* Progress, never a scrubber: this is information about where the
            question has got to, not a control with somewhere to drag it back
            to. Hidden once it is over, when there is nothing left to report. */}
        {!asked && phase !== "blocked" && (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-paper">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {(asked || phase === "blocked") && (
          <p className="text-[11px] leading-snug text-ink-soft">
            {asked
              ? "Asked once, as in the real test — answer out loud."
              : "Tap play to hear the examiner. It is asked once and will not repeat."}
          </p>
        )}
      </div>

      {/* Volume, and ONLY volume — see the note at the top of this file. Gone
          once the question is over, when there is nothing left to level. */}
      {!asked && (
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (volume > 0) {
                lastAudible.current = volume;
                changeVolume(0);
              } else {
                changeVolume(lastAudible.current || 1);
              }
            }}
            aria-label={volume === 0 ? "Unmute the examiner" : "Mute the examiner"}
            className="grid size-7 place-items-center rounded-md text-ink-soft transition-colors hover:text-ink"
          >
            {volume === 0 ? (
              <VolumeX className="size-4" />
            ) : volume < 0.5 ? (
              <Volume1 className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            aria-label="Examiner volume"
            className="h-1 w-14 cursor-pointer accent-[hsl(var(--brand))] sm:w-20"
          />
        </div>
      )}

      {phase === "blocked" && (
        <button
          type="button"
          onClick={play}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Play className="size-3.5" /> Play question
        </button>
      )}

      {/* `preload="auto"` on purpose, and it is the difference between the
          examiner following on from the last answer and a gap of silence while
          the next clip is fetched. The element is invisible for the reason set
          out in audio-stimulus.tsx: a browser-drawn player is a download button
          with a waveform attached. */}
      <audio
        ref={ref}
        src={src}
        preload="auto"
        {...NO_DOWNLOAD_MEDIA_ATTRS}
        onContextMenu={(e) => e.preventDefault()}
        onPlay={() => setPhase("playing")}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (!Number.isFinite(el.duration) || el.duration <= 0) return;
          setProgress(Math.min(100, (el.currentTime / el.duration) * 100));
        }}
        onEnded={() => {
          spent.current = true;
          setProgress(100);
          setPhase("asked");
          onEnded?.();
        }}
        className="sr-only"
      />
    </div>
  );
}
