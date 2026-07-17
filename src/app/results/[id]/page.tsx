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

export const metadata: Metadata = { title: "Mock result · IELTSAce", robots: { index: false } };

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getMockResult(id);
  if (!result) notFound();

  // Only Listening and Reading are auto-scored today, so the overall band is a
  // partial estimate — labelled as such rather than presented as a real IELTS
  // overall (which averages all four and rounds to the nearest half-band).
  const autoScored = result.bands.filter((b) => b.band !== null).length;
  const indicative = autoScored < 4;
  // Speaking is scored asynchronously after submit; trigger it if still absent.
  const speakingPending = result.bands.find((b) => b.section === "speaking")?.band === null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="display text-2xl">Mock result</h1>
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
        <p className="display text-6xl tabular-nums text-brand">{result.overallBand ?? "—"}</p>
        {indicative && (
          <p className="max-w-sm px-4 text-center text-xs text-ink-muted">
            Based on Listening and Reading only. Writing and Speaking need AI scoring, which is
            switched on in a later phase — your full band will update then.
          </p>
        )}
      </div>

      {/* Speaking is scored after submit — this fires it and refreshes. */}
      {speakingPending && <SpeakingScoreTrigger sessionId={result.sessionId} />}

      {/* Per-section bands, each expandable to review its questions */}
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
            />
          );
        })}
      </div>

      {/* Honesty note on raw→band, given the small seeded content */}
      <p className="rounded-lg bg-paper-sunken px-3 py-2 text-xs text-ink-muted">
        Band estimates come from your correct ratio. A real IELTS uses fixed raw-score
        (/40) conversion tables — those apply once a mock draws a full-length section.
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
