import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { MarketingShell, PageHead } from "@/components/marketing/marketing-shell";
import { BandCalculator } from "@/components/marketing/band-calculator";
import { JsonLd } from "@/components/seo/json-ld";
import { BAND_TABLES } from "@/lib/ielts";
import { KEYWORDS, breadcrumbJsonLd, faqJsonLd, pageMeta, webAppJsonLd } from "@/lib/seo";

const PATH = "/ielts-band-score-calculator";
const TITLE = "IELTS Band Score Calculator: Raw Score to Band";
const DESCRIPTION =
  "Free IELTS band score calculator: turn a Listening or Reading raw score out of 40 into a band, or average your four skills into an overall band score.";

export const metadata = pageMeta({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [...KEYWORDS.tools, ...KEYWORDS.bands],
});

const FAQS = [
  {
    q: "How is the IELTS overall band score calculated?",
    a: "Your four skill bands (Listening, Reading, Writing, Speaking) are averaged, then reported to the nearest half band. An average ending in .25 rounds up to the next half band and .75 rounds up to the next whole band, so 6.25 becomes 6.5 and 6.75 becomes 7.0.",
  },
  {
    q: "What raw score do I need for Band 7 in IELTS?",
    a: "Roughly 30 out of 40 in Listening and 30 out of 40 in Academic Reading. General Training Reading is marked more strictly because the texts are easier. You need about 34 out of 40 for the same Band 7.",
  },
  {
    q: "Is IELTS Reading marked differently for Academic and General Training?",
    a: "Yes. The two modules use separate conversion tables. General Training texts are more everyday in style, so a higher raw score is required for the same band. Listening uses one table for both modules.",
  },
  {
    q: "Can I get a half band in Listening or Reading?",
    a: "Yes. Listening and Reading bands are awarded in half-band steps from the raw score table, exactly like Writing and Speaking.",
  },
  {
    q: "Is this IELTS band calculator accurate?",
    a: "It uses the widely-published Cambridge conversion averages, so it is a close guide. The real test is statistically equated for each version, meaning the exact raw score needed can shift by a mark or two either way. Use it to track progress, not as a guarantee.",
  },
  {
    q: "Can I retake just one section of IELTS?",
    a: "On computer-delivered IELTS, One Skill Retake lets you re-sit a single skill within 60 days of the original test and receive an updated Test Report Form. It is a standard feature of computer-delivered IELTS in 2026.",
  },
];

/**
 * The tables store [minimum correct, band]. Turn consecutive rows into the
 * inclusive ranges people actually recognise from a score chart ("30–32 → 7").
 */
function toRanges(table: readonly (readonly [number, number])[]) {
  return table.map(([min, band], i) => {
    const upper = i === 0 ? 40 : table[i - 1][0] - 1;
    return { band, range: min === upper ? `${min}` : `${min}-${upper}` };
  });
}

export default function BandScoreCalculatorPage() {
  const tables = [
    { name: "Listening", rows: toRanges(BAND_TABLES.listening) },
    { name: "Academic Reading", rows: toRanges(BAND_TABLES.academicReading) },
    { name: "General Training Reading", rows: toRanges(BAND_TABLES.generalReading) },
  ];

  return (
    <MarketingShell width="wide">
      <JsonLd data={webAppJsonLd({ name: "IELTS Band Score Calculator", description: DESCRIPTION, path: PATH })} />
      <JsonLd data={faqJsonLd(FAQS)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "IELTS band scores", path: "/ielts-band-scores" },
          { name: "Band score calculator", path: PATH },
        ])}
      />

      <PageHead
        eyebrow="Free tool · 2026 tables"
        title="IELTS band score calculator."
        lead="Turn a raw Listening or Reading score out of 40 into a band, or average four skill bands into your overall IELTS band score. Nothing is uploaded. It all runs in your browser."
      />

      <div className="mt-8 max-w-3xl">
        <BandCalculator />
      </div>

      {/* Conversion charts — the reference people screenshot and come back for. */}
      <h2 className="mt-14 text-xl font-semibold text-ink">IELTS raw score to band score charts</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Listening and Reading are both marked out of 40. Listening uses one table for
        Academic and General Training; Reading has a separate table for each module.
      </p>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {tables.map((t) => (
          <section key={t.name} className="overflow-hidden rounded-2xl border border-line bg-paper-elev">
            <h3 className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">{t.name}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
                  <th scope="col" className="px-5 py-2 font-medium">Correct / 40</th>
                  <th scope="col" className="px-5 py-2 font-medium">Band</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {t.rows.map((r) => (
                  <tr key={`${t.name}-${r.band}`}>
                    <td className="px-5 py-2 tabular-nums text-ink-soft">{r.range}</td>
                    <td className="px-5 py-2 font-semibold tabular-nums text-brand">{r.band.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
      <p className="mt-4 max-w-2xl text-xs text-ink-muted">
        These are the widely-published Cambridge averages. Every real IELTS version is
        statistically equated, so the exact raw score needed for a band can move by a
        mark or two. Treat the chart as a close guide rather than a fixed rule.
      </p>

      {/* The rounding rule — the actual reason most people land on this page. */}
      <h2 className="mt-14 text-xl font-semibold text-ink">How the overall band is rounded</h2>
      <ul className="mt-4 max-w-2xl space-y-2.5">
        {[
          "Add your four skill bands and divide by four.",
          "An average ending in .25 rounds UP to the next half band, so 6.25 becomes 6.5.",
          "An average ending in .75 rounds UP to the next whole band, so 6.75 becomes 7.0.",
          "Anything else rounds to the nearest half band, so 6.4 becomes 6.5 and 6.1 becomes 6.0.",
          "Because of that rounding, lifting your weakest skill by half a band often lifts the whole result.",
        ].map((t) => (
          <li key={t} className="flex gap-2.5 text-sm text-ink-soft">
            <Check className="mt-0.5 size-4 shrink-0 text-green" />
            {t}
          </li>
        ))}
      </ul>

      {/* FAQ — mirrors the FAQPage JSON-LD above so the rich result matches the page. */}
      <h2 className="mt-14 text-xl font-semibold text-ink">Frequently asked questions</h2>
      <dl className="mt-4 max-w-3xl divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper-elev">
        {FAQS.map((f) => (
          <div key={f.q} className="px-5 py-4">
            <dt className="text-sm font-semibold text-ink">{f.q}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">{f.a}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link
          href="/ielts-band-scores"
          className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken"
        >
          How IELTS scoring works <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Practise with AI band scores <ArrowRight className="size-4" />
        </Link>
      </div>
    </MarketingShell>
  );
}
