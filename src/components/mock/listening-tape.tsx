"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Headphones, Play, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The Listening recording, for a whole mock module.
 *
 * IN THE EXAM THERE IS ONE TAPE, NOT FOUR. An invigilator presses play once and
 * the recording runs straight through all four parts, announcing each one as it
 * arrives ("now turn to Part 2"). It cannot be paused, rewound or replayed, and
 * it does not wait for the candidate.
 *
 * We store a separate audio file per part, so this component is what turns those
 * four files back into one tape: it plays them back to back from a single
 * `<audio>` element and reports each hand-over so the paper can turn its own
 * page.
 *
 * WHY IT LIVES ABOVE THE PART SWITCHER. The element must survive a candidate
 * moving between parts to check an earlier answer — if the player were rendered
 * per part, React would unmount it on every switch and the recording would stop
 * dead and restart from the top of whichever part they landed on. So this is
 * mounted once per module, keyed by nothing, and the part on screen changes
 * underneath it.
 *
 * NO CONTROLS is a deliberate omission rather than an oversight: a visible
 * scrub bar in a listening exam is a way to hear an answer twice.
 */

export type Tape = {
  /** The part this file belongs to — reported back on hand-over. */
  partId: string;
  label: string;
  src: string;
};

export function ListeningTape({
  tracks,
  onTrackChange,
  onFinished,
}: {
  tracks: Tape[];
  /** Fires when the recording moves on to a part, including the first. */
  onTrackChange: (partId: string, index: number) => void;
  /** Fires once, when the last part's audio ends. */
  onFinished: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<"idle" | "playing" | "blocked" | "finished">("idle");
  const [progress, setProgress] = useState(0);

  const track = tracks[index];
  // Read inside handlers that must not re-subscribe on every tick.
  const indexRef = useRef(index);
  indexRef.current = index;
  const notify = useRef(onTrackChange);
  notify.current = onTrackChange;
  const done = useRef(onFinished);
  done.current = onFinished;

  /**
   * Start, or explain that the browser refused to.
   *
   * Autoplay with sound needs a user gesture in the same document, and starting
   * a mock is a click on the PREVIOUS page — so the gesture does not carry
   * across the navigation and the first `play()` is often rejected. That is not
   * an error worth an error message: it is one tap, and the exam has an
   * equivalent (someone presses play). `blocked` draws that button.
   */
  const play = useCallback(async () => {
    const el = audioRef.current;
    if (!el) return;
    try {
      await el.play();
      setState("playing");
    } catch {
      setState("blocked");
    }
  }, []);

  // Try to start as soon as the module opens.
  useEffect(() => {
    if (tracks.length === 0) return;
    void play();
    notify.current(tracks[0].partId, 0);
    // Deliberately only on mount: re-running would restart the recording.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load and play each new part as the tape reaches it.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !track) return;
    // First track is already loaded from the initial render; re-assigning `src`
    // would reset a recording that is playing perfectly well.
    if (el.currentSrc && !el.currentSrc.endsWith(track.src)) {
      el.src = track.src;
      el.load();
      void play();
    }
  }, [track, play]);

  const onEnded = useCallback(() => {
    const next = indexRef.current + 1;
    if (next >= tracks.length) {
      setState("finished");
      done.current();
      return;
    }
    setIndex(next);
    setProgress(0);
    notify.current(tracks[next].partId, next);
  }, [tracks]);

  /**
   * The recording does not stop because something else wanted the audio.
   *
   * A phone call, a media key, or another tab claiming playback all pause the
   * element, and in a timed exam that silently costs the candidate the rest of
   * the part. Resuming keeps the tape honest — it is still running, so it should
   * still be heard.
   *
   * A track reaching its end must NOT be resumed, and the guard is deliberately
   * belt-and-braces: the spec has `pause` fire just before `ended`, so this
   * handler runs on every normal hand-over, and calling `play()` there would
   * rewind the part to zero and play it a second time. `ended` covers the
   * compliant case; the position check covers a browser that fires `pause` with
   * `ended` still false.
   */
  const onPause = useCallback(() => {
    const el = audioRef.current;
    if (!el || el.ended) return;
    if (Number.isFinite(el.duration) && el.currentTime >= el.duration - 0.5) return;
    void el.play().catch(() => setState("blocked"));
  }, []);

  if (tracks.length === 0) return null;

  const finished = state === "finished";

  return (
    <div className="sticky top-2 z-20 rounded-xl border border-line bg-paper-elev/95 p-4 shadow-[var(--shadow-md)] backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg chip-listening">
          {finished ? <Headphones className="size-4" /> : <Volume2 className="size-4" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {finished
              ? "Recording finished"
              : state === "blocked"
                ? "Recording ready"
                : `Recording · ${track?.label ?? ""}`}
          </p>
          <p className="text-[11px] leading-snug text-ink-soft">
            {finished
              ? "Use the time left to check your answers. You can still move between parts."
              : state === "blocked"
                ? "Tap play to start. It runs through all four parts once, without stopping."
                : "Plays once, straight through all four parts. It won't wait or repeat."}
          </p>
        </div>

        {state === "blocked" && (
          <button
            type="button"
            onClick={() => void play()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Play className="size-3.5" /> Play recording
          </button>
        )}
      </div>

      {/* Where the tape is, part by part. Progress, never a scrubber: this is
          information, not a control, so there is nothing to drag backwards. */}
      <div className="mt-3 flex items-center gap-1.5">
        {tracks.map((t, i) => (
          <div key={t.partId} className="flex-1" title={t.label}>
            <div className="h-1 overflow-hidden rounded-full bg-paper-sunken">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500",
                  i < index || finished ? "bg-success" : i === index ? "bg-brand" : "bg-transparent",
                )}
                style={{ width: i < index || finished ? "100%" : i === index ? `${progress}%` : "0%" }}
              />
            </div>
            <p
              className={cn(
                "mt-1 text-[10px] font-medium",
                i === index && !finished ? "text-brand" : "text-ink-muted",
              )}
            >
              {t.label}
            </p>
          </div>
        ))}
      </div>

      {/* No captions: the transcript IS the answer key. It is review-only
          material and is never served during a sitting. */}
      <audio
        ref={audioRef}
        src={tracks[0].src}
        preload="auto"
        onEnded={onEnded}
        onPause={onPause}
        onPlaying={() => setState("playing")}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration > 0) setProgress((el.currentTime / el.duration) * 100);
        }}
        className="sr-only"
      />
    </div>
  );
}
