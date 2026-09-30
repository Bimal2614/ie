"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Headphones, Lock, Mic, TriangleAlert, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPEAKING_PREP_SECONDS } from "@/lib/mock-timing";

/**
 * The pause between the written paper and the interview.
 *
 * A real IELTS never runs Writing into Speaking. The candidate leaves the
 * written room, is met by an examiner, sits down and settles — minutes, not
 * seconds. Online there is no walk down the corridor, so the last thing a
 * candidate does before their first spoken word is put down a pen: the
 * microphone was never checked, the headphones are still on the desk, and Part
 * 1 question 1 is asked into an empty room. That answer is scored.
 *
 * So the hand-over buys the corridor back. One minute, fixed, with the two
 * devices the module depends on actually exercised rather than described.
 *
 * THE MINUTE CANNOT BE SKIPPED. The device tests are the only controls here;
 * there is no way to shorten the wait, because a skip button is pressed by
 * everyone who believes they are ready — including the candidate whose browser
 * has never been asked for the microphone.
 *
 * THE MINUTE IS THE SPEAKING MODULE'S OWN, not something added on top of it:
 * the module is sixteen minutes precisely so this one can come out of the
 * front. See SPEAKING_PREP_SECONDS for why it is charged that way.
 */

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The examiner saying "sound check", voiced by Kokoro into public/.
 *
 * SPEECH, NOT A TONE, because a tone proves only that the speaker makes noise.
 * A candidate on a muffled headset, or with one dead earpiece, passes a beep and
 * still cannot make out a question — and hearing it in the examiner's own voice
 * is what sets the volume they will sit the interview at.
 *
 * See utility/build-sound-check.py, which draws the voice from the same derived
 * pool the books' examiners come from.
 */
const SOUND_CHECK_SRC = "/audio/sound-check.mp3";

/**
 * The fallback, synthesised in the browser: a three-note rise, in Hz.
 *
 * Only reached when the clip will not load or play. A sound check that cannot
 * make a sound is worse than a crude one, and three oscillators cannot 404.
 */
const TEST_TONE = [523.25, 659.25, 783.99];
const NOTE_GAP = 0.22;
const NOTE_LEN = 0.45;

/**
 * How long the clip gets to actually start before the tone takes over.
 *
 * A MEDIA ELEMENT THAT STALLS IS SILENT IN BOTH DIRECTIONS: it fires neither
 * `ended` nor `error`, so without this the button sits on "Playing…" for the
 * rest of the minute having made no sound — the one failure a sound check must
 * not have. Chrome defers loading in a hidden tab, and a slow connection does
 * the same thing for longer, so this is reachable in the wild.
 */
const START_GRACE_MS = 2500;

/**
 * Loud speech, as a root-mean-square of the waveform.
 *
 * The meter is drawn as a fraction of this rather than of full scale, where
 * ordinary talking barely moves the bar and the candidate concludes the
 * microphone is broken.
 */
const LOUD_RMS = 0.25;
/** Above this we are certainly hearing them, and not just the room. */
const SPEECH_RMS = 0.045;

type SpeakerState = "idle" | "playing" | "played";
type MicState = "idle" | "asking" | "live" | "denied" | "unsupported";

export function SpeakingPrep({
  seconds = SPEAKING_PREP_SECONDS,
  /**
   * The first examiner clip, fetched while the candidate waits.
   *
   * The one question in the interview with nothing in front of it to hide the
   * download — every later clip is warmed while the previous answer is being
   * given. Cold, it is dead air in the first second of the test.
   */
  firstPromptUrl,
  onDone,
}: {
  seconds?: number;
  firstPromptUrl?: string | null;
  onDone: () => void;
}) {
  const [left, setLeft] = useState(seconds);
  const fired = useRef(false);
  // Held in a ref so a re-rendered parent cannot restart the countdown.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  /**
   * Counted against a DEADLINE, not by adding up ticks.
   *
   * A background tab has its intervals throttled, so a minute counted one
   * `setInterval` at a time becomes whatever the browser felt like giving —
   * always longer, never shorter. Polling a fixed instant four times a second
   * means the screen is honest the moment it comes back.
   */
  useEffect(() => {
    const deadline = Date.now() + seconds * 1000;
    const tick = () => {
      const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(s);
      if (s > 0 || fired.current) return;
      fired.current = true;
      window.clearInterval(iv);
      onDoneRef.current();
    };
    const iv = window.setInterval(tick, 250);
    return () => window.clearInterval(iv);
  }, [seconds]);

  useEffect(() => {
    if (!firstPromptUrl) return;
    const warm = new Audio();
    warm.preload = "auto";
    warm.src = firstPromptUrl;
    warm.load();
    return () => {
      // `removeAttribute` rather than `src = ""`, which resolves to the page's
      // own URL and has the browser fetch the document as media.
      warm.removeAttribute("src");
      warm.load();
    };
  }, [firstPromptUrl]);

  /* ------------------------- the speaker test ------------------------- */

  const [speaker, setSpeaker] = useState<SpeakerState>("idle");
  const clip = useRef<HTMLAudioElement | null>(null);
  const toneCtx = useRef<AudioContext | null>(null);
  const toneTimer = useRef<number | null>(null);
  const watchdog = useRef<number | null>(null);
  const fellBack = useRef(false);

  // Fetched on arrival, not on the click: the whole point of the minute is that
  // there is time to spend, and a sound check that buffers is one more thing
  // for a candidate to misread as a fault.
  useEffect(() => {
    const el = new Audio(SOUND_CHECK_SRC);
    el.preload = "auto";
    el.load();
    clip.current = el;
    return () => {
      el.pause();
      el.removeAttribute("src");
      el.load();
      clip.current = null;
    };
  }, []);

  /** The fallback: see TEST_TONE. Never played while the clip works. */
  const playTestTone = useCallback(() => {
    try {
      const ctx = toneCtx.current ?? new AudioContext();
      toneCtx.current = ctx;
      // Started from a click, so the autoplay policy is satisfied — but a
      // context built on an earlier gesture can still come back suspended.
      void ctx.resume();
      const now = ctx.currentTime;
      for (const [i, hz] of TEST_TONE.entries()) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = hz;
        const at = now + i * NOTE_GAP;
        // An envelope, or every note starts and ends on a click.
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.22, at + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + NOTE_LEN);
        osc.connect(gain).connect(ctx.destination);
        osc.start(at);
        osc.stop(at + NOTE_LEN + 0.02);
      }
      setSpeaker("playing");
      if (toneTimer.current) window.clearTimeout(toneTimer.current);
      toneTimer.current = window.setTimeout(
        () => setSpeaker("played"),
        (TEST_TONE.length * NOTE_GAP + NOTE_LEN) * 1000,
      );
    } catch {
      // No Web Audio at all. Fall through to the "heard nothing?" advice rather
      // than leaving a button that visibly does nothing.
      setSpeaker("played");
    }
  }, []);

  const playSoundCheck = useCallback(() => {
    setSpeaker("playing");
    fellBack.current = false;
    const el = clip.current;
    if (!el) {
      playTestTone();
      return;
    }
    const disarm = () => {
      if (watchdog.current) window.clearTimeout(watchdog.current);
      watchdog.current = null;
    };
    // Rejecting, erroring and stalling are three routes to the same place, and
    // a blocked play can take more than one of them.
    const fallback = () => {
      if (fellBack.current) return;
      fellBack.current = true;
      disarm();
      el.pause();
      playTestTone();
    };
    disarm();
    el.onended = () => {
      disarm();
      setSpeaker("played");
    };
    el.onerror = fallback;
    // Sound is coming out; `ended` can be trusted to finish the job.
    el.onplaying = disarm;
    // Before metadata this only sets the start position, which is what we want
    // on a replay — but guard it, because a seek on an unloaded element throws
    // in some browsers.
    if (el.readyState > 0) el.currentTime = 0;
    void el.play().catch(fallback);
    watchdog.current = window.setTimeout(fallback, START_GRACE_MS);
  }, [playTestTone]);

  /* ----------------------- the microphone test ----------------------- */

  const [mic, setMic] = useState<MicState>("idle");
  const [heard, setHeard] = useState(false);
  const heardRef = useRef(false);
  /**
   * The meter is written straight to the DOM, not through state.
   *
   * It moves every animation frame; as a `useState` that is sixty React renders
   * a second on a screen that is also running a countdown.
   */
  const meterRef = useRef<HTMLDivElement | null>(null);
  const live = useRef<{ stream: MediaStream; ctx: AudioContext; raf: number } | null>(null);

  const stopMicTest = useCallback(() => {
    const m = live.current;
    if (!m) return;
    live.current = null;
    cancelAnimationFrame(m.raf);
    // RELEASE THE DEVICE. The interview re-acquires it moments later, which no
    // longer prompts now that permission has been granted — while a stream left
    // open holds the browser's recording indicator on through a test that is
    // over, which reads as "you are already being recorded".
    m.stream.getTracks().forEach((t) => t.stop());
    void m.ctx.close();
  }, []);

  const startMicTest = useCallback(async () => {
    if (mic === "asking" || mic === "live") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMic("unsupported");
      return;
    }
    setMic("asking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      // Deliberately NOT connected to ctx.destination: routing the microphone
      // back out of the speakers is a feedback loop for anyone not yet wearing
      // the headphones this screen is asking them to put on.
      const data = new Uint8Array(analyser.fftSize);

      const draw = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) {
          const d = (v - 128) / 128;
          sum += d * d;
        }
        const rms = Math.sqrt(sum / data.length);
        if (meterRef.current) {
          meterRef.current.style.width = `${Math.min(100, (rms / LOUD_RMS) * 100)}%`;
        }
        if (rms > SPEECH_RMS && !heardRef.current) {
          heardRef.current = true;
          setHeard(true);
        }
        if (live.current) live.current.raf = requestAnimationFrame(draw);
      };

      live.current = { stream, ctx, raf: 0 };
      setMic("live");
      live.current.raf = requestAnimationFrame(draw);
    } catch {
      // Blocked, dismissed, or no input device at all — one message covers all
      // three, because the candidate's next step is the same for each.
      setMic("denied");
    }
  }, [mic]);

  // Everything acquired here is handed back before the interview takes over.
  useEffect(
    () => () => {
      if (toneTimer.current) window.clearTimeout(toneTimer.current);
      if (watchdog.current) window.clearTimeout(watchdog.current);
      void toneCtx.current?.close();
      stopMicTest();
    },
    [stopMicTest],
  );

  // Full ring at the start, empty at zero.
  const offset = CIRCUMFERENCE * (1 - left / seconds);

  return (
    <section
      aria-labelledby="speaking-prep-title"
      className="fixed inset-0 z-[70] overflow-y-auto bg-paper"
    >
      {/* A wash of the Speaking accent, so the change of room is felt before it
          is read. Behind everything and ignored by assistive tech. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(60%_60%_at_50%_0%,hsl(var(--section-speaking)/0.10),transparent_70%)]"
      />

      <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col items-center justify-center gap-5 px-6 py-8 sm:gap-6 sm:py-10">
        <span className="chip chip-success">
          <Check className="size-3.5" /> Writing handed in
        </span>

        {/* ---- the clock ---- */}
        <div
          className="relative grid size-32 shrink-0 place-items-center sm:size-36"
          role="timer"
          aria-label={`Speaking starts in ${left} seconds`}
        >
          <svg viewBox="0 0 160 160" className="absolute inset-0 size-full -rotate-90">
            <circle cx="80" cy="80" r={RADIUS} fill="none" strokeWidth="6" className="stroke-line" />
            <circle
              cx="80"
              cy="80"
              r={RADIUS}
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              className="stroke-section-speaking transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <span className="flex flex-col items-center leading-none">
            <span
              className="text-4xl font-bold tabular-nums text-ink-strong sm:text-5xl"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {left}
            </span>
            <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              {left === 1 ? "second" : "seconds"}
            </span>
          </span>
        </div>

        {/* ---- what is happening ---- */}
        <div className="text-center">
          <h1 id="speaking-prep-title" className="text-xl font-bold text-ink-strong sm:text-2xl">
            Speaking starts automatically
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
            Test your sound and microphone now. Your examiner asks the first question as soon as
            the timer ends.
          </p>
        </div>

        <ul className="w-full space-y-2">
          {/* ---- speakers ---- */}
          <TestCard
            Icon={Headphones}
            title="Speakers or headphones"
            action={
              <TestButton onClick={playSoundCheck} disabled={speaker === "playing"}>
                <Volume2 className={cn("size-3.5", speaker === "playing" && "animate-pulse")} />
                {speaker === "playing"
                  ? "Playing…"
                  : speaker === "idle"
                    ? "Play test sound"
                    : "Play again"}
              </TestButton>
            }
          >
            {speaker === "played" ? (
              <Note tone="warn">
                Heard nothing? Turn the volume up and check the right output device is selected,
                then play it again.
              </Note>
            ) : (
              <Note>
                You should hear your examiner speak. Set the volume where you want it for the
                interview.
              </Note>
            )}
          </TestCard>

          {/* ---- microphone ---- */}
          <TestCard
            Icon={Mic}
            title="Microphone"
            action={
              mic === "live" ? null : (
                <TestButton onClick={() => void startMicTest()} disabled={mic === "asking"}>
                  <Mic className="size-3.5" />
                  {mic === "asking"
                    ? "Allow access…"
                    : mic === "idle"
                      ? "Test microphone"
                      : "Try again"}
                </TestButton>
              )
            }
          >
            {mic === "live" && (
              <>
                {/* Segmented by a mask rather than by sixteen elements, so one
                    `width` per frame is the whole animation. */}
                {/* Decorative to assistive tech ON PURPOSE. A bar that moves
                    sixty times a second is a visual affordance; the state worth
                    announcing is "we can hear you", which the note below says
                    once, through `role="status"`. */}
                <div
                  aria-hidden
                  className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-line/70 [mask-image:repeating-linear-gradient(90deg,#000_0_7px,transparent_7px_10px)]"
                >
                  <div
                    ref={meterRef}
                    className={cn(
                      "h-full w-0 rounded-full transition-[width] duration-75 ease-out",
                      heard ? "bg-success" : "bg-section-speaking",
                    )}
                  />
                </div>
                <Note tone={heard ? "ok" : undefined} live>
                  {heard
                    ? "We can hear you. Speak at about this volume during the interview."
                    : "Say something — the bar should move as you talk."}
                </Note>
              </>
            )}
            {mic === "denied" && (
              <Note tone="warn">
                Your browser blocked the microphone. Allow it from the padlock in the address bar,
                then test again — without it nothing you say is recorded.
              </Note>
            )}
            {mic === "unsupported" && (
              <Note tone="warn">
                This browser cannot reach a microphone. Sit the test in Chrome, Edge or Safari.
              </Note>
            )}
            {(mic === "idle" || mic === "asking") && (
              <Note>
                Sit an arm&rsquo;s length away, somewhere quiet. Background noise makes your answers
                harder to score.
              </Note>
            )}
          </TestCard>
        </ul>

        <p className="inline-flex items-start gap-2 text-center text-xs leading-relaxed text-ink-muted">
          <Lock className="mt-px size-3.5 shrink-0" />
          <span>
            The timer cannot be skipped. Speaking only moves forward — once a question has been
            asked you cannot go back to it.
          </span>
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */

function TestCard({
  Icon,
  title,
  action,
  children,
}: {
  Icon: typeof Mic;
  title: string;
  action: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-line bg-paper-elev px-4 py-3 shadow-[var(--shadow-xs)]">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-section-speaking-soft text-section-speaking">
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-ink">{title}</span>
          {action}
        </div>
        {children}
      </div>
    </li>
  );
}

function TestButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-section-speaking/50 hover:text-ink disabled:opacity-60 disabled:hover:border-line disabled:hover:text-ink-soft"
    >
      {children}
    </button>
  );
}

function Note({
  tone,
  live,
  children,
}: {
  tone?: "ok" | "warn";
  /** Announce changes — used where the note is the only report of a test result. */
  live?: boolean;
  children: React.ReactNode;
}) {
  return (
    <p
      role={live ? "status" : undefined}
      className={cn(
        "mt-1 flex items-start gap-1.5 text-xs leading-relaxed",
        tone === "ok" && "text-success",
        tone === "warn" && "text-warning",
        !tone && "text-ink-muted",
      )}
    >
      {tone === "ok" && <Check className="mt-px size-3.5 shrink-0" />}
      {tone === "warn" && <TriangleAlert className="mt-px size-3.5 shrink-0" />}
      <span>{children}</span>
    </p>
  );
}
