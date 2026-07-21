import { Check, X, Mic, ArrowRight } from "lucide-react";
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

/** What scoreWriting stores in `aiFeedback` for a writing answer. */
type WritingCriterionFB = { band?: number; summary?: string; strengths?: string[]; improvements?: string[] };
type WritingFeedback = {
  onTask?: boolean;
  overallFeedback?: string;
  criteria?: {
    taskResponse?: WritingCriterionFB;
    coherenceCohesion?: WritingCriterionFB;
    lexicalResource?: WritingCriterionFB;
    grammaticalRange?: WritingCriterionFB;
  };
  corrections?: { quote: string; issue: string; fix: string }[];
  improvedExamples?: { original: string; improved: string }[];
  nextSteps?: string[];
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

  /* ---- Writing: the essay + the full AI examiner analysis ---- */
  if (family === "writing") {
    const text = (ans.text as string) ?? "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const fb = (aiFeedback ?? null) as WritingFeedback | null;
    return (
      <div className="space-y-4">
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
        {fb && <WritingAnalysis fb={fb} isTask2={questionType === "writing_task2"} />}
      </div>
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

/** The AI examiner analysis for a writing answer — criteria, corrections, rewrites, next steps. */
function WritingAnalysis({ fb, isTask2 }: { fb: WritingFeedback; isTask2: boolean }) {
  const c = fb.criteria ?? {};
  const criteria: [string, WritingCriterionFB | undefined][] = [
    [isTask2 ? "Task Response" : "Task Achievement", c.taskResponse],
    ["Coherence & Cohesion", c.coherenceCohesion],
    ["Lexical Resource", c.lexicalResource],
    ["Grammatical Range & Accuracy", c.grammaticalRange],
  ];

  return (
    <div className="rounded-xl border border-line bg-paper-elev p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">AI examiner analysis</p>

      {fb.overallFeedback && (
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{fb.overallFeedback}</p>
      )}

      {/* Criteria */}
      <div className="mt-4 space-y-3">
        {criteria.map(([label, cr]) =>
          cr ? (
            <div key={label} className="rounded-lg border border-line p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">{label}</p>
                <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-sm font-semibold tabular-nums text-brand">
                  {typeof cr.band === "number" ? cr.band.toFixed(1) : "—"}
                </span>
              </div>
              {cr.summary && <p className="mt-1.5 text-sm text-ink-soft">{cr.summary}</p>}
              {(cr.strengths?.length || cr.improvements?.length) && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <ul className="space-y-1">
                    {cr.strengths?.map((s) => (
                      <li key={s} className="flex gap-1.5 text-xs text-ink-soft"><Check className="mt-0.5 size-3 shrink-0 text-green" />{s}</li>
                    ))}
                  </ul>
                  <ul className="space-y-1">
                    {cr.improvements?.map((s) => (
                      <li key={s} className="flex gap-1.5 text-xs text-ink-soft"><ArrowRight className="mt-0.5 size-3 shrink-0 text-brand" />{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null,
        )}
      </div>

      {/* Corrections */}
      {fb.corrections && fb.corrections.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Corrections</p>
          <ul className="mt-2 space-y-2">
            {fb.corrections.map((cor, i) => (
              <li key={i} className="rounded-lg bg-paper-sunken p-3 text-sm">
                <span className="text-danger line-through">{cor.quote}</span>
                <span className="mx-2 text-ink-muted">→</span>
                <span className="font-medium text-ink">{cor.fix}</span>
                {cor.issue && <p className="mt-1 text-xs text-ink-muted">{cor.issue}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upgraded sentences */}
      {fb.improvedExamples && fb.improvedExamples.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Band-raising rewrites</p>
          <ul className="mt-2 space-y-2">
            {fb.improvedExamples.map((ex, i) => (
              <li key={i} className="rounded-lg border border-line p-3 text-sm">
                <p className="text-ink-muted">{ex.original}</p>
                <p className="mt-1 flex gap-1.5 text-ink"><ArrowRight className="mt-0.5 size-3.5 shrink-0 text-green" />{ex.improved}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next steps */}
      {fb.nextSteps && fb.nextSteps.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Your next half-band</p>
          <ul className="mt-2 space-y-1.5">
            {fb.nextSteps.map((s) => (
              <li key={s} className="flex gap-2 text-sm text-ink-soft"><Check className="mt-0.5 size-3.5 shrink-0 text-green" />{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
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
