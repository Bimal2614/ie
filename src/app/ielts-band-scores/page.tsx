import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { MarketingShell, PageHead } from "@/components/marketing/marketing-shell";
import { BANDS, BAND_SLUGS } from "@/lib/band-content";

export const metadata: Metadata = {
  title: "IELTS Band Scores Explained — How IELTS Scoring Works (2026) | IELTSAce",
  description:
    "How IELTS band scores work: the 9-band scale, how Listening, Reading, Writing and Speaking are scored, how the overall band is calculated and rounded, and how to reach Band 7, 8 or 9.",
  alternates: { canonical: "/ielts-band-scores" },
  keywords: ["IELTS band scores", "IELTS scoring", "how IELTS is scored", "IELTS band score calculator", "IELTS overall band"],
};

const SCALE = [
  { band: "9", label: "Expert user" },
  { band: "8", label: "Very good user" },
  { band: "7", label: "Good user" },
  { band: "6", label: "Competent user" },
  { band: "5", label: "Modest user" },
];

export default function BandScoresPage() {
  return (
    <MarketingShell>
      <PageHead
        eyebrow="IELTS scoring"
        title="IELTS band scores, explained."
        lead="IELTS reports a score for each skill and an overall band on a 9-band scale. Here's exactly how those numbers are produced — and where the easiest half-bands hide."
      />

      {/* 9-band scale */}
      <h2 className="mt-10 text-xl font-semibold text-ink">The 9-band scale</h2>
      <dl className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper-elev">
        {SCALE.map((s) => (
          <div key={s.band} className="flex items-center gap-4 px-5 py-3">
            <dt className="font-serif w-10 text-2xl tabular-nums text-brand">{s.band}</dt>
            <dd className="text-sm text-ink-soft">{s.label}</dd>
          </div>
        ))}
      </dl>

      {/* How each part is scored */}
      <h2 className="mt-12 text-xl font-semibold text-ink">How each skill is scored</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft">
        <p><span className="font-semibold text-ink">Listening &amp; Reading</span> are marked out of 40. Your raw score converts to a band with a fixed table — roughly 30/40 is Band 7 and 35/40 is Band 8. Every mark counts, and spelling must be correct.</p>
        <p><span className="font-semibold text-ink">Writing &amp; Speaking</span> are marked on four equally-weighted criteria (Task Response, Coherence &amp; Cohesion, Lexical Resource, Grammatical Range &amp; Accuracy — plus Pronunciation in Speaking).</p>
      </div>

      {/* Overall band */}
      <h2 className="mt-12 text-xl font-semibold text-ink">How the overall band is calculated</h2>
      <ul className="mt-4 space-y-2.5">
        {[
          "Your overall band is the average of the four skill bands, rounded to the nearest half-band.",
          "A .25 average rounds up to the next half-band; .75 rounds up to the next whole band. So 6.75 becomes 7.0.",
          "Within Writing, Task 2 counts twice as much as Task 1.",
          "Because of rounding, lifting your weakest skill by half a band can raise your whole result.",
        ].map((t) => (
          <li key={t} className="flex gap-2.5 text-sm text-ink-soft"><Check className="mt-0.5 size-4 shrink-0 text-green" />{t}</li>
        ))}
      </ul>

      {/* Band target pages */}
      <h2 className="mt-12 text-xl font-semibold text-ink">Aiming for a specific band?</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {BAND_SLUGS.map((slug) => {
          const b = BANDS[slug];
          return (
            <Link key={slug} href={`/ielts-band/${slug}`} className="flex items-center justify-between rounded-2xl border border-line bg-paper-elev p-5 transition-shadow hover:shadow-lg">
              <div>
                <p className="font-semibold text-ink">How to get Band {b.band} in IELTS</p>
                <p className="mt-0.5 text-sm text-ink-muted">{b.who}</p>
              </div>
              <ArrowRight className="size-5 shrink-0 text-brand" />
            </Link>
          );
        })}
      </div>

      <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-line bg-paper-elev p-8 text-center">
        <h2 className="font-serif text-2xl tracking-tight">See your band before exam day.</h2>
        <p className="max-w-md text-sm text-ink-soft">Practise with instant AI band scoring on Writing and Speaking — free to start.</p>
        <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-green px-6 py-3 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105">
          Start practising free <ArrowRight className="size-4" />
        </Link>
      </div>
    </MarketingShell>
  );
}
