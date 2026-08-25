import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getMockResult } from "@/app/actions/mock";
import { SECTIONS } from "@/lib/ielts";
import { buttonVariants } from "@/components/ui/button";
import { LocalTime } from "@/components/history/local-time";
import { MockSectionReviewBlock } from "@/components/mock/mock-section-review";
import { SpeakingScoreTrigger } from "@/components/mock/speaking-score-trigger";

export const metadata: Metadata = { title: "Mock result · IELTSVega", robots: { index: false } };

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getMockResult(id);
  if (!result) notFound();

  // The overall band only means what IELTS means by it once all four are in.
  // Until Writing and Speaking are scored it is an average of two, and is
  // labelled as such rather than presented as a real overall.
  const scored = result.bands.filter((b) => b.band !== null).length;
  const indicative = scored < 4;
  // Writing and Speaking are scored asynchronously after submit.
  const aiPending = result.bands.some(
    (b) => (b.section === "speaking" || b.section === "writing") && b.band === null,
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="display text-2xl">{result.title ?? "Mock result"}</h1>
        <span className="chip capitalize">{result.module}</span>
        {result.completedAt && (
          <span className="text-sm text-ink-muted">
            <LocalTime value={result.completedAt.toISOString()} />
          </span>
        )}
      </div>

      {/* Overall band */}
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-paper-elev py-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {indicative ? "Indicative overall band" : "Overall band"}
        </p>
        <p className="display text-6xl tabular-nums text-brand">{result.overallBand ?? ""}</p>
        {indicative && (
          <p className="max-w-sm px-4 text-center text-xs text-ink-muted">
            Averaged over the modules scored so far. Writing and Speaking are marked by AI a few
            seconds after you hand in — your full band appears here once they land.
          </p>
        )}
      </div>

      {/* Writing + Speaking are scored after submit — this fires it and refreshes. */}
      {aiPending && <SpeakingScoreTrigger sessionId={result.sessionId} />}

      {/* Per-module bands, each expandable to review its parts and questions */}
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
          By skill · tap to review
        </p>
        {result.bands.map((b) => {
          const sec = SECTIONS[b.section];
          return (
            <MockSectionReviewBlock
              key={b.section}
              sessionId={result.sessionId}
              section={b.section}
              label={sec.label}
              accent={sec.accent}
              band={b.band}
              pending={b.band === null}
              raw={b.raw}
              total={b.total}
            />
          );
        })}
      </div>

      <p className="rounded-lg bg-paper-sunken px-3 py-2 text-xs text-ink-muted">
        Listening and Reading bands come from the published Cambridge raw-score (/40) conversion
        tables — a full mock draws a complete 40-mark paper, so they apply here. General Training
        Reading uses its own table. The real exam is equated per version, so treat a band as a close
        guide rather than a promise.
      </p>

      <div className="flex flex-wrap gap-3">
        <Link href="/mock-tests" className={buttonVariants({ variant: "default" })}>
          <Sparkles className="size-4" /> Take another mock
        </Link>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
