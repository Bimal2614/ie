"use client";

import { useCallback } from "react";
import Image from "next/image";
import { Check, X, Headphones, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUESTION_TYPES, SECTIONS, type QuestionTypeKey, type SectionKey } from "@/lib/ielts";
import type { Answer, CorrectAnswer, OptionsLayout, SetLayout } from "@/lib/question-content";
import { SetLayoutRenderer, layoutOwnsAnswers } from "./renderers/layouts";
import { QuestionInput, type RenderQuestion, type QuestionState } from "./renderers/question-input";
import { ReportQuestionButton } from "./report-question";
import { MatchingBoard } from "./renderers/matching-board";
import type { GapBinding, GapResolver } from "./renderers/gap-field";
import type { SectionItemResult } from "@/app/actions/section-practice";

/** One group as the client sees it — the answer key has been stripped. */
export type ClientGroup = {
  questionType: string;
  instruction?: string;
  from: number;
  to: number;
  layout?: SetLayout | null;
  items: {
    n: number;
    prompt?: string;
    options?: string[];
    selectCount?: number;
    marks?: number;
    wordLimitMin?: number;
    prepSeconds?: number;
    speakSeconds?: number;
    cueCard?: { topic: string; bullets: string[] };
  }[];
};

export type ClientSectionView = {
  id: string;
  sectionType: SectionKey;
  title: string;
  partNumber: number | null;
  instructions: string | null;
  audioUrl: string | null;
  passageText: string | null;
  imageUrl: string | null;
  startNumber: number;
  endNumber: number;
  totalQuestions: number;
  questions: { groups: ClientGroup[] };
};

/** First accepted variant, for showing what the answer should have been. */
function expectedText(ca: unknown): string | undefined {
  const a = ca as CorrectAnswer | null;
  if (!a) return undefined;
  if ("any" in a) return a.any[0];
  if ("value" in a) return a.value;
  if ("key" in a) return a.key;
  if ("index" in a) return String.fromCharCode(65 + a.index);
  if ("indices" in a) return a.indices.map((i) => String.fromCharCode(65 + i)).join(", ");
  return undefined;
}

/** "21" for a normal item, "21-22" for one that carries two marks. */
function itemLabel(item: { n: number; marks?: number }): string {
  const m = item.marks ?? 1;
  return m > 1 ? `${item.n}-${item.n + m - 1}` : String(item.n);
}

function stateFor(r: SectionItemResult | undefined): QuestionState {
  if (!r) return "idle";
  if (r.isCorrect === null) return "review";
  return r.isCorrect ? "correct" : "incorrect";
}

/**
 * Renders one practice section: the single stimulus it shares, then each
 * question group in turn.
 *
 * This is the piece the old SetBody could not do — a Cambridge part is one
 * recording answered as a table completion AND a note completion, so the
 * instruction line and the layout belong to the GROUP, not to the section.
 * Gaps still bind by exam number, so `[[7]]` finds item 7 whichever group it
 * sits in and numbering runs continuously across the whole part.
 */
export function SectionBody({
  section,
  answers,
  results,
  onAnswer,
  onClearAnswer,
  slot = "all",
  focusNumber,
  groupHeaders = true,
}: {
  section: ClientSectionView;
  answers: Record<string, Answer>;
  results: SectionItemResult[] | null;
  onAnswer: (n: number, value: Answer) => void;
  onClearAnswer?: (n: number) => void;
  /**
   * Which half to draw. The exam layout puts the passage or recording in one
   * pane and the questions in the other, so it asks for them separately; the
   * default renders both, one after the other.
   */
  slot?: "all" | "stimulus" | "questions";
  /**
   * Show only the item with this exam number. Speaking is an interview: the
   * examiner asks one question, and putting all seven on screen lets a
   * candidate read ahead and rehearse — the habit the real test punishes.
   */
  focusNumber?: number | null;
  /**
   * Draw each group's own "Questions 1-10 / Note completion / instruction"
   * band. The exam layout already shows exactly that above the panes, so a
   * single-group part would print it twice — but a part mixing two or three
   * task types still needs one per group to tell them apart.
   */
  groupHeaders?: boolean;
}) {
  const disabled = results !== null;
  const resultFor = useCallback(
    (n: number) => results?.find((r) => r.n === n),
    [results],
  );

  /** Gaps resolve by exam number across every group in the section. */
  const resolve: GapResolver = (number) => {
    const known = section.questions.groups.some((g) => g.items.some((i) => i.n === number));
    if (!known) return null;
    const key = String(number);
    const result = resultFor(number);
    const binding: GapBinding = {
      questionId: key,
      number,
      value: (answers[key]?.text as string) ?? "",
      disabled,
      state: stateFor(result),
      expected:
        result && result.isCorrect === false ? expectedText(result.correctAnswer) : undefined,
      onChange: (text) => onAnswer(number, { text }),
    };
    return binding;
  };

  if (slot === "stimulus") return <Stimulus section={section} />;

  // Narrowed to the focused item, keeping its group so the instruction and any
  // shared layout still frame it.
  const groups =
    focusNumber == null
      ? section.questions.groups
      : section.questions.groups
          .filter((g) => g.items.some((i) => i.n === focusNumber))
          .map((g) => ({ ...g, items: g.items.filter((i) => i.n === focusNumber) }));

  return (
    <div className="space-y-6">
      {slot === "all" && <Stimulus section={section} />}

      {groups.map((group, gi) => (
        <GroupBlock
          key={gi}
          group={group}
          answers={answers}
          resolve={resolve}
          disabled={disabled}
          resultFor={resultFor}
          onAnswer={onAnswer}
          onClearAnswer={onClearAnswer}
          showHeader={groupHeaders}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * One group — its own instruction, its own layout
 * ------------------------------------------------------------------ */

function GroupBlock({
  group,
  answers,
  resolve,
  disabled,
  resultFor,
  onAnswer,
  onClearAnswer,
  showHeader,
}: {
  group: ClientGroup;
  answers: Record<string, Answer>;
  resolve: GapResolver;
  disabled: boolean;
  resultFor: (n: number) => SectionItemResult | undefined;
  onAnswer: (n: number, value: Answer) => void;
  onClearAnswer?: (n: number) => void;
  showHeader: boolean;
}) {
  const meta = QUESTION_TYPES[group.questionType as QuestionTypeKey];
  const optionsLayout = group.layout?.kind === "options" ? (group.layout as OptionsLayout) : null;
  // Gap-backed layouts collect every answer inline; listing the items again
  // below would put a second set of inputs on screen for the same marks.
  const showItemRows = !layoutOwnsAnswers(group.layout ?? null);
  // Every matching type (features / headings / information / sentence endings)
  // answers against a shared option bank, so they all get the board. Map and
  // diagram labelling is the same interaction — drag a letter from a box onto a
  // stem — so it joins them whenever it supplies that box.
  const isMatching =
    meta?.family === "matching" || (meta?.family === "labelling" && !!optionsLayout);
  const answered = group.items.filter((i) => answers[String(i.n)] !== undefined).length;

  const range =
    group.from === group.to ? `Question ${group.from}` : `Questions ${group.from}–${group.to}`;

  return (
    <section className="space-y-4">
      {/* ── Group header: the exam's own wording, in its own band ── */}
      {showHeader && (
      <div className="overflow-hidden rounded-xl border border-line bg-paper-elev">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper-sunken px-4 py-2.5">
          <div className="flex items-center gap-2">
            <ListChecks className="size-4 text-ink-muted" />
            <h2 className="font-display text-sm font-semibold text-ink-strong">{range}</h2>
            <span className="chip chip-brand">{meta?.label ?? group.questionType}</span>
          </div>
          {!disabled && (
            <span className="text-xs tabular-nums text-ink-muted">
              {answered} / {group.items.length} answered
            </span>
          )}
        </div>
        {(group.instruction ?? meta?.instruction) && (
          <p className="px-4 py-3 text-sm text-ink-strong">
            {group.instruction ?? meta?.instruction}
          </p>
        )}
      </div>
      )}

      {/* Matching is a board, not a list of inputs: the stems and the option
          bank are one interaction, so it replaces both the options layout and
          the per-item rows the generic path would render. */}
      {isMatching && optionsLayout ? (
        <MatchingBoard
          layout={optionsLayout}
          items={group.items.map((i) => ({ id: String(i.n), n: i.n, prompt: i.prompt }))}
          disabled={disabled}
          bindingFor={(id) => {
            const r = resultFor(Number(id));
            return {
              key: answers[id]?.key as string | undefined,
              state: stateFor(r),
              expected:
                r && r.isCorrect === false ? expectedText(r.correctAnswer) : undefined,
            };
          }}
          onAssign={(id, key) => onAnswer(Number(id), { key })}
          onClear={(id) => onClearAnswer?.(Number(id))}
        />
      ) : (
        <>
          {group.layout && (
            <SetLayoutRenderer layout={group.layout} resolve={resolve} fallbackImage={null} />
          )}

          {showItemRows && (
        <ol className="space-y-4">
          {group.items.map((item) => {
            const result = resultFor(item.n);
            const state = stateFor(result);
            const key = String(item.n);
            const rq: RenderQuestion = {
              id: key,
              number: item.n,
              questionType: group.questionType as QuestionTypeKey,
              prompt: item.prompt ?? null,
              content: item.options
                ? { options: item.options, selectCount: item.selectCount }
                : null,
              wordLimitMin: item.wordLimitMin ?? null,
              prepSeconds: item.prepSeconds ?? null,
              speakSeconds: item.speakSeconds ?? null,
            };

            return (
              <li
                key={item.n}
                id={`sq-${item.n}`}
                data-qnum={item.n}
                className="scroll-mt-28 rounded-xl border border-line bg-paper-elev p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "grid h-7 min-w-7 shrink-0 place-items-center rounded-full px-1.5 font-mono text-xs font-semibold tabular-nums",
                      state === "idle" && "bg-brand-soft text-brand",
                      state === "correct" && "bg-success text-white",
                      state === "incorrect" && "bg-danger text-white",
                      state === "review" && "bg-info text-white",
                    )}
                  >
                    {itemLabel(item)}
                  </span>
                  <div className="min-w-0 flex-1 space-y-3">
                    {item.prompt && <p className="text-sm font-medium text-ink">{item.prompt}</p>}
                    <QuestionInput
                      question={rq}
                      value={answers[key]}
                      disabled={disabled}
                      state={state}
                      options={optionsLayout}
                      onChange={(v) => onAnswer(item.n, v)}
                    />
                    {result && <ResultNote result={result} />}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!disabled && onClearAnswer && answers[key] !== undefined && (
                      <button
                        type="button"
                        onClick={() => onClearAnswer(item.n)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-paper-sunken hover:text-ink"
                      >
                        Clear
                      </button>
                    )}
                    {result && state !== "review" && (
                      <span
                        className={cn(
                          "grid size-6 place-items-center rounded-full",
                          state === "correct"
                            ? "bg-success-soft text-success"
                            : "bg-danger-soft text-danger",
                        )}
                        aria-label={state === "correct" ? "Correct" : "Incorrect"}
                      >
                        {state === "correct" ? <Check className="size-4" /> : <X className="size-4" />}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
          )}
        </>
      )}

      {/* Gap-backed groups answer inline, so their feedback lives here. */}
      {!isMatching && !showItemRows && disabled && (
        <ul className="space-y-2">
          {group.items.map((item) => {
            const result = resultFor(item.n);
            if (!result) return null;
            return (
              <li
                key={item.n}
                className="flex items-start gap-3 rounded-lg border border-line bg-paper-elev px-4 py-2.5 text-sm"
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums",
                    result.isCorrect ? "bg-success text-white" : "bg-danger text-white",
                  )}
                >
                  {item.n}
                </span>
                <div className="min-w-0 flex-1">
                  <ResultNote result={result} inline />
                </div>
                <ReportQuestionButton questionId={`${item.n}`} />
              </li>
            );
          })}
        </ul>
      )}

      {/* The board shows right/wrong on each blank; the reasoning goes here. */}
      {isMatching && disabled && (
        <ul className="space-y-2">
          {group.items.map((item) => {
            const result = resultFor(item.n);
            if (!result?.explanation) return null;
            return (
              <li
                key={item.n}
                className="flex items-start gap-3 rounded-lg border border-line bg-paper-elev px-4 py-2.5 text-sm"
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums",
                    result.isCorrect ? "bg-success text-white" : "bg-danger text-white",
                  )}
                >
                  {item.n}
                </span>
                <p className="min-w-0 flex-1 text-xs text-ink-muted">{result.explanation}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ResultNote({ result, inline }: { result: SectionItemResult; inline?: boolean }) {
  if (result.isCorrect === null) {
    return (
      <p className="rounded-lg bg-info-soft px-3 py-2 text-xs text-ink-soft">
        Submitted for AI band scoring.
      </p>
    );
  }
  const expected = expectedText(result.correctAnswer);
  const your = (result.your as { text?: string } | null)?.text;
  return (
    <div className="space-y-1">
      {result.isCorrect === false && (
        <p className="text-xs text-ink-soft">
          {inline && your ? (
            <>
              You wrote <span className="font-medium text-danger">{your}</span> —{" "}
            </>
          ) : null}
          Correct answer: <span className="font-medium text-success">{expected}</span>
        </p>
      )}
      {result.isCorrect && inline && your && (
        <p className="text-xs text-ink-soft">
          <span className="font-medium text-success">{your}</span>
        </p>
      )}
      {result.explanation && <p className="text-xs text-ink-muted">{result.explanation}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The one stimulus the whole section shares
 * ------------------------------------------------------------------ */

function Stimulus({ section }: { section: ClientSectionView }) {
  const sec = SECTIONS[section.sectionType];
  const hasAudio = Boolean(section.audioUrl);
  if (!hasAudio && !section.imageUrl && !section.passageText) return null;

  return (
    <div className="space-y-4">
      {hasAudio && (
        // Sticky: the recording is the stimulus for every group below it, so it
        // must stay reachable while scrolling from the table into the notes.
        <div className="sticky top-2 z-20 rounded-xl border border-line bg-paper-elev/95 p-4 shadow-[var(--shadow-md)] backdrop-blur">
          <div className="mb-2 flex items-center gap-2">
            <span className={cn("grid size-7 place-items-center rounded-lg", `chip-${sec.accent}`)}>
              <Headphones className="size-3.5" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Audio — plays once in the real test
            </p>
          </div>
          {/* Auth-gated route → short-lived presigned S3 URL; bucket never exposed. */}
          <audio
            controls
            preload="none"
            src={`/api/practice/audio/${section.id}`}
            className="w-full"
          />
        </div>
      )}

      {section.imageUrl && (
        <div className="overflow-hidden rounded-xl border border-line">
          <Image
            // Same auth-gated indirection as the audio: the stored value may be
            // a private s3:// object, which no <img> can load directly.
            src={`/api/practice/image/${section.id}`}
            alt={section.title}
            width={1000}
            height={640}
            className="h-auto w-full object-contain"
            unoptimized
          />
        </div>
      )}

      {section.passageText && (
        // Copy-protected: auth-gated practice content only.
        <article
          className="select-none whitespace-pre-line rounded-xl border border-line bg-paper-elev p-5 text-sm leading-relaxed text-ink-soft"
          onCopy={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {section.passageText}
        </article>
      )}
    </div>
  );
}
