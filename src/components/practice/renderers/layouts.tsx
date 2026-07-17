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

/** Heading used above every structured layout — matches the printed paper. */
function LayoutHeading({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p className="mb-4 text-center text-sm font-semibold uppercase tracking-[0.12em] text-ink-strong">
      {children}
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

function InlineBlanks({ layout, resolve }: { layout: InlineBlanksLayout; resolve: GapResolver }) {
  return (
    <Sheet>
      <LayoutHeading>{layout.heading}</LayoutHeading>
      <div className="space-y-3">
        {layout.blocks.map((block, i) => (
          <p key={i} className="text-sm text-ink-soft">
            <GapText text={block} resolve={resolve} />
          </p>
        ))}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ *
 * Note completion — indented outline, as candidates see while listening
 * ------------------------------------------------------------------ */

function Notes({ layout, resolve }: { layout: NotesLayout; resolve: GapResolver }) {
  return (
    <Sheet>
      <LayoutHeading>{layout.heading}</LayoutHeading>
      <div className="space-y-5">
        {layout.groups.map((group, gi) => (
          <div key={gi}>
            {group.title && (
              <p className="mb-2 text-sm font-semibold text-ink-strong">{group.title}</p>
            )}
            <ul className="space-y-2 pl-5">
              {group.items.map((item, ii) => (
                <li key={ii} className="list-disc text-sm text-ink-soft marker:text-ink-muted">
                  <GapText text={item} resolve={resolve} />
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

function TableCompletion({ layout, resolve }: { layout: TableLayout; resolve: GapResolver }) {
  return (
    <Sheet className="p-0">
      {layout.heading && (
        <div className="border-b border-line px-5 pb-4 pt-5">
          <LayoutHeading>{layout.heading}</LayoutHeading>
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
                  {col}
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
                      {cell.text}
                    </th>
                  ) : (
                    <td key={ci} className="px-4 py-3 align-top text-ink-soft">
                      <GapText text={cell.text} resolve={resolve} width="sm" />
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

function FormCompletion({ layout, resolve }: { layout: FormLayout; resolve: GapResolver }) {
  return (
    <Sheet>
      <LayoutHeading>{layout.heading}</LayoutHeading>
      <dl className="space-y-3">
        {layout.rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[minmax(6rem,10rem)_1fr] items-baseline gap-4">
            <dt className="text-sm font-medium text-ink-strong">{row.label}</dt>
            <dd className="text-sm text-ink-soft">
              <GapText text={row.value} resolve={resolve} />
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

function Flowchart({ layout, resolve }: { layout: FlowchartLayout; resolve: GapResolver }) {
  return (
    <Sheet>
      <LayoutHeading>{layout.heading}</LayoutHeading>
      <ol className="mx-auto flex max-w-md flex-col items-stretch">
        {layout.steps.map((step, i) => (
          <li key={i}>
            <div className="rounded-lg border border-line bg-paper px-4 py-3 text-center text-sm text-ink-soft">
              <GapText text={step} resolve={resolve} />
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
    </Sheet>
  );
}

/* ------------------------------------------------------------------ *
 * Diagram / plan / map labelling — pins on the image
 * ------------------------------------------------------------------ */

function Diagram({
  layout,
  resolve,
  fallbackImage,
}: {
  layout: DiagramLayout;
  resolve: GapResolver;
  fallbackImage: string | null;
}) {
  const src = layout.imageUrl ?? fallbackImage;
  if (!src) return null;

  return (
    <Sheet>
      <LayoutHeading>{layout.heading}</LayoutHeading>

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
      <select
        aria-label={`Question ${binding.number}`}
        value={binding.value}
        disabled={binding.disabled}
        onChange={(e) => binding.onChange(e.target.value)}
        className={cn(
          "h-9 w-full rounded-md border bg-paper-elev px-2 text-sm text-ink outline-none",
          "focus:border-brand focus:ring-2 focus:ring-brand/20",
          binding.state === "idle" && "border-line",
          binding.state === "correct" && "border-success/50 bg-success-soft",
          binding.state === "incorrect" && "border-danger/50 bg-danger-soft",
        )}
      >
        <option value="">Select…</option>
        {choices.map((c) => (
          <option key={c.key} value={c.key}>
            {c.key} — {c.text}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ------------------------------------------------------------------ *
 * Shared option box — matching headings / features / sentence endings
 *
 * Printed once above the questions, exactly as on the paper. Previously every
 * question carried its own copy of the list.
 * ------------------------------------------------------------------ */

export function OptionsBox({ layout }: { layout: OptionsLayout }) {
  return (
    <Sheet className="bg-paper-sunken">
      <p className="mb-3 text-sm font-semibold text-ink-strong">{layout.title}</p>
      <ul className="space-y-1.5">
        {layout.options.map((o) => (
          <li key={o.key} className="flex gap-3 text-sm text-ink-soft">
            <span className="w-6 shrink-0 font-mono text-xs font-semibold text-ink-strong">
              {o.key}
            </span>
            <span>{o.text}</span>
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
}: {
  layout: SetLayout | null;
  resolve: GapResolver;
  fallbackImage?: string | null;
}) {
  if (!layout) return null;
  switch (layout.kind) {
    case "inline_blanks":
      return <InlineBlanks layout={layout} resolve={resolve} />;
    case "notes":
      return <Notes layout={layout} resolve={resolve} />;
    case "table":
      return <TableCompletion layout={layout} resolve={resolve} />;
    case "form":
      return <FormCompletion layout={layout} resolve={resolve} />;
    case "flowchart":
      return <Flowchart layout={layout} resolve={resolve} />;
    case "diagram":
      return <Diagram layout={layout} resolve={resolve} fallbackImage={fallbackImage} />;
    case "options":
      return <OptionsBox layout={layout} />;
    default:
      return null;
  }
}

/** True when the layout itself collects every answer (no question rows needed). */
export function layoutOwnsAnswers(layout: SetLayout | null): boolean {
  if (!layout) return false;
  return layout.kind !== "options";
}
