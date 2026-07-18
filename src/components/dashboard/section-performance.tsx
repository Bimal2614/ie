import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SECTIONS, SECTION_ORDER } from "@/lib/ielts";
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
        How many questions you&apos;ve worked on in each section.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTION_ORDER.map((key) => {
          const { Icon, tile } = SECTION_META[key];
          const s = sectionStats[key];
          return (
            <div key={key} className={cn(cardInteractive, "flex flex-col p-5")}>
              <div className="mb-4 flex items-center justify-between">
                <span className={cn("grid size-10 place-items-center rounded-xl", tile)}>
                  <Icon className="size-5" />
                </span>
                <Link
                  href={`/practice/${key}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-sunken"
                >
                  Open <ArrowRight className="size-3.5" />
                </Link>
              </div>

              <p className="font-semibold text-ink">{SECTIONS[key].label}</p>

              <p className="mt-2">
                <span className="font-semibold text-3xl tabular-nums text-ink">
                  {s.practised.toLocaleString()}
                </span>
                <span className="text-sm text-ink-muted"> / {s.available.toLocaleString()}</span>
              </p>
              <p className="text-xs text-ink-muted">Questions practised</p>

              <div className="mt-auto pt-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-paper-sunken">
                  {/* Width is genuinely dynamic → inline; colour is a token class. */}
                  <div
                    className="h-full rounded-full bg-green transition-all"
                    style={{ width: `${Math.min(100, Math.max(s.completion, s.practised > 0 ? 2 : 0))}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-ink-muted">{s.completion}% complete</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
