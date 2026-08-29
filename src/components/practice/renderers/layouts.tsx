"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type {
  SetLayout,
  InlineBlanksLayout,
  NotesLayout,
  TableLayout,
  FormLayout,
  FlowchartLayout,
  DiagramLayout,
  OptionsLayout,
} from "@/lib/question-content";
import { GapField, GapText, type GapResolver } from "./gap-field";
import { AnnotatedText } from "./annotations";
import { ChoiceBank, ChoiceBankProvider, ChoiceSlot } from "./choice-bank";

/**
 * Every layout renderer takes the same three things.
 *
 * `run` is the id its annotations are filed under — one per authored string,
 * derived from where the string sits in the layout so it is the same id on
 * every render. See annotations.tsx.
 */
type LayoutProps<T> = { layout: T; resolve: GapResolver; run: string };

/** Heading used above every structured layout — matches the printed paper. */
function LayoutHeading({ children, run }: { children?: string; run?: string }) {
  if (!children) return null;
  return (
    <p className="mb-4 text-center text-sm font-semibold uppercase tracking-[0.12em] text-ink-strong">
      <AnnotatedText run={run} text={children} />
    </p>
  );
}

/** The paper-like frame every structured stimulus sits in. */
function Sheet({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-line bg-paper-elev p-5", className)}>{children}</div>
  );
}

/* ------------------------------------------------------------------ *
 * Summary / sentence completion — prose with gaps in it
 * ------------------------------------------------------------------ */

function InlineBlanks({ layout, resolve, run }: LayoutProps<InlineBlanksLayout>) {
  return (
    <Sheet>
      <LayoutHeading run={`${run}:h`}>{layout.heading}</LayoutHeading>
      <div className="space-y-3">
        {layout.blocks.map((block, i) => (
          <p key={i} className="text-sm text-ink-soft">
            <GapText text={block} resolve={resolve} run={`${run}:b${i}`} />
          </p>
        ))}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ *
 * Note completion — indented outline, as candidates see while listening
 * ------------------------------------------------------------------ */

function Notes({ layout, resolve, run }: LayoutProps<NotesLayout>) {
  return (
    <Sheet>
      {/* The paper's own hierarchy, in the paper's own order: a title, the
          worked answer it gives away, then sections of notes. Rendered flat
          — every line an identical bullet — the title and the example read as
          the first two things to fill in. */}
      {layout.heading && (
        <p className="mb-4 border-b border-line pb-2.5 text-[15px] font-bold tracking-wide text-ink-strong">
          <AnnotatedText run={`${run}:h`} text={layout.heading} />
        </p>
      )}

      {layout.example && (
        // Given, not asked. Dashed and set apart so it can never be mistaken
        // for a note with a blank in it.
        <div className="mb-6 rounded-lg border border-dashed border-line bg-paper-sunken px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Example
          </p>
          <p className="mt-1 text-sm italic leading-relaxed text-ink-muted">
            <AnnotatedText run={`${run}:ex`} text={layout.example} />
          </p>
        </div>
      )}

      <div className="space-y-6">
        {layout.groups.map((group, gi) => (
          <div key={gi}>
            {group.title && (
              // A left rule rather than a bare bold line: it ties the heading
              // to the notes beneath it, which a long page of sections needs.
              <p className="mb-2.5 border-l-2 border-brand/60 pl-2.5 text-sm font-bold text-ink-strong">
                {/* A heading can hold a gap, so it renders through GapText too. */}
                <GapText text={group.title} resolve={resolve} run={`${run}:t${gi}`} />
              </p>
            )}
            <ul className={cn("space-y-2.5", group.title && "pl-3")}>
              {group.items.map((item, ii) => (
                <li
                  key={ii}
                  className="relative pl-4 text-sm leading-relaxed text-ink before:absolute before:left-0 before:top-[0.6em] before:size-1.5 before:rounded-full before:bg-ink-muted/50"
                >
                  <GapText text={item} resolve={resolve} run={`${run}:i${gi}.${ii}`} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ *
 * Table completion — an actual grid
 * ------------------------------------------------------------------ */

function TableCompletion({ layout, resolve, run }: LayoutProps<TableLayout>) {
  return (
    <Sheet className="p-0">
      {layout.heading && (
        <div className="border-b border-line px-5 pb-4 pt-5">
          <LayoutHeading run={`${run}:h`}>{layout.heading}</LayoutHeading>
        </div>
      )}
      {/* Tables are the one stimulus that can genuinely outgrow the column. */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {layout.columns.map((col, i) => (
                <th
                  key={i}
                  scope="col"
                  className="border-b border-line bg-paper-sunken px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong"
                >
                  <AnnotatedText run={`${run}:c${i}`} text={col} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {layout.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-line last:border-0">
                {row.map((cell, ci) =>
                  cell.header ? (
                    <th
                      key={ci}
                      scope="row"
                      className="bg-paper-sunken/60 px-4 py-3 text-left align-top font-semibold text-ink-strong"
                    >
                      <AnnotatedText run={`${run}:r${ri}.${ci}`} text={cell.text} />
                    </th>
                  ) : (
                    <td key={ci} className="px-4 py-3 align-top text-ink-soft">
                      <GapText
                        text={cell.text}
                        resolve={resolve}
                        width="sm"
                        run={`${run}:r${ri}.${ci}`}
                      />
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ *
 * Form completion — Label: ______ rows
 * ------------------------------------------------------------------ */

function FormCompletion({ layout, resolve, run }: LayoutProps<FormLayout>) {
  return (
    <Sheet>
      <LayoutHeading run={`${run}:h`}>{layout.heading}</LayoutHeading>
      <dl className="space-y-3">
        {layout.rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[minmax(6rem,10rem)_1fr] items-baseline gap-4">
            <dt className="text-sm font-medium text-ink-strong">
              <AnnotatedText run={`${run}:l${i}`} text={row.label} />
            </dt>
            <dd className="text-sm text-ink-soft">
              <GapText text={row.value} resolve={resolve} run={`${run}:v${i}`} />
            </dd>
          </div>
        ))}
      </dl>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ *
 * Flow-chart completion — boxes joined by arrows
 * ------------------------------------------------------------------ */

/**
 * Whether this chart's gaps are graded, read off the first one that exists.
 *
 * Every gap in a group shares the same disabled state, so one is enough — but it
 * has to be a number the group actually defines, since the resolver returns null
 * for anything else.
 */
function firstGapDisabled(layout: FlowchartLayout, resolve: GapResolver): boolean {
  const m = layout.steps.join(" ").match(/\[\[(\d+)\]\]/);
  return m ? (resolve(Number(m[1]))?.disabled ?? false) : false;
}

function Flowchart({ layout, resolve, run }: LayoutProps<FlowchartLayout>) {
  const chart = (
    <ol className="mx-auto flex w-full max-w-md flex-col items-stretch">
      {layout.steps.map((step, i) => (
        <li key={i}>
          <div className="rounded-lg border border-line bg-paper px-4 py-3 text-center text-sm text-ink-soft">
            <GapText
              text={step}
              resolve={resolve}
              run={`${run}:s${i}`}
              renderGap={layout.choices ? (binding) => <ChoiceSlot binding={binding} /> : undefined}
            />
          </div>
          {i < layout.steps.length - 1 && (
            <div className="flex justify-center py-1.5" aria-hidden>
              <svg width="14" height="20" viewBox="0 0 14 20" className="text-ink-muted">
                <path
                  d="M7 0v14M2 10l5 5 5-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </li>
      ))}
    </ol>
  );

  // A typed flow-chart ("Write ONE WORD") has no box; GapText renders its own
  // text fields and there is nothing to place.
  if (!layout.choices) {
    return (
      <Sheet>
        <LayoutHeading run={`${run}:h`}>{layout.heading}</LayoutHeading>
        {chart}
      </Sheet>
    );
  }

  /**
   * "Choose FOUR answers from the box" — a placement task.
   *
   * The box sits BESIDE the chart, as the computer-delivered test shows it: the
   * candidate reads every option before placing any, so it has to stay on screen
   * while they work down the steps. Below the chart on a narrow screen, where
   * side-by-side would squeeze both to nothing.
   *
   * Answers are still stored as gap text, so the grader, the answer sheet and the
   * review screens needed no change — only the way the blank is filled.
   */
  return (
    <Sheet>
      <LayoutHeading run={`${run}:h`}>{layout.heading}</LayoutHeading>
      {/* Read the graded state off a REAL gap. Resolving a made-up number
          returns null, which would leave the box draggable after submission. */}
      <ChoiceBankProvider choices={layout.choices} disabled={firstGapDisabled(layout, resolve)}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
          {chart}
          <div className="lg:sticky lg:top-4">
            <ChoiceBank />
          </div>
        </div>
      </ChoiceBankProvider>
    </Sheet>
  );
}

function Diagram({
  layout,
  resolve,
  run,
  fallbackImage,
}: LayoutProps<DiagramLayout> & { fallbackImage: string | null }) {
  const src = layout.imageUrl ?? fallbackImage;
  if (!src) return null;

  return (
    <Sheet>
      <LayoutHeading run={`${run}:h`}>{layout.heading}</LayoutHeading>

      <div className="relative overflow-hidden rounded-lg border border-line">
        <Image
          src={src}
          alt={layout.heading ?? "Diagram to label"}
          width={1000}
          height={640}
          className="h-auto w-full object-contain"
          unoptimized
        />
        {/* Pins are percentage-positioned so they track the image as it scales. */}
        {layout.pins.map((pin) => (
          <span
            key={pin.gap}
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
          >
            <span className="grid size-6 place-items-center rounded-full border-2 border-white bg-brand font-mono text-[10px] font-bold tabular-nums text-white shadow-md">
              {pin.gap}
            </span>
          </span>
        ))}
      </div>

      {/* The answer fields sit under the image so they never cover the artwork. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {layout.pins.map((pin) => {
          const binding = resolve(pin.gap);
          return (
            <div key={pin.gap} className="flex items-center gap-2">
              {layout.choices ? (
                <LetterSelect binding={binding} choices={layout.choices} />
              ) : (
                <GapField binding={binding} width="lg" />
              )}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

/** Map labelling answered by letter rather than typed word. */
function LetterSelect({
  binding,
  choices,
}: {
  binding: ReturnType<GapResolver>;
  choices: { key: string; text: string }[];
}) {
  if (!binding) return null;
  return (
    <label className="flex w-full items-center gap-2">
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded font-mono text-[10px] font-semibold tabular-nums",
          binding.state === "idle" && "bg-brand-soft text-brand",
          binding.state === "correct" && "bg-success text-white",
          binding.state === "incorrect" && "bg-danger text-white",
          binding.state === "review" && "bg-info text-white",
        )}
      >
        {binding.number}
      </span>
      {/* Letter buttons, not a dropdown: the exam shows every option at once,
          and on a map the candidate is comparing letters against the image. */}
      {binding.playClip && (
        <button
          type="button"
          onClick={binding.playClip}
          title="Play the part of the recording that answers this"
          aria-label={`Play the recording for question ${binding.number}`}
          className="grid size-6 shrink-0 place-items-center rounded text-ink-muted transition-colors hover:bg-brand-soft hover:text-brand"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden>
            <path d="M8 2.5v11a.5.5 0 0 1-.83.37L3.9 11H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.9l3.27-2.87A.5.5 0 0 1 8 2.5Zm3.3 1.8a.75.75 0 0 1 1.02.28A6.5 6.5 0 0 1 13 8c0 1.23-.34 2.4-.94 3.42a.75.75 0 1 1-1.3-.76A5 5 0 0 0 11.5 8c0-.96-.27-1.86-.74-2.62a.75.75 0 0 1 .28-1.02Z" />
          </svg>
        </button>
      )}
      <span role="radiogroup" aria-label={`Question ${binding.number}`} className="flex flex-wrap gap-1">
        {choices.map((c) => {
          const isOn = binding.value === c.key;
          return (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={isOn}
              aria-label={`${c.key}, ${c.text}`}
              title={c.text}
              disabled={binding.disabled}
              onClick={() => binding.onChange(isOn ? "" : c.key)}
              className={cn(
                "grid size-8 place-items-center rounded-md border font-mono text-xs font-semibold transition-colors",
                isOn && binding.state === "idle" && "border-brand bg-brand text-white",
                isOn && binding.state === "correct" && "border-success bg-success text-white",
                isOn && binding.state === "incorrect" && "border-danger bg-danger text-white",
                !isOn && "border-line bg-paper-elev text-ink-soft hover:border-brand/50",
                binding.disabled && "cursor-default",
              )}
            >
              {c.key}
            </button>
          );
        })}
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ *
 * Shared option box — matching headings / features / sentence endings
 *
 * Printed once above the questions, exactly as on the paper. Previously every
 * question carried its own copy of the list.
 * ------------------------------------------------------------------ */

export function OptionsBox({ layout, run }: { layout: OptionsLayout; run?: string }) {
  return (
    <Sheet className="bg-paper-sunken">
      <p className="mb-3 text-sm font-semibold text-ink-strong">
        <AnnotatedText run={run && `${run}:h`} text={layout.title} />
      </p>
      <ul className="space-y-1.5">
        {layout.options.map((o) => (
          <li key={o.key} className="flex gap-3 text-sm text-ink-soft">
            <span className="w-6 shrink-0 font-mono text-xs font-semibold text-ink-strong">
              {o.key}
            </span>
            <span>
              <AnnotatedText run={run && `${run}:o${o.key}`} text={o.text} />
            </span>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ *
 * Dispatcher
 * ------------------------------------------------------------------ */

/**
 * Renders the set's shared structure. Returns null for types whose questions
 * stand on their own (MCQ, TFNG, writing, speaking) — those render per-question.
 */
export function SetLayoutRenderer({
  layout,
  resolve,
  fallbackImage = null,
  run = "layout",
}: {
  layout: SetLayout | null;
  resolve: GapResolver;
  fallbackImage?: string | null;
  /**
   * Prefix for this layout's annotation runs. One per GROUP, because a part
   * can carry a note sheet and a table under the same recording and their
   * rows would otherwise be filed under the same ids.
   */
  run?: string;
}) {
  if (!layout) return null;
  switch (layout.kind) {
    case "inline_blanks":
      return <InlineBlanks layout={layout} resolve={resolve} run={run} />;
    case "notes":
      return <Notes layout={layout} resolve={resolve} run={run} />;
    case "table":
      return <TableCompletion layout={layout} resolve={resolve} run={run} />;
    case "form":
      return <FormCompletion layout={layout} resolve={resolve} run={run} />;
    case "flowchart":
      return <Flowchart layout={layout} resolve={resolve} run={run} />;
    case "diagram":
      return <Diagram layout={layout} resolve={resolve} run={run} fallbackImage={fallbackImage} />;
    case "options":
      return <OptionsBox layout={layout} run={run} />;
    default:
      return null;
  }
}

/** True when the layout itself collects every answer (no question rows needed). */
export function layoutOwnsAnswers(layout: SetLayout | null): boolean {
  if (!layout) return false;
  return layout.kind !== "options";
}
