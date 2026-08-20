"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { storeSpeakingRecording } from "@/app/actions/speaking";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { QUESTION_TYPES, type QuestionTypeKey } from "@/lib/ielts";
import type { Answer, OptionsLayout } from "@/lib/question-content";
import { GapField, type GapBinding } from "./gap-field";

export type RenderQuestion = {
  id: string;
  number: number;
  questionType: QuestionTypeKey;
  prompt: string | null;
  content: Record<string, unknown> | null;
  wordLimitMin: number | null;
  prepSeconds: number | null;
  speakSeconds: number | null;
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
}: {
  letter: string;
  text: string;
  selected: boolean;
  disabled: boolean;
  multi: boolean;
  state: QuestionState;
  onSelect: () => void;
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
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
        selected ? selectedRow : "border-line hover:bg-paper-sunken",
        disabled && "cursor-default",
      )}
    >
      <input
        type={multi ? "checkbox" : "radio"}
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
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
      <span className="text-ink-soft">{text}</span>
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
        Choose {selectCount} — {chosen.length} of {selectCount} selected
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
          onClick={() => onChange({ value: c })}
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

function Writing({ question, value, disabled, onChange }: InputProps) {
  const text = (value?.text as string) ?? "";
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const min = question.wordLimitMin ?? 0;
  const under = min > 0 && words < min;

  return (
    <div className="space-y-2">
      <Textarea
        rows={12}
        disabled={disabled}
        value={text}
        placeholder="Write your response here…"
        onChange={(e) => onChange({ text: e.target.value, words })}
        className="resize-y leading-relaxed"
      />
      <div className="flex items-center justify-between text-xs">
        <span className={cn("font-mono tabular-nums", under ? "text-danger" : "text-ink-muted")}>
          {words} {words === 1 ? "word" : "words"}
        </span>
        {min > 0 && (
          <span className="text-ink-muted">
            {under ? `${min - words} more to reach the ${min}-word minimum` : `Minimum ${min} met`}
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Speaking
 * ------------------------------------------------------------------ */

function Speaking({ question, disabled, onChange }: InputProps) {
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
  // `elapsed` is stale inside MediaRecorder's onstop closure.
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;

  const prep = question.prepSeconds ?? 0;
  const limit = question.speakSeconds ?? 0;

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      if (prepTimer.current) clearInterval(prepTimer.current);
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  // Leaving mid-recording must not lose the take or leave the microphone open.
  // Stopping here fires `onstop`, which uploads and reports the answer to the
  // parent — still mounted — exactly as pressing Stop would. Empty deps so it
  // runs on unmount only, never when `url` changes.
  useEffect(
    () => () => {
      if (recRef.current?.state === "recording") recRef.current.stop();
    },
    [],
  );

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
      setPrepLeft((s) => {
        if (s === null) return null;
        if (s <= 1) {
          if (prepTimer.current) clearInterval(prepTimer.current);
          start();
          return null;
        }
        return s - 1;
      });
    }, 1000);
  };

  const skipPrep = () => {
    if (prepTimer.current) clearInterval(prepTimer.current);
    setPrepLeft(null);
    start();
  };

  const start = async () => {
    setPrepLeft(null);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        setUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        setRecorded(true);

        // Upload immediately: the answer must carry a durable audio location,
        // not a blob URL that dies with the page. The score is computed on the
        // server after submit — never sent from here.
        setUploading(true);
        const durationSec = elapsedRef.current;
        onChange({ recorded: true, durationSec });
        try {
          const fd = new FormData();
          fd.append("audio", blob, "answer.webm");
          const res = await storeSpeakingRecording(fd);
          if ("error" in res) setError(`Couldn't save the recording: ${res.error}`);
          else onChange({ recorded: true, durationSec, audioUrl: res.audioUrl });
        } catch {
          setError("Couldn't save the recording. Check your connection and re-record.");
        } finally {
          setUploading(false);
        }
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      setElapsed(0);
      timer.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      setError("Microphone access is required to record your answer.");
    }
  };

  const stop = () => {
    recRef.current?.stop();
    setRecording(false);
    if (timer.current) clearInterval(timer.current);
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
              Make notes — recording starts automatically when the timer ends.
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
