import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { MarketingShell, PageHead } from "@/components/marketing/marketing-shell";
import { BANDS, BAND_SLUGS } from "@/lib/band-content";
import { pageMeta } from "@/lib/seo";
import { LONG_TAIL } from "@/lib/keywords";

/**
 * TARGETING: what each band MEANS and who needs it — not how scoring works.
 *
 * This page, /blog/how-ielts-band-score-is-calculated and
 * /ielts-band-score-calculator were all three chasing the same scoring cluster,
 * and all three ranked nowhere for it (positions 83, 70, and unindexed) on ~358
 * combined impressions. keywords.ts warns about exactly this: scattering one
 * cluster across several pages builds several pages that rank for nothing.
 *
 * The split now is by intent, so they stop bidding against each other:
 *   this page  → band MEANINGS and requirements (LONG_TAIL.bandTargets)
 *   the post   → the METHOD: criteria, weighting, rounding (LONG_TAIL.scoring)
 *   /blog/ielts-band-score-chart → the raw-score CONVERSION tables
 *   the calculator → the tool itself
 *
 * LONG_TAIL.scoring was deliberately removed from here. Do not add it back
 * without moving it off the post first.
 */
export const metadata: Metadata = pageMeta({
  title: "IELTS Band Score Scale: What Each Band Means (0-9)",
  description:
    "The IELTS band score scale from 0 to 9: what each band means, its CEFR level, which bands universities and visas ask for, and how the overall band works.",
  path: "/ielts-band-scores",
  keywords: ["IELTS band scores", "IELTS band score meaning", "what IELTS band do I need", "IELTS band 7 meaning", "IELTS band 8", "IELTS band requirements", ...LONG_TAIL.bandTargets],
});

/**
 * Band labels are the official IELTS ones; the descriptions are our own
 * summaries. CEFR follows the published IELTS alignment (C2 8.5-9, C1 7-8,
 * B2 5.5-6.5, B1 4-5), which stops at B1 — bands below 4 get no level rather
 * than an invented one. Keep in step with the CEFR line in each band's
 * `meaning` in src/lib/band-content.ts.
 */
const SCALE = [
  { band: "9", label: "Expert user", cefr: "C2", desc: "Full command of English: accurate, appropriate and fluent, with complete understanding." },
  { band: "8", label: "Very good user", cefr: "C1", desc: "Fully operational, with only occasional unsystematic errors. Handles complex, detailed argument well." },
  { band: "7", label: "Good user", cefr: "C1", desc: "Operational command with occasional inaccuracies. Handles complex language and follows detailed reasoning." },
  { band: "6", label: "Competent user", cefr: "B2", desc: "Generally effective despite some inaccuracies and misunderstandings, especially in familiar situations." },
  { band: "5", label: "Modest user", cefr: "B1", desc: "Partial command. Copes with the overall meaning in most situations but makes many mistakes." },
  { band: "4", label: "Limited user", cefr: "B1", desc: "Basic competence limited to familiar situations. Frequent problems in understanding and expression." },
  { band: "3", label: "Extremely limited user", cefr: "", desc: "Conveys and understands only general meaning in very familiar situations. Communication often breaks down." },
  { band: "2", label: "Intermittent user", cefr: "", desc: "Great difficulty understanding spoken and written English beyond isolated words." },
  { band: "1", label: "Non-user", cefr: "", desc: "No ability to use the language beyond a few isolated words." },
  { band: "0", label: "Did not attempt the test", cefr: "", desc: "No assessable answers were given." },
];

export default function BandScoresPage() {
  return (
    <MarketingShell>
      <PageHead
        eyebrow="IELTS scoring"
        title="IELTS band scores, explained."
        lead="IELTS reports a band score from 0 to 9 for each skill and for the test overall, in half-band steps. Here is what every band score means, how it lines up with the CEFR, and which band you are likely to need."
      />

      {/* Straight to the tool. People searching "how is IELTS scored" overwhelmingly
          want to convert a number, so surface the calculator above the explainer. */}
      <Link
        href="/ielts-band-score-calculator"
        className="mt-8 flex items-center justify-between gap-4 rounded-2xl border-2 border-brand bg-brand-soft/30 p-5 transition-shadow hover:shadow-lg"
      >
        <span>
          <span className="block text-sm font-semibold text-ink">IELTS band score calculator</span>
          <span className="mt-0.5 block text-sm text-ink-soft">
            Convert a raw /40 score to a band, or four skill bands to your overall band.
          </span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-brand" />
      </Link>

      {/* 9-band scale */}
      <h2 className="mt-10 text-xl font-semibold text-ink">The IELTS band score scale, 0 to 9</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Half bands such as 6.5 or 7.5 sit between the descriptions either side of them. The CEFR tag is the level
        each IELTS band score is aligned to, which is what many European universities and some visa routes quote.
      </p>
      <dl className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper-elev">
        {SCALE.map((s) => (
          <div key={s.band} className="flex gap-4 px-5 py-3">
            <dt className="font-serif w-10 shrink-0 text-2xl tabular-nums text-brand">{s.band}</dt>
            <dd className="text-sm text-ink-soft">
              <span className="font-semibold text-ink">{s.label}</span>
              {s.cefr && <span className="ml-2 rounded bg-brand-soft/40 px-1.5 py-0.5 text-xs font-medium text-ink">CEFR {s.cefr}</span>}
              <span className="mt-0.5 block">{s.desc}</span>
            </dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-12 text-xl font-semibold text-ink">IELTS band score to CEFR</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-paper-elev">
        <table className="w-full text-left text-sm">
          <thead className="text-ink">
            <tr className="border-b border-line">
              <th className="px-5 py-3 font-semibold">IELTS band score</th>
              <th className="px-5 py-3 font-semibold">CEFR level</th>
              <th className="px-5 py-3 font-semibold">Typically enough for</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-ink-soft">
            {[
              ["8.5 - 9", "C2", "Any course or profession"],
              ["7 - 8", "C1", "Competitive universities, medicine, law and professional registration"],
              ["5.5 - 6.5", "B2", "Most undergraduate and many postgraduate courses"],
              ["4 - 5", "B1", "Foundation and pathway programmes"],
            ].map(([band, cefr, use]) => (
              <tr key={band}>
                <td className="px-5 py-3 tabular-nums">{band}</td>
                <td className="px-5 py-3">{cefr}</td>
                <td className="px-5 py-3">{use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* How each part is scored */}
      <h2 className="mt-12 text-xl font-semibold text-ink">How each skill gets its band score</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft">
        <p><span className="font-semibold text-ink">Listening &amp; Reading</span> are marked out of 40. Your raw score converts to a band with a fixed table. Roughly 30/40 is Band 7 and 35/40 is Band 8. Every mark counts, and spelling must be correct.</p>
        <p><span className="font-semibold text-ink">Writing &amp; Speaking</span> are marked on four equally-weighted criteria (Task Response, Coherence &amp; Cohesion, Lexical Resource, Grammatical Range &amp; Accuracy, plus Pronunciation in Speaking).</p>
      </div>

      {/* Overall band */}
      <h2 className="mt-12 text-xl font-semibold text-ink">How the overall band score is calculated</h2>
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
        <p className="max-w-md text-sm text-ink-soft">Practise with instant AI band scoring on Writing and Speaking, free to start.</p>
        <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-green px-6 py-3 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105">
          Start practising free <ArrowRight className="size-4" />
        </Link>
      </div>
    </MarketingShell>
  );
}
