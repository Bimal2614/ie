import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Trophy, Sparkles } from "lucide-react";
import { getMockResults } from "@/app/actions/mock";
import { buttonVariants } from "@/components/ui/button";
import { LocalTime } from "@/components/history/local-time";

export const metadata: Metadata = { title: "Results · IELTSAce", robots: { index: false } };

export default async function ResultsPage() {
  const results = await getMockResults();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-2xl">Mock results</h1>
          <p className="mt-0.5 text-sm text-ink-muted">Every full mock you&apos;ve completed.</p>
        </div>
        <Link href="/mock-tests" className={buttonVariants({ variant: "default", size: "sm" })}>
          <Sparkles className="size-4" /> New mock
        </Link>
      </div>

      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line py-16">
          <Trophy className="size-8 text-ink-muted" />
          <p className="text-sm text-ink-muted">You haven&apos;t completed a mock yet.</p>
          <Link href="/mock-tests" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Take your first mock
          </Link>
        </div>
      ) : (
        <div className="surface divide-y divide-line">
          {results.map((r) => (
            <Link
              key={r.sessionId}
              href={`/results/${r.sessionId}`}
              className="flex items-center gap-4 px-4 py-3.5 hover:bg-paper-sunken"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-lg chip-accent">
                <Trophy className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold capitalize text-ink">{r.module} full mock</p>
                <p className="text-xs text-ink-muted">
                  {r.completedAt ? (
                    <LocalTime
                      value={r.completedAt.toISOString()}
                      options={{ day: "numeric", month: "short", year: "numeric" }}
                    />
                  ) : (
                    "In progress"
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="display text-xl tabular-nums text-brand">{r.overallBand ?? "—"}</p>
                <p className="text-[10px] uppercase tracking-wider text-ink-muted">band</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-ink-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
