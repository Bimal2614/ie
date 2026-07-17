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
  onSelect,
}: {
  letter: string;
  text: string;
  selected: boolean;
  disabled: boolean;
  multi: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
        selected ? "border-brand bg-brand-soft" : "border-line hover:bg-paper-sunken",
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
          selected ? "bg-brand text-white" : "bg-paper-sunken text-ink-muted",
        )}
      >
        {letter}
      </span>
      <span className="text-ink-soft">{text}</span>
    </label>
  );
}

function SingleChoice({ question, value, disabled, onChange }: InputProps) {
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
          onSelect={() => onChange({ index: i })}
        />
      ))}
    </div>
  );
}

function MultiChoice({ question, value, disabled, onChange }: InputProps) {
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
          onSelect={() => toggle(i)}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Judgement types — True/False/Not Given, Yes/No/Not Given
 * ------------------------------------------------------------------ */

function Judgement({ question, value, disabled, onChange }: InputProps) {
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
              ? "border-brand bg-brand text-white"
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

  return (
    <select
      aria-label={`Question ${question.number}`}
      value={selected}
      disabled={disabled}
      onChange={(e) => onChange({ key: e.target.value })}
      className={cn(
        "h-9 w-full max-w-sm rounded-md border bg-paper-elev px-2 text-sm text-ink outline-none",
        "focus:border-brand focus:ring-2 focus:ring-brand/20",
        state === "idle" && "border-line",
        state === "correct" && "border-success/50 bg-success-soft",
        state === "incorrect" && "border-danger/50 bg-danger-soft",
      )}
    >
      <option value="">Select…</option>
      {list.map((o) => (
        <option key={o.key} value={o.key}>
          {o.key} — {o.text}
        </option>
      ))}
    </select>
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
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // `elapsed` is stale inside MediaRecorder's onstop closure.
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  const start = async () => {
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

  const limit = question.speakSeconds ?? 0;

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
      <div className="flex items-center gap-3">
        {!recording ? (
          <Button
            type="button"
            variant={recorded ? "outline" : "default"}
            disabled={disabled || uploading}
            onClick={start}
          >
            <Mic className="h-4 w-4" /> {recorded ? "Re-record" : "Record answer"}
          </Button>
        ) : (
          <Button type="button" variant="destructive" onClick={stop}>
            <Square className="h-4 w-4" /> Stop · {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
            {String(elapsed % 60).padStart(2, "0")}
            {limit > 0 && <span className="ml-1 opacity-70">/ {Math.floor(limit / 60)}:{String(limit % 60).padStart(2, "0")}</span>}
          </Button>
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
