"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Headphones, Loader2, Play, Volume1, Volume2, VolumeX } from "lucide-react";
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
 * THE TAPE IS POSITIONED BY THE CLOCK, NOT BY WHERE IT LEFT OFF. A mock's module
 * clock keeps running while the candidate is away, so the recording has to have
 * kept running too — resuming twelve minutes into Listening must drop them
 * twelve minutes into the recording, with the earlier parts gone. Restarting
 * from the top would hand back the audio they missed while the clock charged
 * them for it, which is the one thing this whole design exists to prevent.
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

/**
 * Under this many seconds elapsed, treat it as a fresh start.
 *
 * A brand-new sitting is already a second or two old by the time this mounts
 * (the redirect, then the render), and measuring four files before playing a
 * tape that belongs at 0:00 anyway would just add silence to the start of every
 * exam.
 */
const FRESH_START_SEC = 10;

/**
 * The candidate's own listening level, remembered between sittings.
 *
 * The real test has a volume slider and a sound check before the paper starts,
 * for the obvious reason: a candidate who cannot hear the recording cannot
 * answer, and the module has no replay. Ours has no controls at all by design —
 * a scrub bar is a way to hear an answer twice — but volume is the one control
 * that changes nothing about WHAT you hear, only whether you hear it.
 */
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

/** Where in the tape a given elapsed time falls. */
type Cue = { index: number; offset: number; past: boolean };

export function locateInTape(durations: number[], elapsed: number): Cue {
  let cursor = 0;
  for (let i = 0; i < durations.length; i++) {
    const d = durations[i];
    // A file we could not measure (0) is stepped over rather than swallowing the
    // whole elapsed time and stranding the candidate on it.
    if (d > 0 && elapsed < cursor + d) return { index: i, offset: elapsed - cursor, past: false };
    cursor += d;
  }
  // The recording finished while they were away; only checking time is left.
  return { index: Math.max(0, durations.length - 1), offset: 0, past: true };
}

export function ListeningTape({
  tracks,
  elapsedSeconds,
  onTrackChange,
  onFinished,
}: {
  tracks: Tape[];
  /**
   * Seconds since this module's clock started, measured on the SERVER. Read once
   * on mount: it is where the recording should already be, not a live counter.
   */
  elapsedSeconds: number;
  /** Fires when the recording reaches a part, including the one resumed into. */
  onTrackChange: (partId: string, index: number) => void;
  /** Fires when the last part's audio ends, or had already ended on resume. */
  onFinished: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<"seeking" | "idle" | "playing" | "blocked" | "finished">(
    elapsedSeconds > FRESH_START_SEC ? "seeking" : "idle",
  );
  const [progress, setProgress] = useState(0);
  // Starts at full and corrects after mount: the server has no localStorage,
  // and reading it during render is a hydration mismatch.
  const [volume, setVolume] = useState(1);

  const track = tracks[index];
  // Read inside handlers that must not re-subscribe on every tick.
  const indexRef = useRef(index);
  indexRef.current = index;
  const stateRef = useRef(state);
  stateRef.current = state;
  const notify = useRef(onTrackChange);
  notify.current = onTrackChange;
  const done = useRef(onFinished);
  done.current = onFinished;
  /** Frozen on mount — a live value would re-seek the tape every second. */
  const startedAtSec = useRef(elapsedSeconds);

  useEffect(() => {
    setVolume(readVolume());
  }, []);

  // Applied to the element, which keeps it across a source change — so the level
  // set during Part 1 still holds when Part 2 loads.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume, index]);

  const changeVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolume(clamped);
    try {
      window.localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {
      // Not being able to remember it is no reason to refuse to apply it.
    }
  }, []);
  /** Restores to a sensible level rather than un-muting to silence. */
  const lastAudible = useRef(1);

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

  /**
   * Put the tape where the clock says it should be, then start it.
   *
   * Finding that spot needs the real length of each part, and only the browser
   * knows those — so the four files are measured first, header-only, in
   * parallel. That measurement is why this is not simply "play from 0", and why
   * a resumed sitting shows "finding your place" for a moment.
   */
  useEffect(() => {
    if (tracks.length === 0) return;

    // Fresh sitting: nothing to work out, start at the top immediately.
    if (startedAtSec.current <= FRESH_START_SEC) {
      notify.current(tracks[0].partId, 0);
      void play();
      return;
    }

    let cancelled = false;
    const measure = (src: string) =>
      new Promise<number>((resolve) => {
        const probe = new Audio();
        probe.preload = "metadata";
        const finish = (v: number) => resolve(Number.isFinite(v) && v > 0 ? v : 0);
        probe.addEventListener("loadedmetadata", () => finish(probe.duration), { once: true });
        // An unreadable file must not hang the exam: count it as zero, move on.
        probe.addEventListener("error", () => finish(0), { once: true });
        probe.src = src;
      });

    void Promise.all(tracks.map((t) => measure(t.src))).then((durations) => {
      if (cancelled) return;
      const cue = locateInTape(durations, startedAtSec.current);

      setIndex(cue.index);
      notify.current(tracks[cue.index].partId, cue.index);

      if (cue.past) {
        // The whole recording played out while they were away. Land them on the
        // last part and give them what is left of the module to check answers.
        setState("finished");
        done.current();
        return;
      }

      const el = audioRef.current;
      if (!el) return;
      // Seeking before the source is loaded is discarded, so the offset is
      // applied once the metadata for the RIGHT file is in.
      const applyOffset = () => {
        el.currentTime = cue.offset;
        void play();
      };
      if (cue.index === 0) {
        if (el.readyState >= 1) applyOffset();
        else el.addEventListener("loadedmetadata", applyOffset, { once: true });
      } else {
        el.src = tracks[cue.index].src;
        el.addEventListener("loadedmetadata", applyOffset, { once: true });
        el.load();
      }
    });

    return () => {
      cancelled = true;
    };
    // Deliberately mount-only: re-running would restart or re-seek a recording
    // that is playing perfectly well.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // Loaded here rather than from an effect on `index`, so it cannot race with
    // the resume seek above — that sets the index AND the source itself.
    const el = audioRef.current;
    if (!el) return;
    el.src = tracks[next].src;
    el.load();
    void play();
  }, [tracks, play]);

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
   * `ended` still false. The state check covers the pauses WE cause while
   * placing the tape on a resume.
   */
  const onPause = useCallback(() => {
    const el = audioRef.current;
    if (!el || el.ended) return;
    if (stateRef.current === "seeking" || stateRef.current === "finished") return;
    if (Number.isFinite(el.duration) && el.currentTime >= el.duration - 0.5) return;
    void el.play().catch(() => setState("blocked"));
  }, []);

  if (tracks.length === 0) return null;

  const finished = state === "finished";
  const seeking = state === "seeking";

  return (
    <div className="sticky top-2 z-20 rounded-xl border border-line bg-paper-elev/95 p-4 shadow-[var(--shadow-md)] backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg chip-listening">
          {seeking ? (
            <Loader2 className="size-4 animate-spin" />
          ) : finished ? (
            <Headphones className="size-4" />
          ) : volume === 0 ? (
            <VolumeX className="size-4" />
          ) : (
            <Volume2 className="size-4" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {seeking
              ? "Finding your place"
              : finished
                ? "Recording finished"
                : state === "blocked"
                  ? "Recording ready"
                  : `Recording · ${track?.label ?? ""}`}
          </p>
          <p className="text-[11px] leading-snug text-ink-soft">
            {seeking
              ? "The recording kept playing while you were away — picking it up where the clock is."
              : finished
                ? "Use the time left to check your answers. You can still move between parts."
                : state === "blocked"
                  ? "Tap play to start. It runs through all four parts once, without stopping."
                  : volume === 0
                    ? "Muted — the recording is still playing and will not repeat."
                    : "Plays once, straight through all four parts. It won't wait or repeat."}
          </p>
        </div>

        {/* Volume, and ONLY volume. Everything else a media player offers —
            pause, seek, restart — would change what the candidate hears; this
            changes whether they hear it. Hidden once the tape is over, when
            there is nothing left to level. */}
        {!finished && (
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
              aria-label={volume === 0 ? "Unmute recording" : "Mute recording"}
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
              aria-label="Recording volume"
              className="h-1 w-20 cursor-pointer accent-[hsl(var(--brand))] sm:w-24"
            />
          </div>
        )}

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
