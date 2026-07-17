import { Check, X, Mic } from "lucide-react";
import { QUESTION_TYPES, type QuestionTypeKey } from "@/lib/ielts";
import type { SetLayout, OptionsLayout } from "@/lib/question-content";

/**
 * Renders a stored attempt back into something a human can read.
 *
 * The `response` and `correctAnswer` jsonb are shaped by the question's family
 * ({index}, {indices}, {value}, {key}, {text}), so each family needs its own
 * translation back to "you picked B — Green space supports wellbeing".
 */
/** What scoreSpeaking stores in `aiFeedback` for a speaking answer. */
type SpeakingFeedback = {
  criteria?: {
    fluencyCoherence?: number;
    lexicalResource?: number;
    grammar?: number;
    pronunciation?: number;
  };
  relevance?: number | null;
  speed?: number | null;
};

export function AttemptAnswers({
  questionType,
  content,
  correctAnswer,
  response,
  layout,
  gapNumber,
  isCorrect,
  transcript,
  audioUrl,
  aiFeedback = null,
}: {
  questionType: QuestionTypeKey;
  content: unknown;
  correctAnswer: unknown;
  response: unknown;
  layout: SetLayout | null;
  gapNumber: number | null;
  isCorrect: boolean | null;
  transcript: string | null;
  audioUrl: string | null;
  aiFeedback?: unknown;
}) {
  const meta = QUESTION_TYPES[questionType];
  const family = meta.family;
  const ans = (response ?? {}) as Record<string, unknown>;
  const ca = (correctAnswer ?? {}) as Record<string, unknown>;
  const c = (content ?? {}) as Record<string, unknown>;

  /* ---- Writing: show the essay, not a diff ---- */
  if (family === "writing") {
    const text = (ans.text as string) ?? "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return (
      <Block title="Your response">
        {text ? (
          <>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{text}</p>
            <p className="mt-3 font-mono text-xs tabular-nums text-ink-muted">{words} words</p>
          </>
        ) : (
          <Empty />
        )}
      </Block>
    );
  }

  /* ---- Speaking: the recording, its transcript, and the AI criteria ---- */
  if (family === "speaking") {
    const fb = (aiFeedback ?? null) as SpeakingFeedback | null;
    const criteria = fb?.criteria;
    return (
      <Block title="Your response">
        {ans.recorded ? (
          <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Mic className="size-4" />
            Recorded {String(ans.durationSec ?? "?")}s
            {/* Recordings live in a private bucket; playback needs a signed URL. */}
            {!audioUrl && " — recording not stored."}
          </p>
        ) : (
          <p className="text-sm italic text-ink-muted">No recording captured.</p>
        )}

        {transcript && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              What we heard
            </p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
              {transcript}
            </p>
          </div>
        )}

        {criteria && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Fluency", criteria.fluencyCoherence],
              ["Lexical", criteria.lexicalResource],
              ["Grammar", criteria.grammar],
              ["Pronunciation", criteria.pronunciation],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg bg-paper-sunken p-2 text-center">
                <p className="text-[10px] uppercase tracking-wider text-ink-muted">{label}</p>
                <p className="display text-lg tabular-nums text-ink">{String(value ?? "—")}</p>
              </div>
            ))}
          </div>
        )}
      </Block>
    );
  }

  /* ---- Objective types: yours vs correct ---- */
  const options = (c.options as string[]) ?? [];
  const optionBox = layout?.kind === "options" ? (layout as OptionsLayout) : null;

  const describe = (v: Record<string, unknown>, isAnswer: boolean): string | null => {
    switch (family) {
      case "single": {
        const i = v.index as number | undefined;
        if (i === undefined) return null;
        return `${letter(i)}${options[i] ? ` — ${options[i]}` : ""}`;
      }
      case "multi": {
        const idx = v.indices as number[] | undefined;
        if (!idx?.length) return null;
        return idx.map((i) => `${letter(i)}${options[i] ? ` — ${options[i]}` : ""}`).join("\n");
      }
      case "tfng":
      case "ynng":
        return (v.value as string) ?? null;
      case "matching": {
        const key = v.key as string | undefined;
        if (!key) return null;
        const hit = optionBox?.options.find((o) => o.key === key);
        return `${key}${hit ? ` — ${hit.text}` : ""}`;
      }
      case "completion":
      case "labelling":
        // The answer is typed text; the key is every accepted variant.
        return isAnswer
          ? ((v.text as string) ?? (v.key as string) ?? null)
          : ((v.any as string[]) ?? []).join("  ·  ") || null;
      default:
        return null;
    }
  };

  const yours = describe(ans, true);
  const expected = describe(ca, false);
  const acceptedNote =
    (family === "completion" || family === "labelling") &&
    ((ca.any as string[])?.length ?? 0) > 1;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Block
        title={gapNumber ? `Your answer (Q${gapNumber})` : "Your answer"}
        tone={isCorrect === null ? "plain" : isCorrect ? "correct" : "incorrect"}
      >
        {yours ? (
          <p className="whitespace-pre-line text-sm text-ink">{yours}</p>
        ) : (
          <Empty label="No answer given" />
        )}
      </Block>

      <Block title="Correct answer" tone="correct">
        {expected ? (
          <>
            <p className="whitespace-pre-line text-sm text-ink">{expected}</p>
            {acceptedNote && (
              <p className="mt-2 text-xs text-ink-muted">Any of these was accepted.</p>
            )}
          </>
        ) : (
          <Empty label="Not recorded" />
        )}
      </Block>
    </div>
  );
}

function letter(i: number): string {
  return String.fromCharCode(65 + i);
}

function Block({
  title,
  tone = "plain",
  children,
}: {
  title: string;
  tone?: "plain" | "correct" | "incorrect";
  children: React.ReactNode;
}) {
  const border =
    tone === "correct"
      ? "border-success/40"
      : tone === "incorrect"
        ? "border-danger/40"
        : "border-line";
  return (
    <div className={`rounded-xl border ${border} bg-paper-elev p-4`}>
      <div className="mb-2 flex items-center gap-1.5">
        {tone === "correct" && <Check className="size-3.5 text-success" />}
        {tone === "incorrect" && <X className="size-3.5 text-danger" />}
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Empty({ label = "Nothing recorded" }: { label?: string }) {
  return <p className="text-sm italic text-ink-muted">{label}</p>;
}
