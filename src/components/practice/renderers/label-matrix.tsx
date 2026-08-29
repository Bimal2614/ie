"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { OptionsLayout } from "@/lib/question-content";
import type { QuestionState } from "./question-input";

/**
 * Map / plan / diagram labelling — the picture beside its answer grid.
 *
 * The letters on this task are positions on a picture, not phrases, so the
 * candidate's whole job is comparing the stems against the image. Two things
 * follow, and the earlier layout got both wrong:
 *
 *  - the figure belongs to THIS task, not to the part. Rendered as the part's
 *    stimulus it sat above every group, so a paper whose Q11-14 are notes
 *    opened with a full-width map that answers none of them.
 *
 *  - a grid reads faster than a drag board when the options are nine single
 *    letters: every row shows every choice at once, which is how the answer
 *    sheet is laid out. Text options keep the drag board — nine columns of
 *    sentences would be unreadable.
 */
export function LabelMatrix({
  layout,
  items,
  imageUrl,
  heading,
  disabled,
  anchorPrefix = "sq",
  bindingFor,
  onAssign,
  onClear,
}: {
  layout: OptionsLayout;
  items: { n: number; prompt?: string }[];
  /**
   * Anchor prefix for the answer-strip jump, matching the surface this is drawn
   * on: `sq` in section practice, `mq` in question practice and the mock. It
   * used to be hardcoded to `sq`, so a palette on an `mq` surface looked up an
   * id that was never rendered and the jump silently did nothing.
   */
  anchorPrefix?: "mq" | "sq";
  /** Auth-gated route, never the raw s3:// value. */
  imageUrl?: string | null;
  heading?: string;
  disabled: boolean;
  bindingFor: (n: number) => { key?: string; state: QuestionState; expected?: string };
  onAssign: (n: number, key: string) => void;
  onClear?: (n: number) => void;
}) {
  // "Location A" is the placeholder the generator writes when the box is
  // nothing but positions on the image; a real legend is worth printing.
  const hasLegend = layout.options.some(
    (o) => o.text && o.text !== o.key && !/^Location [A-K]$/.test(o.text),
  );

  return (
    // Container query, not `xl:`: the grid is nine letter columns wide and the
    // figure wants room of its own, so the two only sit side by side when the
    // PANE is wide. A viewport breakpoint split a 450px questions pane in two.
    <div className="@container">
      <div className="grid gap-4 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,auto)] @4xl:items-start">
        {imageUrl && (
          <figure className="overflow-hidden rounded-xl border border-line bg-paper">
            <Image
              src={imageUrl}
              alt={heading ?? "Map to label"}
              width={1000}
              height={800}
              // Capped: the figure shares the screen with the grid rather than
              // filling it, because the two are read against each other.
              className="mx-auto h-auto max-h-[62vh] w-full object-contain"
              unoptimized
            />
          </figure>
        )}

        <div className="overflow-x-auto rounded-xl border border-line bg-paper-elev">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="border-b border-line bg-paper-sunken px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted"
                >
                  {layout.title || "Answer"}
                </th>
                {layout.options.map((o) => (
                  <th
                    key={o.key}
                    scope="col"
                    title={o.text}
                    className="border-b border-l border-line bg-paper-sunken px-2.5 py-2 text-center font-mono text-xs font-bold text-ink-strong"
                  >
                    {o.key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const b = bindingFor(item.n);
                return (
                  <tr
                    key={item.n}
                    id={`${anchorPrefix}-${item.n}`}
                    className="scroll-mt-28 border-b border-line last:border-0"
                  >
                    <th scope="row" className="px-3 py-2 text-left align-middle font-normal">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "grid size-6 shrink-0 place-items-center rounded font-mono text-[11px] font-semibold tabular-nums",
                            b.state === "idle" && "bg-brand-soft text-brand",
                            b.state === "correct" && "bg-success text-white",
                            b.state === "incorrect" && "bg-danger text-white",
                            b.state === "review" && "bg-info text-white",
                          )}
                        >
                          {item.n}
                        </span>
                        <span className="whitespace-nowrap text-ink">{item.prompt}</span>
                      </span>
                      {b.state === "incorrect" && b.expected && (
                        <span className="mt-0.5 block pl-8 text-[11px] text-success">
                          {b.expected}
                        </span>
                      )}
                    </th>

                    {layout.options.map((o) => {
                      const on = b.key === o.key;
                      return (
                        <td key={o.key} className="border-l border-line px-2.5 py-2 text-center">
                          <button
                            type="button"
                            role="radio"
                            aria-checked={on}
                            aria-label={`Question ${item.n}: ${o.key}`}
                            disabled={disabled}
                            // Clicking the chosen letter again clears it, so a
                            // mistaken tap does not have to stay on the sheet.
                            onClick={() => (on ? onClear?.(item.n) : onAssign(item.n, o.key))}
                            className={cn(
                              "grid size-5 place-items-center rounded-full border-2 transition-colors",
                              on && b.state === "idle" && "border-brand bg-brand",
                              on && b.state === "correct" && "border-success bg-success",
                              on && b.state === "incorrect" && "border-danger bg-danger",
                              on && b.state === "review" && "border-info bg-info",
                              !on && "border-line bg-paper hover:border-brand/60",
                              disabled && "cursor-default opacity-70",
                            )}
                          >
                            {on && <span className="size-1.5 rounded-full bg-white" aria-hidden />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {hasLegend && (
            <dl className="grid gap-x-4 gap-y-1 border-t border-line px-3 py-2.5 text-xs text-ink-soft sm:grid-cols-2">
              {layout.options.map((o) => (
                <div key={o.key} className="flex gap-1.5">
                  <dt className="font-mono font-semibold text-ink-strong">{o.key}</dt>
                  <dd className="min-w-0">{o.text}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
