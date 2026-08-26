"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { Check, X, Flag, Headphones, ListChecks, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUESTION_TYPES, SECTIONS, showsInstruction, type QuestionTypeKey, type SectionKey } from "@/lib/ielts";
import type { Answer, CorrectAnswer, OptionsLayout, SetLayout } from "@/lib/question-content";
import { SetLayoutRenderer, layoutOwnsAnswers } from "./renderers/layouts";
import { QuestionInput, type RenderQuestion, type QuestionState } from "./renderers/question-input";
import { ReportQuestionButton } from "./report-question";
import { LabelMatrix } from "./renderers/label-matrix";
import { MatchingBoard } from "./renderers/matching-board";
import { SpeakingInterview } from "./renderers/speaking-interview";
import type { GapBinding, GapResolver } from "./renderers/gap-field";
import { HighlightablePassage } from "./renderers/highlightable-passage";

/**
 * The one renderer for a page of IELTS questions.
 *
 * WHY THIS EXISTS. Question practice and section practice drew the same
 * questions from two separate 500-line components. Both wrapped the same leaf
 * renderers, so the widgets were shared — but the ~250-line question card, the
 * matching board wiring, the gap resolver, the verdict icons and the stimulus
 * block existed twice, and a fix landed in whichever copy the author happened to
 * be in. Three real bugs came out of exactly that: section practice never
 * triggered AI scoring, Speaking Part 2 rendered no cue card there, and a bare
 * completion group printed its question number twice.
 *
 * WHAT DIFFERS IS NOW DECLARED, NOT DUPLICATED. The two surfaces genuinely are
 * not identical — one is a single task with an optional passage beside it, the
 * other is a Cambridge part carrying several task types under one recording —
 * so those differences are `BodyConfig` flags set by the two thin adapters
 * (SetBody, SectionBody). A flag is visible and reviewable; a second copy of the
 * file is not.
 *
 * THE COMMON MODEL IS THE SECTION'S. A set is simply a document with one group,
 * so nothing had to be flattened to make it fit.
 */

/* ------------------------------------------------------------------ *
 * The shape both surfaces map into
 * ------------------------------------------------------------------ */

export type BodyItem = {
  /** Key into the answers map: a question uuid for sets, the exam number for sections. */
  key: string;
  /** Exam number, which is what `[[n]]` gaps and the answer sheet use. */
  n: number;
  /** Marks this one input carries; 2 for a paired "choose TWO letters". */
  marks: number;
  questionType: QuestionTypeKey;
  prompt: string | null;
  content: Record<string, unknown> | null;
  wordLimitMin: number | null;
  prepSeconds: number | null;
  speakSeconds: number | null;
};

export type BodyGroup = {
  questionType: QuestionTypeKey;
  /** The exam's own wording for this run of questions. */
  instruction?: string;
  from: number;
  to: number;
  layout: SetLayout | null;
  items: BodyItem[];
};

export type BodyResult = {
  key: string;
  isCorrect: boolean | null;
  correctAnswer: unknown;
  explanation: string | null;
  /** Marks earned. Absent where a surface has no partial credit to report. */
  earned?: number;
  marks?: number;
  /** What was typed, for the inline feedback list. */
  your?: unknown;
};

export type BodyDoc = {
  sectionType: SectionKey;
  title: string;
  passageText: string | null;
  /** Already an app media path — never an `s3://` value. */
  audioSrc: string | null;
  imageSrc: string | null;
  groups: BodyGroup[];
};

export type BodyConfig = {
  /**
   * Which half to draw. The exam layout puts the stimulus in one pane and the
   * questions in the other, so it asks for them separately.
   */
  slot?: "all" | "stimulus" | "questions";
  /** Draw only this exam number — speaking is asked one question at a time. */
  focusNumber?: number | null;
  /** Per-group "Questions 1–10 / Note completion" band. */
  groupHeaders?: boolean;
  /** A single instruction line above everything, for a one-task document. */
  instructionText?: string | null;
  /** `mq` is what the mock palette scrolls to; `sq` is the section player's. */
  anchorPrefix: "mq" | "sq";
  /** Keep the recording reachable while scrolling through several groups. */
  stickyAudio?: boolean;
  /** Lettered labelling gets the answer grid; typed labelling does not. */
  labelMatrix?: boolean;
  /** Per-question "play this part" buttons, from a stored audio window. */
  clips?: boolean;
  /** Reading puts the passage beside the questions, each scrolling on its own. */
  splitStimulus?: boolean;
  /** Speaking Parts 1 and 3: an interview, one question at a time. */
  sequential?: boolean;
  /** Progress bar above the question list. */
  progressBar?: boolean;
  /** Where the report-a-problem button goes. */
  reportOn?: "row" | "feedback" | "none";
  /**
   * THREE SEPARATE DECISIONS about the same picture, which is why they are three
   * flags rather than one. Collapsing them silently dropped the chart from a
   * Writing Task 1 set.
   *
   * `layoutFallbackImage` — handed to SetLayoutRenderer so a diagram layout can
   *   draw pins on it.
   * `matrixImage` — handed to LabelMatrix, for a lettered labelling group that
   *   owns the figure itself.
   * `stimulusImage` — whether the shared stimulus block draws it at all. False
   *   when one of the two above is already drawing it, or it appears twice.
   */
  layoutFallbackImage?: string | null;
  matrixImage?: string | null;
  stimulusImage?: boolean;
  /** Feedback lists under gap-backed and matching groups, which answer inline. */
  inlineFeedback?: boolean;
  /**
   * Draw the item's prompt in the row, or leave it to the surface above.
   *
   * A Writing task's prompt IS the question, so the exam prints it once at the
   * top of the screen and gives the whole answer area to the editor. Repeating
   * it inside the row put the question and the generic "write at least 150
   * words" line on screen at the same time, in two different places.
   */
  itemPrompts?: boolean;
  /**
   * Let a single full-height answer (a Writing editor) grow to fill its pane so
   * the two sides of the split end level, rather than a short box sitting beside
   * a tall chart. Only meaningful for a one-item group.
   */
  fillHeight?: boolean;
  /**
   * Scale the stimulus figure to fit its pane instead of letting it overflow.
   *
   * At its natural aspect ratio a tall chart is taller than the pane, so the
   * candidate scrolls a picture they are supposed to take in at a glance — and
   * the bottom rows of a table sit off screen while they write about them. The
   * real paper prints the whole figure on the page.
   */
  fitStimulus?: boolean;
  /** Flagging is a mock-player affordance. */
  flagged?: Set<string>;
  onToggleFlag?: (key: string) => void;
  /**
   * Identity the passage's highlights and notes are stored against — the part
   * id. Supplying it turns the highlighter on; it is off during review, where
   * the marks are history rather than a working tool.
   */
  passageId?: string;
  /**
   * Which attempt the passage's highlights belong to — one mock sitting, or one
   * practice attempt. Both are required to offer the highlighter; see
   * `storageKey` in highlightable-passage.tsx for why the scope exists.
   */
  passageScope?: string;
};

/* ------------------------------------------------------------------ *
 * Small shared helpers — these were duplicated verbatim
 * ------------------------------------------------------------------ */

/** First accepted variant, for showing what the answer should have been. */
export function expectedText(ca: unknown): string | undefined {
  const a = ca as CorrectAnswer | null;
  if (!a) return undefined;
  if ("any" in a) return a.any[0];
  if ("value" in a) return a.value;
  if ("key" in a) return a.key;
  if ("index" in a) return String.fromCharCode(65 + a.index);
  if ("indices" in a) return a.indices.map((i) => String.fromCharCode(65 + i)).join(", ");
  return undefined;
}

export function stateFor(r: BodyResult | undefined): QuestionState {
  if (!r) return "idle";
  if (r.isCorrect === null) return "review";
  return r.isCorrect ? "correct" : "incorrect";
}

/** "21" for a normal item, "21-22" for one that carries two marks. */
function itemLabel(item: { n: number; marks: number }): string {
  return item.marks > 1 ? `${item.n}-${item.n + item.marks - 1}` : String(item.n);
}

/** The slice of the recording where one question is answered. */
type AudioWindow = { fromFrac: number; toFrac: number; approx?: boolean };

function windowOf(content: Record<string, unknown> | null): AudioWindow | null {
  const a = content?.audio as AudioWindow | undefined;
  return a && typeof a.fromFrac === "number" && typeof a.toFrac === "number" ? a : null;
}

/**
 * Play just the moment that answers one question.
 *
 * The window is stored as a fraction of the transcript, not seconds — the
 * element already knows the real duration, so nothing had to measure or slice
 * the audio. Padding is generous, and doubly so for a window that had to be
 * interpolated, because landing a few seconds late means the answer has already
 * been said.
 */
function useAudioClip(ref: React.RefObject<HTMLAudioElement | null>) {
  const stopAt = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTime = () => {
      if (stopAt.current !== null && el.currentTime >= stopAt.current) {
        el.pause();
        stopAt.current = null;
      }
    };
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [ref]);

  return useCallback(
    (w: AudioWindow) => {
      const el = ref.current;
      if (!el) return;
      const start = () => {
        if (!Number.isFinite(el.duration) || el.duration <= 0) return;
        const lead = w.approx ? 12 : 6;
        const tail = w.approx ? 8 : 4;
        stopAt.current = Math.min(el.duration, w.toFrac * el.duration + tail);
        el.currentTime = Math.max(0, w.fromFrac * el.duration - lead);
        void el.play();
      };
      // `preload="metadata"` usually has the duration already; if the browser
      // has not fetched it yet, wait for it rather than seeking into NaN.
      if (Number.isFinite(el.duration) && el.duration > 0) start();
      else el.addEventListener("loadedmetadata", start, { once: true });
    },
    [ref],
  );
}

/* ------------------------------------------------------------------ *
 * The body
 * ------------------------------------------------------------------ */

export function QuestionBody({
  doc,
  answers,
  results,
  onAnswer,
  onClearAnswer,
  config,
}: {
  doc: BodyDoc;
  answers: Record<string, Answer>;
  results: BodyResult[] | null;
  onAnswer: (key: string, value: Answer) => void;
  onClearAnswer?: (key: string) => void;
  config: BodyConfig;
}) {
  const disabled = results !== null;

  /**
   * Indexed, not scanned.
   *
   * A result is looked up once per question row, once per gap in the layout, and
   * again for every matching or labelling binding — so a linear `find` over the
   * results turned a 40-mark reading paper into ~1,600 comparisons on every
   * keystroke. Building the map once makes each lookup constant.
   */
  const resultByKey = useMemo(() => {
    const m = new Map<string, BodyResult>();
    for (const r of results ?? []) m.set(r.key, r);
    return m;
  }, [results]);
  const resultFor = useCallback((key: string) => resultByKey.get(key), [resultByKey]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playClip = useAudioClip(audioRef);

  const allItems = useMemo(() => doc.groups.flatMap((g) => g.items), [doc.groups]);
  /** Gaps bind by exam number, and every gap resolves through this. */
  const itemByNumber = useMemo(() => {
    const m = new Map<number, BodyItem>();
    for (const i of allItems) m.set(i.n, i);
    return m;
  }, [allItems]);
  const clipFor = useCallback(
    (item: BodyItem) => (config.clips && doc.audioSrc ? windowOf(item.content) : null),
    [config.clips, doc.audioSrc],
  );

  /** Gaps resolve by exam number across every group in the document. */
  const resolve: GapResolver = (number) => {
    const item = itemByNumber.get(number);
    if (!item) return null;
    const result = resultFor(item.key);
    const clip = clipFor(item);
    return {
      questionId: item.key,
      number,
      value: (answers[item.key]?.text as string) ?? "",
      disabled,
      state: stateFor(result),
      expected:
        result && result.isCorrect === false ? expectedText(result.correctAnswer) : undefined,
      onChange: (text) => onAnswer(item.key, { text }),
      ...(clip ? { playClip: () => playClip(clip) } : {}),
    } satisfies GapBinding;
  };

  const stimulus = (
    <Stimulus
      doc={doc}
      audioRef={audioRef}
      sticky={config.stickyAudio}
      showImage={config.stimulusImage !== false}
      fit={config.fitStimulus}
      // Only while the paper is live: once it is graded the passage is evidence,
      // and a highlighter over the top of it is just something else to misread.
      annotate={!disabled}
      passageId={config.passageId}
      passageScope={config.passageScope}
    />
  );

  if (config.slot === "stimulus") return stimulus;

  /* Speaking Parts 1 & 3 are an interview, not a list. */
  if (config.sequential) {
    return (
      <div className="space-y-5">
        <InstructionBar text={config.instructionText} section={doc.sectionType} />
        <SpeakingInterview
          topic={doc.title}
          questions={allItems.map(toRenderQuestion)}
          answers={answers}
          disabled={disabled}
          onAnswer={onAnswer}
        />
      </div>
    );
  }

  // Narrowed to the focused item, keeping its group so the instruction and any
  // shared layout still frame it.
  const groups =
    config.focusNumber == null
      ? doc.groups
      : doc.groups
          .filter((g) => g.items.some((i) => i.n === config.focusNumber))
          .map((g) => ({ ...g, items: g.items.filter((i) => i.n === config.focusNumber) }));

  const questionBlocks = (
    <div className={cn("space-y-6", config.fillHeight && "flex h-full min-h-0 flex-col")}>
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
          config={config}
          clipFor={clipFor}
          playClip={playClip}
        />
      ))}
    </div>
  );

  if (config.slot === "questions") return questionBlocks;

  return (
    <div className="space-y-5">
      <InstructionBar text={config.instructionText} section={doc.sectionType} />

      {config.splitStimulus && doc.passageText ? (
        // The real test puts the passage beside the questions, each scrolling
        // on its own. Stacks on narrow screens.
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            {stimulus}
          </div>
          <div>{questionBlocks}</div>
        </div>
      ) : (
        <>
          {stimulus}
          {questionBlocks}
        </>
      )}
    </div>
  );
}

function toRenderQuestion(item: BodyItem): RenderQuestion {
  return {
    id: item.key,
    number: item.n,
    questionType: item.questionType,
    prompt: item.prompt,
    content: item.content,
    wordLimitMin: item.wordLimitMin,
    prepSeconds: item.prepSeconds,
    speakSeconds: item.speakSeconds,
  };
}

/* ------------------------------------------------------------------ *
 * One group — its own instruction, its own layout
 * ------------------------------------------------------------------ */

/** One lookup table per group, for the labelling grid's number-keyed callbacks. */
function itemsByNumber(group: BodyGroup): Map<number, BodyItem> {
  const m = new Map<number, BodyItem>();
  for (const i of group.items) m.set(i.n, i);
  return m;
}

function GroupBlock({
  group,
  answers,
  resolve,
  disabled,
  resultFor,
  onAnswer,
  onClearAnswer,
  config,
  clipFor,
  playClip,
}: {
  group: BodyGroup;
  answers: Record<string, Answer>;
  resolve: GapResolver;
  disabled: boolean;
  resultFor: (key: string) => BodyResult | undefined;
  onAnswer: (key: string, value: Answer) => void;
  onClearAnswer?: (key: string) => void;
  config: BodyConfig;
  clipFor: (item: BodyItem) => AudioWindow | null;
  playClip: (w: AudioWindow) => void;
}) {
  const meta = QUESTION_TYPES[group.questionType];
  const optionsLayout = group.layout?.kind === "options" ? (group.layout as OptionsLayout) : null;
  // Gap-backed layouts collect every answer inline; listing the items again
  // below would put a second set of inputs on screen for the same marks.
  const showItemRows = !layoutOwnsAnswers(group.layout);
  // Two interactions, split by what the options ARE. Matching options are
  // phrases, so they are dragged from a bank onto a stem. Labelling options are
  // single letters printed on a picture, so they get the answer grid the real
  // sheet uses — nine columns of phrases would be unreadable, and nine columns
  // of letters read faster than any drag.
  const isMatching = meta?.family === "matching" && !!optionsLayout;
  const isLabelMatrix = Boolean(config.labelMatrix) && meta?.family === "labelling" && !!optionsLayout;
  const answered = group.items.filter((i) => answers[i.key] !== undefined).length;
  const byNumber = itemsByNumber(group);

  const range =
    group.from === group.to ? `Question ${group.from}` : `Questions ${group.from}-${group.to}`;

  return (
    <section className={cn("space-y-4", config.fillHeight && "flex min-h-0 flex-1 flex-col")}>
      {config.groupHeaders && (
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
          {showsInstruction(group.questionType) && (group.instruction ?? meta?.instruction) && (
            <p className="px-4 py-3 text-sm text-ink-strong">
              {group.instruction ?? meta?.instruction}
            </p>
          )}
        </div>
      )}

      {isLabelMatrix && optionsLayout ? (
        <LabelMatrix
          layout={optionsLayout}
          items={group.items.map((i) => ({ n: i.n, prompt: i.prompt ?? undefined }))}
          imageUrl={config.matrixImage ?? null}
          heading={group.instruction ?? undefined}
          disabled={disabled}
          anchorPrefix={config.anchorPrefix}
          bindingFor={(n) => {
            const item = byNumber.get(n);
            const r = item ? resultFor(item.key) : undefined;
            return {
              key: item ? (answers[item.key]?.key as string | undefined) : undefined,
              state: stateFor(r),
              expected: r && r.isCorrect === false ? expectedText(r.correctAnswer) : undefined,
            };
          }}
          onAssign={(n, key) => {
            const item = byNumber.get(n);
            if (item) onAnswer(item.key, { key });
          }}
          onClear={(n) => {
            const item = byNumber.get(n);
            if (item) onClearAnswer?.(item.key);
          }}
        />
      ) : isMatching && optionsLayout ? (
        <MatchingBoard
          layout={optionsLayout}
          items={group.items.map((i) => {
            const clip = clipFor(i);
            return {
              id: i.key,
              n: i.n,
              prompt: i.prompt ?? undefined,
              ...(clip ? { onPlayClip: () => playClip(clip) } : {}),
            };
          })}
          disabled={disabled}
          bindingFor={(id) => {
            const r = resultFor(id);
            return {
              key: answers[id]?.key as string | undefined,
              state: stateFor(r),
              expected: r && r.isCorrect === false ? expectedText(r.correctAnswer) : undefined,
            };
          }}
          onAssign={(id, key) => onAnswer(id, { key })}
          {...(onClearAnswer ? { onClear: (id: string) => onClearAnswer(id) } : {})}
        />
      ) : (
        <>
          {group.layout && (
            <SetLayoutRenderer
              layout={group.layout}
              resolve={resolve}
              fallbackImage={config.layoutFallbackImage ?? null}
            />
          )}

          {showItemRows && (
            <div className={cn("space-y-3", config.fillHeight && "flex min-h-0 flex-1 flex-col")}>
              {config.progressBar && !disabled && group.items.length > 1 && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-sunken">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${(answered / group.items.length) * 100}%` }}
                    />
                  </div>
                  <span className="shrink-0 tabular-nums text-ink-muted">
                    {answered} / {group.items.length} answered
                    {config.flagged && config.flagged.size > 0 && ` · ${config.flagged.size} flagged`}
                  </span>
                </div>
              )}
              <ol className={cn("space-y-4", config.fillHeight && "flex min-h-0 flex-1 flex-col")}>
                {group.items.map((item) => (
                  <ItemRow
                    key={item.key}
                    item={item}
                    result={resultFor(item.key)}
                    value={answers[item.key]}
                    disabled={disabled}
                    optionsLayout={optionsLayout}
                    onAnswer={onAnswer}
                    onClearAnswer={onClearAnswer}
                    config={config}
                    clip={clipFor(item)}
                    playClip={playClip}
                  />
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      {/* Gap-backed groups answer inline, so their feedback lives here. */}
      {config.inlineFeedback && !isMatching && !showItemRows && disabled && (
        <FeedbackList group={group} resultFor={resultFor} report={config.reportOn === "feedback"} />
      )}

      {/* The board shows right/wrong on each blank; the reasoning goes here. */}
      {config.inlineFeedback && isMatching && disabled && (
        <ul className="space-y-2">
          {group.items.map((item) => {
            const result = resultFor(item.key);
            if (!result?.explanation) return null;
            return (
              <li
                key={item.key}
                className="flex items-start gap-3 rounded-lg border border-line bg-paper-elev px-4 py-2.5 text-sm"
              >
                <Badge n={item.n} correct={result.isCorrect} />
                <p className="min-w-0 flex-1 text-xs text-ink-muted">{result.explanation}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * One question card — the block that was duplicated
 * ------------------------------------------------------------------ */

function ItemRow({
  item,
  result,
  value,
  disabled,
  optionsLayout,
  onAnswer,
  onClearAnswer,
  config,
  clip,
  playClip,
}: {
  item: BodyItem;
  result: BodyResult | undefined;
  value: Answer | undefined;
  disabled: boolean;
  optionsLayout: OptionsLayout | null;
  onAnswer: (key: string, value: Answer) => void;
  onClearAnswer?: (key: string) => void;
  config: BodyConfig;
  clip: AudioWindow | null;
  playClip: (w: AudioWindow) => void;
}) {
  const state = stateFor(result);
  // A completion gap prints its own number inside the field, so an outer badge
  // would show it twice.
  const numberInGap = QUESTION_TYPES[item.questionType]?.family === "completion";
  const flagged = config.flagged?.has(item.key) ?? false;
  /**
   * A Writing answer is one full-width editor. "Clear" there wipes 250 words on
   * a stray click, and there is nothing to flag for review when the task IS the
   * whole question, so the control gutter would only reserve dead space down the
   * right-hand side of the box. The wrapper collapses to zero width once empty.
   */
  const isWriting = QUESTION_TYPES[item.questionType]?.family === "writing";

  return (
    <li
      // Anchor for the question palette; scroll-mt clears the sticky header.
      id={numberInGap ? undefined : `${config.anchorPrefix}-${item.n}`}
      data-qnum={item.n}
      className={cn(
        "scroll-mt-28 rounded-xl border border-line bg-paper-elev p-4",
        flagged && "ring-1 ring-warning/60",
        config.fillHeight && "flex min-h-0 flex-1 flex-col",
      )}
    >
      <div
        className={cn(
          "flex gap-3",
          // `items-start` would pin the answer column to its own content height,
          // which silently defeats every flex-1 below it — the editor stayed a
          // small box in a full-height card. Stretch is what lets it fill.
          config.fillHeight ? "min-h-0 flex-1 items-stretch" : "items-start",
        )}
      >
        {!numberInGap && (
          <span
            className={cn(
              "grid h-7 min-w-7 shrink-0 place-items-center self-start rounded-full px-1.5 font-mono text-xs font-semibold tabular-nums",
              state === "idle" && "bg-brand-soft text-brand",
              state === "correct" && "bg-success text-white",
              state === "incorrect" && "bg-danger text-white",
              state === "review" && "bg-info text-white",
            )}
          >
            {itemLabel(item)}
          </span>
        )}
        <div className={cn("min-w-0 flex-1 space-y-3", config.fillHeight && "flex min-h-0 flex-col")}>
          {item.prompt && config.itemPrompts !== false && (
            <p className="text-sm font-medium text-ink">{item.prompt}</p>
          )}
          {clip && (
            <button
              type="button"
              onClick={() => playClip(clip)}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2 py-1 text-xs text-ink-soft transition-colors hover:border-brand/50 hover:text-ink"
            >
              <Volume2 className="size-3.5" />
              Play this part
            </button>
          )}
          <QuestionInput
            fill={config.fillHeight}
            question={toRenderQuestion(item)}
            value={value}
            disabled={disabled}
            state={state}
            options={optionsLayout}
            onChange={(v) => onAnswer(item.key, v)}
          />
          {result && <ResultNote result={result} />}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!disabled && onClearAnswer && value !== undefined && !isWriting && (
            <button
              type="button"
              onClick={() => onClearAnswer(item.key)}
              className="rounded-md px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-paper-sunken hover:text-ink"
            >
              Clear
            </button>
          )}
          {result && state !== "review" && (
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full",
                state === "correct" ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
              )}
              aria-label={state === "correct" ? "Correct" : "Incorrect"}
            >
              {state === "correct" ? <Check className="size-4" /> : <X className="size-4" />}
            </span>
          )}
          {config.onToggleFlag && !isWriting && (
            <button
              type="button"
              onClick={() => config.onToggleFlag?.(item.key)}
              title={flagged ? "Unflag" : "Flag for review"}
              aria-label="Flag for review"
              aria-pressed={flagged}
              className="grid size-7 place-items-center rounded-md text-ink-muted transition-colors hover:bg-paper-sunken hover:text-ink"
            >
              <Flag className={cn("size-4", flagged && "fill-warning text-warning")} />
            </button>
          )}
          {config.reportOn === "row" && <ReportQuestionButton questionId={item.key} />}
        </div>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ *
 * Feedback
 * ------------------------------------------------------------------ */

function Badge({ n, correct }: { n: number; correct: boolean | null }) {
  return (
    <span
      className={cn(
        "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums",
        correct ? "bg-success text-white" : "bg-danger text-white",
      )}
    >
      {n}
    </span>
  );
}

function FeedbackList({
  group,
  resultFor,
  report,
}: {
  group: BodyGroup;
  resultFor: (key: string) => BodyResult | undefined;
  report: boolean;
}) {
  return (
    <ul className="space-y-2">
      {group.items.map((item) => {
        const result = resultFor(item.key);
        if (!result) return null;
        return (
          <li
            key={item.key}
            className="flex items-start gap-3 rounded-lg border border-line bg-paper-elev px-4 py-2.5 text-sm"
          >
            <Badge n={item.n} correct={result.isCorrect} />
            <div className="min-w-0 flex-1">
              <ResultNote result={result} inline />
            </div>
            {report && <ReportQuestionButton questionId={item.key} />}
          </li>
        );
      })}
    </ul>
  );
}

function ResultNote({ result, inline }: { result: BodyResult; inline?: boolean }) {
  if (result.isCorrect === null) {
    return (
      <p className="rounded-lg bg-info-soft px-3 py-2 text-xs text-ink-soft">
        Submitted for AI band scoring.
      </p>
    );
  }
  const expected = expectedText(result.correctAnswer);
  const your = (result.your as { text?: string } | null)?.text;
  // A paired "choose TWO" can be half right. Reporting that as a plain wrong
  // answer hides a mark the candidate actually earned.
  const marks = result.marks ?? 1;
  const earned = result.earned ?? (result.isCorrect ? marks : 0);
  const partial = earned > 0 && earned < marks;

  return (
    <div className="space-y-1">
      {partial && (
        <p className="text-xs font-medium text-warning">
          {earned} of {marks} marks, one correct choice.
        </p>
      )}
      {result.isCorrect === false && expected && (
        <p className="text-xs text-ink-soft">
          {inline && your ? (
            <>
              You wrote <span className="font-medium text-danger">{your}</span>.{" "}
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
 * Chrome
 * ------------------------------------------------------------------ */

/**
 * The instruction line — verbatim exam wording, in the section's colour.
 *
 * Deliberately does NOT repeat "Section · Type": every caller already shows it
 * in its own chrome (the session top bar, the set page's heading), so printing
 * it here put the same line on screen twice.
 */
export function InstructionBar({ text, section }: { text: string | null | undefined; section: SectionKey }) {
  if (!text) return null;
  const sec = SECTIONS[section];
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-paper-elev p-4">
      {/* "Q", not a decorative icon: this bar carries the question itself for a
          Writing task, and a sparkle above a prompt reads as an ornament rather
          than a label. aria-hidden because the question follows immediately. */}
      <span
        aria-hidden
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold",
          `chip-${sec.accent}`,
        )}
      >
        Q
      </span>
      <p className="min-w-0 text-sm text-ink-strong">{text}</p>
    </div>
  );
}

/** Passage / audio / image — the one stimulus the whole document shares. */
function Stimulus({
  doc,
  audioRef,
  sticky,
  showImage = true,
  fit = false,
  annotate = false,
  passageId,
  passageScope,
}: {
  doc: BodyDoc;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  sticky?: boolean;
  /** False when a layout or question group draws the figure itself. */
  showImage?: boolean;
  /** Scale the figure down to fit the pane rather than overflowing it. */
  fit?: boolean;
  /** Offer the highlighter. Off once the paper is graded — see BodyConfig. */
  annotate?: boolean;
  /** What the annotations are filed under; required to offer them. */
  passageId?: string;
  /** Which attempt they belong to. Also required — see BodyConfig. */
  passageScope?: string;
}) {
  const sec = SECTIONS[doc.sectionType];
  const image = showImage ? doc.imageSrc : null;
  if (!doc.audioSrc && !image && !doc.passageText) return null;

  // Only a figure standing alone can take the pane's height. Beside a passage
  // or under a recording there is other content competing for it.
  const fitImage = fit && Boolean(image) && !doc.passageText;

  return (
    <div className={cn("space-y-4", fitImage && "flex h-full min-h-0 flex-col")}>
      {doc.audioSrc && (
        <div
          className={cn(
            "rounded-xl border border-line bg-paper-elev p-4",
            // Sticky: the recording is the stimulus for every group below it, so
            // it must stay reachable while scrolling from a table into the notes.
            sticky && "sticky top-2 z-20 bg-paper-elev/95 shadow-[var(--shadow-md)] backdrop-blur",
          )}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className={cn("grid size-7 place-items-center rounded-lg", `chip-${sec.accent}`)}>
              <Headphones className="size-3.5" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Audio: plays once in the real test
            </p>
          </div>
          {/* Auth-gated route → short-lived presigned S3 URL; bucket never exposed. */}
          <audio ref={audioRef} controls preload="metadata" src={doc.audioSrc} className="w-full" />
        </div>
      )}

      {image && (
        <div
          className={cn(
            "overflow-hidden rounded-xl border border-line",
            fitImage && "flex min-h-0 flex-1 items-center justify-center p-2",
          )}
        >
          <Image
            // Same auth-gated indirection as the audio: the stored value is a
            // private s3:// object, which no <img> can load directly.
            src={image}
            alt={doc.title}
            width={1000}
            height={640}
            className={cn(
              "object-contain",
              // Bounded by BOTH axes so the whole figure lands inside the pane;
              // `w-full` alone forces the natural aspect ratio and overflows.
              fitImage ? "max-h-full min-h-0 w-auto max-w-full" : "h-auto w-full",
            )}
            unoptimized
          />
        </div>
      )}

      {doc.passageText &&
        (annotate && passageId && passageScope ? (
          // Selection is enabled here so the highlighter can work; copying is
          // still refused and the browser's own menu still suppressed.
          <HighlightablePassage id={passageId} scope={passageScope} text={doc.passageText} />
        ) : (
          // Copy-protected: auth-gated practice content only (never on indexed
          // pages). Read-only review keeps the stricter, unselectable version.
          <article
            className="select-none whitespace-pre-line rounded-xl border border-line bg-paper-elev p-5 text-sm leading-relaxed text-ink-soft"
            onCopy={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {doc.passageText}
          </article>
        ))}
    </div>
  );
}
