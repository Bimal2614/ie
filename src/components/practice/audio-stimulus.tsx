"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Volume1, Volume2, VolumeX } from "lucide-react";
import { NO_DOWNLOAD_MEDIA_ATTRS } from "@/lib/media-attrs";
import { cn } from "@/lib/utils";

/**
 * The practice listening player — our controls, never the browser's.
 *
 * WHY NOT `<audio controls>`. The native player is a download button with a
 * waveform attached. Chrome and Edge put "Download" in its ⋮ menu, Firefox and
 * Safari put "Save Audio As…" in the right-click menu, and every one of them
 * hands over the exam recording as a file. `controlsList="nodownload"` removes
 * the Chromium entry and is ignored everywhere else, so the only way to have no
 * download affordance in ANY browser is to have no browser-drawn UI at all.
 *
 * SO THE ELEMENT IS INVISIBLE and everything below draws what it is doing. The
 * media element still exists — it is what plays, seeks and reports duration,
 * and what the per-question clip player drives through `audioRef` — it simply
 * has no chrome of its own for a menu to hang off. The context menu is
 * suppressed on the whole block for the same reason the passage suppresses it:
 * the shortest path to a copy is a right-click.
 *
 * PRACTICE, NOT THE EXAM. Unlike a mock's tape (ListeningTape), this player
 * seeks and replays on purpose — practice is where you go back and listen for
 * the answer you missed. The exam's "plays once" rule lives in that component,
 * not this one.
 *
 * WHAT THIS IS NOT. It is not a copy-protection scheme; audio that can be heard
 * can be recorded. The bytes are defended on the server, where the URL cannot
 * be turned into a shareable link — see src/lib/protected-media.ts. This just
 * stops the browser from offering the file with one click.
 */

/** Shared with ListeningTape so a level set in one place holds in the other. */
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

function clock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function AudioStimulus({
  src,
  audioRef,
  className,
}: {
  src: string;
  /**
   * The element itself, so the caller can drive it — the clip player seeks to
   * the moment that answers one question and pauses at the end of it.
   */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  /**
   * Where the thumb is while it is being dragged, before the seek is applied.
   *
   * A range input fires on every step of a drag, and applying each one would
   * ask the browser for a different byte range dozens of times per second —
   * audible as stutter, and a burst big enough to trip the media rate limit.
   * The bar follows the finger; the recording moves once, on release.
   */
  const [scrub, setScrub] = useState<number | null>(null);
  // Starts at full and corrects after mount: the server has no localStorage,
  // and reading it during render is a hydration mismatch.
  const [volume, setVolume] = useState(1);
  const lastAudible = useRef(1);

  useEffect(() => {
    setVolume(readVolume());
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume, audioRef]);

  const changeVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolume(clamped);
    try {
      window.localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {
      // Not being able to remember it is no reason to refuse to apply it.
    }
  }, []);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => setPlaying(false));
    else el.pause();
  }, [audioRef]);

  const seek = useCallback(
    (sec: number) => {
      const el = audioRef.current;
      if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return;
      el.currentTime = Math.min(el.duration, Math.max(0, sec));
      setCurrent(el.currentTime);
    },
    [audioRef],
  );

  const commitScrub = useCallback(() => {
    if (scrub === null) return;
    seek(scrub);
    setScrub(null);
  }, [scrub, seek]);

  const ready = duration > 0;
  const shown = scrub ?? current;

  return (
    <div
      className={cn(className)}
      // The right-click menu is the other way a browser offers to save the
      // recording, and it is drawn by the browser rather than by us.
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause recording" : "Play recording"}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
        </button>

        {/* Seek. A range input rather than a bare bar so it is keyboard- and
            screen-reader-operable without us reimplementing either. */}
        <input
          type="range"
          min={0}
          max={ready ? duration : 1}
          step={0.1}
          value={ready ? Math.min(shown, duration) : 0}
          disabled={!ready}
          onChange={(e) => setScrub(Number(e.target.value))}
          onPointerUp={commitScrub}
          onKeyUp={commitScrub}
          onBlur={commitScrub}
          aria-label="Seek recording"
          aria-valuetext={`${clock(shown)} of ${clock(duration)}`}
          className="h-1 min-w-0 flex-1 cursor-pointer accent-[hsl(var(--brand))] disabled:cursor-default"
        />

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
            className="h-1 w-14 cursor-pointer accent-[hsl(var(--brand))] sm:w-20"
          />
        </div>
      </div>

      {/* `preload="metadata"` is required, not cosmetic: the per-question clip
          player seeks by fraction of the duration, so the duration must be known
          before the first click. */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        // Belt and braces where a browser honours them; the real defence is that
        // there is no browser-drawn UI here to put a download button in.
        {...NO_DOWNLOAD_MEDIA_ATTRS}
        onContextMenu={(e) => e.preventDefault()}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="sr-only"
      />
    </div>
  );
}
