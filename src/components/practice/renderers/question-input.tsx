"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { storeSpeakingRecording } from "@/app/actions/speaking";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  countWords,
  QUESTION_TYPES,
  truncateToWords,
  writingWordCap,
  type QuestionTypeKey,
} from "@/lib/ielts";
import type { Answer, OptionsLayout } from "@/lib/question-content";
import { GapField, type GapBinding } from "./gap-field";
import { AnnotatedText } from "./annotations";

export type RenderQuestion = {
  id: string;
  number: number;
  questionType: QuestionTypeKey;
  prompt: string | null;
  content: Record<string, unknown> | null;
  wordLimitMin: number | null;
  prepSeconds: number | null;
  speakSeconds: number | null;
  /** Gated path to the examiner asking it; speaking only. */
  promptAudioSrc?: string | null;
};

export type QuestionState = "idle" | "correct" | "incorrect" | "review";

type InputProps = {
  question: RenderQuestion;
  value: Answer | undefined;
  disabled: boolean;
  state: QuestionState;
  /** The set's shared option box, when the type matches against one. */
  options: OptionsLayout | null;
  onChange: (v: Answer) => void;
  /**
   * Grow to fill the height available instead of sizing to content. Set for a
   * Writing task in the split layout, where a fixed 12-row box left the editor
   * ending well short of the chart beside it.
   */
  fill?: boolean;
};

/* ------------------------------------------------------------------ *
 * Choice types
 * ------------------------------------------------------------------ */

function ChoiceRow({
  letter,
  text,
  selected,
  disabled,
  multi,
  state,
  onSelect,
  onDeselect,
  run,
}: {
  letter: string;
  text: string;
  selected: boolean;
  disabled: boolean;
  multi: boolean;
  state: QuestionState;
  onSelect: () => void;
  /**
   * Activating the option you already chose. Rows no longer carry a "Clear"
   * button, so clicking your own answer again is the way back to blank.
   */
  onDeselect?: () => void;
  /** Makes the option text highlightable. See annotations.tsx. */
  run?: string;
}) {
  // After grading, the SELECTED option reflects correctness (green/red);
  // while answering it's the neutral brand highlight.
  const selectedRow =
    state === "correct"
      ? "border-success bg-success-soft"
      : state === "incorrect"
        ? "border-danger bg-danger-soft"
        : "border-brand bg-brand-soft";
  const selectedBadge =
    state === "correct" ? "bg-success text-white" : state === "incorrect" ? "bg-danger text-white" : "bg-brand text-white";

  return (
    <label
      // DRAGGING ACROSS THE OPTION IS A HIGHLIGHT, NOT AN ANSWER. Selecting
      // text inside a <label> still activates its control on mouse-up, so
      // marking an option would have silently chosen it. A live selection that
      // started in this row means the gesture was a highlight; swallow the
      // activation and leave the answer alone.
      onClick={(e) => {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.anchorNode && e.currentTarget.contains(sel.anchorNode)) {
          e.preventDefault();
        }
      }}
      className={cn(
        "relative flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
        selected ? selectedRow : "border-line hover:bg-paper-sunken",
        disabled && "cursor-default",
      )}
    >
      <input
        type={multi ? "checkbox" : "radio"}
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
        // A radio that is already checked fires no change event, so the
        // deselect has to be read off the click itself. A checkbox does fire,
        // and its own handler toggles, so it must not be double-handled here.
        onClick={() => {
          if (selected && !multi) onDeselect?.();
        }}
        className="sr-only"
      />
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded font-mono text-[11px] font-semibold",
          selected ? selectedBadge : "bg-paper-sunken text-ink-muted",
        )}
      >
        {letter}
      </span>
      <span className="text-ink-soft">
        <AnnotatedText run={run} text={text} />
      </span>
    </label>
  );
}

function SingleChoice({ question, value, disabled, state, onChange }: InputProps) {
  const options = (question.content?.options as string[]) ?? [];
  const selected = value?.index as number | undefined;
  return (
    <div className="space-y-2">
      {options.map((opt, i) => (
        <ChoiceRow
          key={i}
          letter={String.fromCharCode(65 + i)}
          text={opt}
          selected={selected === i}
          disabled={disabled}
          multi={false}
          state={state}
          onSelect={() => onChange({ index: i })}
          // An empty answer reads as "cleared" upstream — same contract the
          // drag-and-drop bank uses when you empty a slot.
          onDeselect={() => onChange({})}
          run={`q${question.id}:o${i}`}
        />
      ))}
    </div>
  );
}

function MultiChoice({ question, value, disabled, state, onChange }: InputProps) {
  const options = (question.content?.options as string[]) ?? [];
  const selectCount = (question.content?.selectCount as number) ?? 2;
  const chosen = (value?.indices as number[]) ?? [];

  const toggle = (i: number) => {
    const next = new Set(chosen);
    if (next.has(i)) next.delete(i);
    // Choosing a third when the paper says "choose TWO" is a mistake the real
    // interface prevents, so block it rather than marking it wrong later.
    else if (next.size < selectCount) next.add(i);
    onChange({ indices: [...next].sort((a, b) => a - b) });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-ink-muted">
        Choose {selectCount}: {chosen.length} of {selectCount} selected
      </p>
      {options.map((opt, i) => (
        <ChoiceRow
          key={i}
          letter={String.fromCharCode(65 + i)}
          text={opt}
          selected={chosen.includes(i)}
          disabled={disabled || (!chosen.includes(i) && chosen.length >= selectCount)}
          multi
          state={state}
          onSelect={() => toggle(i)}
          run={`q${question.id}:o${i}`}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Judgement types — True/False/Not Given, Yes/No/Not Given
 * ------------------------------------------------------------------ */

function Judgement({ question, value, disabled, state, onChange }: InputProps) {
  const meta = QUESTION_TYPES[question.questionType];
  const choices =
    (question.content?.choices as string[]) ??
    (meta.family === "tfng" ? ["True", "False", "Not Given"] : ["Yes", "No", "Not Given"]);
  const selected = value?.value as string | undefined;

  return (
    <div className="flex flex-wrap gap-2">
      {choices.map((c) => (
        <button
          key={c}
          type="button"
          disabled={disabled}
          // Clicking the answer you already gave takes the question back to
          // blank, which is what the removed per-row "Clear" button did.
          onClick={() => onChange(selected === c ? {} : { value: c })}
          className={cn(
            "rounded-md border px-4 py-1.5 text-sm font-medium transition-colors",
            selected === c
              ? state === "correct"
                ? "border-success bg-success text-white"
                : state === "incorrect"
                  ? "border-danger bg-danger text-white"
                  : "border-brand bg-brand text-white"
              : "border-line text-ink-soft hover:bg-paper-sunken",
            disabled && "cursor-default",
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Matching — answers against the set's shared option box
 * ------------------------------------------------------------------ */

function Matching({ question, value, disabled, state, options, onChange }: InputProps) {
  // Fall back to question-level options so a set without a shared box still works.
  const list =
    options?.options ?? ((question.content?.options as { key: string; text: string }[]) ?? []);
  const selected = (value?.key as string | undefined) ?? "";

  // Fallback only. A matching group that has a shared option box renders as a
  // drag-and-drop board (MatchingBoard) — this path covers the odd item that
  // carries its own options. Either way it is never a dropdown: IELTS has no
  // dropdowns, and one would hide the choices behind a click.
  return (
    <div
      role="radiogroup"
      aria-label={`Question ${question.number}`}
      className="flex flex-wrap gap-1.5"
    >
      {list.map((o) => {
        const isOn = selected === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={isOn}
            disabled={disabled}
            title={o.text}
            onClick={() => onChange({ key: isOn ? "" : o.key })}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors",
              isOn && state === "idle" && "border-brand bg-brand-soft text-brand",
              isOn && state === "correct" && "border-success/60 bg-success-soft text-success",
              isOn && state === "incorrect" && "border-danger/60 bg-danger-soft text-danger",
              !isOn && "border-line bg-paper-elev text-ink-soft hover:border-brand/50",
              disabled && "cursor-default",
            )}
          >
            <span className="font-mono text-[11px] font-semibold">{o.key}</span>
            <span className="max-w-[16rem] truncate">{o.text}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Short answer — a single typed gap
 * ------------------------------------------------------------------ */

function ShortAnswer({ question, value, disabled, state, onChange }: InputProps) {
  const binding: GapBinding = {
    questionId: question.id,
    number: question.number,
    value: (value?.text as string) ?? "",
    disabled,
    state,
    onChange: (text) => onChange({ text }),
  };
  return <GapField binding={binding} width="lg" />;
}

/* ------------------------------------------------------------------ *
 * Writing
 * ------------------------------------------------------------------ */

function Writing({ question, value, disabled, onChange, fill }: InputProps) {
  const text = (value?.text as string) ?? "";
  const words = countWords(text);
  const min = question.wordLimitMin ?? 0;
  const under = min > 0 && words < min;
  // Nothing past this is marked: the AI examiner is sent the first `max` words
  // and no more (see `writingWordCap`), so the box stops taking input there
  // rather than letting someone write a thousand words no one will read. A
  // paste over the limit is cut to it on the spot.
  const max = writingWordCap(question.questionType, question.wordLimitMin);
  const atMax = words >= max;

  const setText = (raw: string) => {
    const next = countWords(raw) > max ? truncateToWords(raw, max) : raw;
    onChange({ text: next, words: countWords(next) });
  };

  return (
    <div className={cn("space-y-2", fill && "flex h-full min-h-0 flex-col")}>
      <Textarea
        rows={fill ? undefined : 12}
        disabled={disabled}
        value={text}
        placeholder="Write your response here…"
        onChange={(e) => setText(e.target.value)}
        /*
         * NO WRITING AID OF ANY KIND. The real test gives none, and spelling and
         * grammatical accuracy are two of the four things Writing is marked on —
         * so a red squiggle under a misspelling is not a convenience, it is the
         * examiner's job done for the candidate. Practising with it produces a
         * band the real exam will not reproduce.
         *
         * `data-gramm` and friends turn off Grammarly, which is the same problem
         * an order of magnitude larger and is installed on a great many machines.
         * The gap fields already do this (see gap-field.tsx); the essay editor is
         * where it matters most and was the one place still missing it.
         */
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        className={cn(
          "leading-relaxed",
          // Filling the pane, the drag handle would fight the layout; sized to
          // content, it is the only way to make a 12-row box bigger.
          fill ? "min-h-0 flex-1 resize-none" : "resize-y",
        )}
      />
      <div className="flex items-center justify-between text-xs">
        <span className={cn("font-mono tabular-nums", under ? "text-danger" : "text-ink-muted")}>
          {words} {words === 1 ? "word" : "words"}
        </span>
        {atMax ? (
          <span className="text-danger">Limit reached: only the first {max} words are marked.</span>
        ) : (
          min > 0 && (
            <span className="text-ink-muted">
              {under ? `${min - words} more to reach the ${min}-word minimum` : `Minimum ${min} met`}
            </span>
          )
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Speaking
 * ------------------------------------------------------------------ */

function Speaking({ question, value, disabled, onChange }: InputProps) {
  const cue = question.content?.cueCard as { topic: string; bullets: string[] } | undefined;
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [prepLeft, setPrepLeft] = useState<number | null>(null); // null = not preparing
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const prepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Guards against two overlapping start() calls. See start(). */
  const startingRef = useRef(false);
  // `elapsed` is stale inside MediaRecorder's onstop closure.
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;

  /**
   * ONE INSTANCE SERVES EVERY QUESTION, so nothing here may be left over.
   *
   * Speaking is asked one question at a time — SpeakingInterview renders only
   * the current one, and section practice narrows to the focused number — which
   * puts each successive question at the SAME position in the tree. React
   * therefore reuses this component instead of remounting it, and every piece of
   * state below survives the change. Left alone, opening question 2 showed
   * question 1's recording, offered "Re-record" instead of "Record answer", and
   * played back an answer to a question no longer on screen.
   *
   * That persistence is worth keeping rather than defeating with a remount: it
   * is what lets each question's own take stay playable while the candidate
   * moves around the interview. So takes are cached BY QUESTION ID, and the view
   * is re-seeded from that cache whenever the question changes.
   */
  const blobs = useRef<Map<string, string>>(new Map());
  // Read inside effects/callbacks that must not re-run on every render.
  const valueRef = useRef(value);
  valueRef.current = value;
  const currentIdRef = useRef(question.id);
  currentIdRef.current = question.id;
  /** Which question the in-flight take belongs to, fixed when recording starts. */
  const takeForRef = useRef<string | null>(null);
  /** That question's onChange, likewise fixed at start. */
  const sinkRef = useRef(onChange);

  // Show THIS question's take, or a clean slate when it has none.
  useEffect(() => {
    const cached = blobs.current.get(question.id) ?? null;
    const answered = (valueRef.current?.recorded as boolean | undefined) === true;
    setUrl(cached);
    // An answer recorded on an earlier visit still counts as recorded once its
    // blob is gone (a reload drops object URLs), so the button offers
    // "Re-record" rather than pretending nothing was said.
    setRecorded(answered || cached !== null);
    setRecording(false);
    setUploading(false);
    setElapsed(0);
    setPrepLeft(null);
    setError(null);
  }, [question.id]);

  // Leaving a question — by navigating or by unmounting — must not lose the take
  // or leave the microphone open. Stopping fires `onstop`, which uploads and
  // reports the answer against the question it was recorded FOR, not whatever
  // happens to be on screen by the time it finishes.
  useEffect(
    () => () => {
      if (recRef.current?.state === "recording") recRef.current.stop();
      if (timer.current) clearInterval(timer.current);
      if (prepTimer.current) clearInterval(prepTimer.current);
    },
    [question.id],
  );

  // Object URLs are revoked only when the whole recorder goes away. Revoking on
  // every `url` change would destroy the cache the moment another question was
  // opened, which is the exact thing the cache exists to prevent.
  useEffect(
    () => () => {
      for (const u of blobs.current.values()) URL.revokeObjectURL(u);
      blobs.current.clear();
    },
    [],
  );

  const prep = question.prepSeconds ?? 0;
  const limit = question.speakSeconds ?? 0;

  // Stop automatically at the speaking limit — the real test cuts you off.
  useEffect(() => {
    if (recording && limit > 0 && elapsed >= limit) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, recording, limit]);

  const startPrep = () => {
    setError(null);
    if (prep <= 0) {
      start();
      return;
    }
    setPrepLeft(prep);
    prepTimer.current = setInterval(() => {
      // PURE. This updater only computes the next number.
      //
      // It used to call start() from in here when the count reached zero, which
      // is a side effect inside a state updater — and React may run an updater
      // more than once for a single tick (StrictMode does it deliberately, in
      // development, to surface exactly this). So the recording started TWICE:
      // two MediaRecorders, and two `elapsed` intervals, the first of each
      // orphaned the moment its ref was overwritten and therefore beyond the
      // reach of stop(). `elapsed` then climbed at two per second, so the
      // speaking clock ran to 2:00 in one real minute and cut the candidate off
      // halfway through their long turn.
      //
      // Reaching zero is handled by the effect below instead.
      setPrepLeft((s) => (s === null ? null : Math.max(0, s - 1)));
    }, 1000);
  };

  // Preparation running out starts the recording — as its own effect, never as a
  // side effect of the countdown above. `start` is idempotent, so a re-run
  // cannot open a second recorder.
  useEffect(() => {
    if (prepLeft !== 0) return;
    if (prepTimer.current) {
      clearInterval(prepTimer.current);
      prepTimer.current = null;
    }
    start();
    // `start` is re-created every render; listing it would re-run this on each
    // one. Only the countdown reaching zero should trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepLeft]);

  const skipPrep = () => {
    if (prepTimer.current) clearInterval(prepTimer.current);
    setPrepLeft(null);
    start();
  };

  const start = async () => {
    // IDEMPOTENT, and it has to be. Two overlapping starts leave two open
    // microphone streams and two interval timers, and stop() can only ever
    // reach the last of each — the rest keep running, keep the mic light on,
    // and keep incrementing the clock. The flag is set synchronously, before
    // the first await, so a second synchronous call cannot slip past it; the
    // recorder-state check covers a later one.
    if (startingRef.current || recRef.current?.state === "recording") return;
    startingRef.current = true;

    setPrepLeft(null);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      // Bind the take to this question NOW. A recording stopped by navigating
      // away finishes after the question has already changed, and `onChange` by
      // then belongs to the next question — reporting through it would file the
      // take under the wrong number.
      const forQuestion = question.id;
      takeForRef.current = forQuestion;
      sinkRef.current = onChange;

      chunks.current = [];
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        const objectUrl = URL.createObjectURL(blob);
        // Re-recording replaces this question's take; drop the old object URL.
        const previous = blobs.current.get(forQuestion);
        if (previous) URL.revokeObjectURL(previous);
        blobs.current.set(forQuestion, objectUrl);
        stream.getTracks().forEach((t) => t.stop());

        // Only touch the view while this take's question is the one displayed.
        const onScreen = () => currentIdRef.current === forQuestion;
        if (onScreen()) {
          setUrl(objectUrl);
          setRecorded(true);
          setUploading(true);
        }

        // Upload immediately: the answer must carry a durable audio location,
        // not a blob URL that dies with the page. The score is computed on the
        // server after submit — never sent from here.
        const durationSec = elapsedRef.current;
        const report = sinkRef.current;
        // Reported immediately so the interview can move on, but FLAGGED: the
        // answer has no storage location yet, and submitting in this state would
        // save a recording that cannot be scored. `anyUploadPending` keeps the
        // submit button shut until the flag clears.
        report({ recorded: true, durationSec, pendingUpload: true });
        try {
          const fd = new FormData();
          fd.append("audio", blob, "answer.webm");
          const res = await storeSpeakingRecording(fd);
          if ("error" in res) {
            // Clear the flag either way — a failed upload must not wedge submit
            // shut forever. The answer stays without a URL, which the report
            // screen shows as "Not scored" rather than waiting on it.
            report({ recorded: true, durationSec, uploadFailed: true });
            if (onScreen()) {
              // A plan block is not a broken upload, and must not be dressed as
              // one: nothing went wrong, the recording simply has nowhere to be
              // marked. The server's sentence already says so.
              setError(res.blocked ? res.error : `Couldn't save the recording: ${res.error}`);
            }
          } else {
            report({ recorded: true, durationSec, audioUrl: res.audioUrl });
          }
        } catch {
          report({ recorded: true, durationSec, uploadFailed: true });
          if (onScreen()) {
            setError("Couldn't save the recording. Check your connection and re-record.");
          }
        } finally {
          if (onScreen()) setUploading(false);
        }
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      setElapsed(0);
      // Clear before replacing: an interval whose ref has been overwritten can
      // never be stopped again, and it goes on incrementing `elapsed`.
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      setError("Microphone access is required to record your answer.");
    } finally {
      startingRef.current = false;
    }
  };

  const stop = () => {
    recRef.current?.stop();
    setRecording(false);
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const preparing = prepLeft !== null;
  const remaining = limit > 0 ? Math.max(0, limit - elapsed) : 0;
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  // Part 2 gives a preparation minute; Parts 1/3 (no cue card / no prep) don't.
  const hasPrep = prep > 0 && !!cue;

  return (
    <div className="space-y-3">
      {cue && (
        <div className="rounded-xl border border-line bg-paper-sunken p-4">
          <p className="font-medium text-ink">{cue.topic}</p>
          <p className="mt-2 text-sm text-ink-muted">You should say:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-soft">
            {cue.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preparation countdown (IELTS Part 2 long turn) */}
      {preparing && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/40 bg-brand-soft p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">Preparation time</p>
            <p className="mt-0.5 text-sm text-ink-soft">
              Make notes: recording starts automatically when the timer ends.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl tabular-nums text-ink">{mmss(prepLeft ?? 0)}</span>
            <Button type="button" variant="outline" size="sm" onClick={skipPrep}>
              Start speaking now
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {recording ? (
          <Button type="button" variant="destructive" onClick={stop}>
            <Square className="h-4 w-4" /> Stop · {mmss(elapsed)}
            {limit > 0 && <span className="ml-1 opacity-70">/ {mmss(limit)}</span>}
          </Button>
        ) : (
          !preparing && (
            <Button
              type="button"
              variant={recorded ? "outline" : "default"}
              disabled={disabled || uploading}
              onClick={recorded ? start : hasPrep ? startPrep : start}
            >
              <Mic className="h-4 w-4" />{" "}
              {recorded ? "Re-record" : hasPrep ? `Prepare (${mmss(prep)})` : "Record answer"}
            </Button>
          )
        )}
        {uploading && (
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
            <Loader2 className="size-3.5 animate-spin" /> Saving recording…
          </span>
        )}
        {url && !recording && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio controls src={url} className="h-9" />
        )}
      </div>

      {/* Talk-time countdown bar while recording */}
      {recording && limit > 0 && (
        <div className="space-y-1">
          <div className="progress-track">
            <div
              className={cn(
                "progress-fill transition-[width] duration-1000 ease-linear",
                remaining <= 10 && "!bg-danger",
              )}
              style={{ width: `${Math.min(100, (elapsed / limit) * 100)}%` }}
            />
          </div>
          <p className={cn("text-right font-mono text-xs tabular-nums", remaining <= 10 ? "text-danger" : "text-ink-muted")}>
            {mmss(remaining)} left
          </p>
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Dispatcher
 * ------------------------------------------------------------------ */

export function QuestionInput(props: InputProps) {
  const meta = QUESTION_TYPES[props.question.questionType];
  switch (meta.family) {
    case "single":
      return <SingleChoice {...props} />;
    case "multi":
      return <MultiChoice {...props} />;
    case "tfng":
    case "ynng":
      return <Judgement {...props} />;
    case "matching":
      return <Matching {...props} />;
    case "completion":
      return <ShortAnswer {...props} />;
    case "writing":
      return <Writing {...props} />;
    case "speaking":
      return <Speaking {...props} />;
    default:
      return null;
  }
}
