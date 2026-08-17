import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SECTIONS, SECTION_ORDER, SET_NOUN, isObjectiveSection } from "@/lib/ielts";
import type { DashboardStats } from "@/app/actions/dashboard";
import { SECTION_META, SectionHeading, cardInteractive } from "./ui";
import { cn } from "@/lib/utils";

/**
 * Section performance — questions practised out of the total available per
 * section, with a completion bar and a direct "Open" action (PTE-style). Shows
 * real coverage against the bank rather than an empty "not started" state.
 */
export function SectionPerformance({ sectionStats }: { sectionStats: DashboardStats["sectionStats"] }) {
  return (
    <section>
      <SectionHeading title="Section performance" href="/practice" cta="All practice" />
      <p className="-mt-1 mb-3 text-sm text-ink-muted">
        How much of each section you&apos;ve covered, and how you&apos;re scoring.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTION_ORDER.map((key) => {
          const { Icon, tile } = SECTION_META[key];
          const s = sectionStats[key];
          return (
            <Link key={key} href={`/practice/${key}`} className={cn(cardInteractive, "group flex flex-col p-5")}>
              <div className="mb-4 flex items-center justify-between">
                <span className={cn("grid size-10 place-items-center rounded-xl", tile)}>
                  <Icon className="size-5" />
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors group-hover:bg-paper-sunken">
                  Open <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>

              <p className="font-semibold text-ink">{SECTIONS[key].label}</p>

              {/* Coverage in SETS, matching the practice library ("12 recordings"),
                  so the same content isn't counted two different ways. */}
              <p className="mt-2">
                <span className="font-semibold text-3xl tabular-nums text-ink">
                  {s.practisedSets.toLocaleString()}
                </span>
                <span className="text-sm text-ink-muted"> / {s.availableSets.toLocaleString()}</span>
              </p>
              <p className="text-xs text-ink-muted">
                {SET_NOUN[key]}s practised
              </p>

              {/* Marking stays per question — IELTS awards a mark per item, and
                  that's what maps to a band. Criteria-marked skills show a band. */}
              {s.graded > 0 && (
                <p className="mt-2 text-xs text-ink-soft">
                  {isObjectiveSection(key) ? (
                    <>
                      <span className="font-semibold tabular-nums text-ink">
                        {s.right} / {s.graded}
                      </span>{" "}
                      marks correct
                    </>
                  ) : (
                    <>
                      band{" "}
                      <span className="font-semibold tabular-nums text-ink">
                        {s.avgBand?.toFixed(1) ?? "—"}
                      </span>{" "}
                      average
                    </>
                  )}
                </p>
              )}

              <div className="mt-auto pt-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-paper-sunken">
                  {/* Width is genuinely dynamic → inline; colour is a token class. */}
                  <div
                    className="h-full rounded-full bg-green transition-all"
                    style={{ width: `${Math.min(100, Math.max(s.completion, s.practisedSets > 0 ? 2 : 0))}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-ink-muted">{s.completion}% complete</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
