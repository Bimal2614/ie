import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, faqJsonLd, pageMeta } from "@/lib/seo";
import { BAND_SLUGS } from "@/lib/band-content";
import {
  MAX_SCORE,
  MIN_SCORE,
  SCORE_SECTIONS,
  SECTION_KEYS,
  australiaLevel,
  canadaClb,
  fmtBand,
  overallWith,
  parseScoreSlug,
  scoreFacts,
  scoreFaqs,
  scorePath,
  scoreSlug,
  type ScoreSectionKey,
} from "@/lib/score-pages";

type Params = { section: string; score: string };

export function generateStaticParams() {
  return SECTION_KEYS.flatMap((section) =>
    Array.from({ length: MAX_SCORE - MIN_SCORE + 1 }, (_, i) => ({ section, score: scoreSlug(MIN_SCORE + i) })),
  );
}

export const dynamicParams = false;

function resolve(p: Params) {
  if (!(p.section in SCORE_SECTIONS)) return null;
  const score = parseScoreSlug(p.score);
  if (score === null) return null;
  return scoreFacts(p.section as ScoreSectionKey, score);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const f = resolve(await params);
  if (!f) return {};
  const b = fmtBand(f.band);
  const nextLine = f.next ? `Band ${fmtBand(f.next.band)} needs ${f.next.min}.` : "It is the top band.";
  return pageMeta({
    title: `${f.score} Out of 40 in ${f.section.long}: Band ${b}`,
    description: `${f.score} out of 40 in ${f.section.long} is Band ${b}. ${nextLine} See the ${b} range, the band in other sections and your overall.`,
    path: scorePath(f.key, f.score),
    keywords: [
      `${f.score} out of 40 in ielts ${f.section.name.toLowerCase()}`,
      `${f.score}/40 ielts ${f.section.name.toLowerCase()} band`,
      `ielts ${f.section.name.toLowerCase()} ${f.score} out of 40`,
      `${f.score} ${f.section.name.toLowerCase()} band score`,
      `ielts ${f.section.name.toLowerCase()} band ${b}`,
    ],
  });
}

const SECTION_LINKS: Record<ScoreSectionKey, { label: string; href: string }[]> = {
  listening: [
    { label: "IELTS Listening strategies that stop careless losses", href: "/blog/ielts-listening-strategies" },
    { label: "IELTS Listening question types and practice", href: "/resources/listening" },
  ],
  "academic-reading": [
    { label: "True False Not Given: the test that settles every answer", href: "/blog/ielts-true-false-not-given" },
    { label: "IELTS matching headings: method and practice", href: "/blog/ielts-matching-headings" },
  ],
  "general-reading": [
    { label: "IELTS General Training practice test guide", href: "/blog/ielts-general-training-practice-test-guide" },
    { label: "True False Not Given: the test that settles every answer", href: "/blog/ielts-true-false-not-given" },
  ],
};

const TIPS: Record<ScoreSectionKey, string[]> = {
  listening: [
    "Most lost Listening marks are mechanical: spelling, a missing plural -s, or going over the word limit. Check every completion answer against the instruction before you move on.",
    "Read ahead in the pauses. Knowing that question 14 wants a number tells you what to listen for.",
    "Do not chase a missed answer. Mark a guess and pick up the next question, or you lose two marks instead of one.",
  ],
  "academic-reading": [
    "Spend no more than 20 minutes on a passage. A hard question that takes four minutes costs you two easier ones later.",
    "Most lost Reading marks come from True/False/Not Given and matching headings. Drill those types in blocks, not only inside full tests.",
    "Completion answers are copied from the passage, so spelling counts. Copy carefully and respect the word limit.",
  ],
  "general-reading": [
    "General Training needs more correct answers for each band, so careless losses in Sections 1 and 2 cost more. Bank them first.",
    "Section 3 is the long text and where most marks go. Leave it enough time: roughly 20 minutes.",
    "Completion answers are copied from the text, so spelling and word limits count.",
  ],
};

export default async function ScorePage({ params }: { params: Promise<Params> }) {
  const f = resolve(await params);
  if (!f) notFound();

  const b = fmtBand(f.band);
  const faqs = scoreFaqs(f);
  const bandGuide = BAND_SLUGS.find((s) => s === b.replace(".0", "").replace(".", "-"));
  const path = scorePath(f.key, f.score);
  const otherBands = [5.5, 6, 6.5, 7, 7.5, 8];

  return (
    <MarketingShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "IELTS band score calculator", path: "/ielts-band-score-calculator" },
          { name: `${f.section.name} ${f.score}/40`, path },
        ])}
      />
      <JsonLd data={faqJsonLd(faqs)} />

      <Link href="/ielts-band-score-calculator" className="text-sm font-medium text-brand hover:underline">
        ← IELTS band score calculator
      </Link>

      <header className="mt-4 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{f.section.long} · raw score</p>
        <h1 className="font-serif mt-3 text-4xl tracking-tight sm:text-5xl">
          {f.score} out of 40 in {f.section.long} is Band {b}
        </h1>
        <p className="mt-4 text-ink-soft">
          Any score from {f.range.min} to {f.range.max} out of 40 earns Band {b} in {f.section.name}.{" "}
          {f.next
            ? `${f.next.more} more correct answer${f.next.more === 1 ? "" : "s"} (${f.next.min}/40) would make it Band ${fmtBand(f.next.band)}.`
            : "That is the top of the scale."}{" "}
          {f.section.note}
        </p>
      </header>

      {/* The answer sheet: 40 boxes, the ones you got right filled, the band's
          range outlined. It shows at a glance how far the next band is, which
          is the question behind almost every one of these searches. */}
      <section aria-label={`${f.score} of 40 answers correct`} className="mt-8 rounded-2xl border border-line bg-paper-elev p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="font-serif text-5xl tabular-nums text-ink">
            {f.score}
            <span className="text-2xl text-ink-muted">/40</span>
          </p>
          <p className="text-right">
            <span className="block text-xs font-medium uppercase tracking-wider text-ink-muted">Band</span>
            <span className="font-serif text-5xl tabular-nums text-brand">{b}</span>
          </p>
        </div>
        <ol className="mt-5 grid max-w-md grid-cols-10 gap-1" aria-hidden="true">
          {Array.from({ length: 40 }, (_, i) => {
            const n = i + 1;
            const right = n <= f.score;
            const inBand = n >= f.range.min && n <= f.range.max;
            const isNext = f.next && n === f.next.min;
            return (
              <li
                key={n}
                className={`grid aspect-square place-items-center rounded-md border text-[10px] tabular-nums ${
                  right ? "border-brand bg-brand text-paper" : "border-line text-ink-muted"
                } ${inBand ? "ring-2 ring-green ring-offset-1 ring-offset-paper-elev" : ""} ${
                  isNext ? "border-dashed border-green text-green" : ""
                }`}
              >
                {n}
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-xs text-ink-muted">
          Filled: correct answers ({f.percent}%). Ringed: the {f.range.min}–{f.range.max} range for Band {b}.
          {f.next ? ` Dashed: ${f.next.min}, where Band ${fmtBand(f.next.band)} starts.` : ""}
          {f.cushion > 0
            ? ` You could lose ${f.cushion} answer${f.cushion === 1 ? "" : "s"} and keep Band ${b}.`
            : ` One fewer correct answer drops you below Band ${b}.`}
        </p>
      </section>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-line bg-paper-elev">
          <h2 className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">Scores around {f.score}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-muted">
                <th scope="col" className="px-5 py-2 font-medium">Correct / 40</th>
                <th scope="col" className="px-5 py-2 font-medium">{f.section.name} band</th>
              </tr>
            </thead>
            <tbody>
              {f.neighbours.map((r) => (
                <tr key={r.score} className={`border-t border-line ${r.score === f.score ? "bg-paper-sunken" : ""}`}>
                  <td className="px-5 py-2 tabular-nums text-ink-soft">
                    {r.score === f.score || r.score < MIN_SCORE ? (
                      r.score
                    ) : (
                      <Link href={scorePath(f.key, r.score)} className="text-brand hover:underline">{r.score}</Link>
                    )}
                  </td>
                  <td className="px-5 py-2 font-semibold tabular-nums text-brand">{fmtBand(r.band)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="overflow-hidden rounded-2xl border border-line bg-paper-elev">
          <h2 className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">{f.score}/40 in each section</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-muted">
                <th scope="col" className="px-5 py-2 font-medium">Section</th>
                <th scope="col" className="px-5 py-2 font-medium">Band</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-line bg-paper-sunken">
                <td className="px-5 py-2 text-ink">{f.section.name}</td>
                <td className="px-5 py-2 font-semibold tabular-nums text-brand">{b}</td>
              </tr>
              {f.others.map((o) => (
                <tr key={o.key} className="border-t border-line">
                  <td className="px-5 py-2">
                    <Link href={scorePath(o.key, f.score)} className="text-brand hover:underline">{o.name}</Link>
                  </td>
                  <td className="px-5 py-2 font-semibold tabular-nums text-brand">{fmtBand(o.band)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">
            Same raw score, different band: each section has its own conversion table.
          </p>
        </section>
      </div>

      <h2 className="mt-14 text-2xl font-semibold tracking-tight text-ink">Your overall band with {b} in {f.section.name}</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        The overall band is the average of all four skills, rounded to the nearest half band (.25 and .75 round up).
        If your other three skills each landed on the band on the left, your overall would be:
      </p>
      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-paper-elev">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-muted">
              <th scope="col" className="px-5 py-2 font-medium">Other three skills</th>
              <th scope="col" className="px-5 py-2 font-medium">Overall band</th>
            </tr>
          </thead>
          <tbody>
            {otherBands.map((o) => (
              <tr key={o} className="border-t border-line">
                <td className="px-5 py-2 tabular-nums text-ink-soft">{fmtBand(o)} each</td>
                <td className="px-5 py-2 font-semibold tabular-nums text-brand">{fmtBand(overallWith(f.band, o))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link href="/ielts-band-score-calculator" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
        Work out your exact overall band <ArrowRight className="size-4" />
      </Link>

      <h2 className="mt-14 text-2xl font-semibold tracking-tight text-ink">Is Band {b} enough for a visa?</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Visa rules set a minimum in each skill, so this {f.section.name} band counts on its own, whatever your overall.
      </p>
      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-paper-elev">
        <div className="p-5 sm:flex sm:gap-6">
          <p className="shrink-0 text-sm font-semibold text-ink sm:w-52">Australia skilled visas</p>
          <p className="mt-2 text-sm text-ink-soft sm:mt-0">
            {australiaLevel(f.band)}.{" "}
            <Link href="/blog/ielts-score-for-australia-pr" className="font-medium text-brand hover:underline">
              IELTS score for Australia PR
            </Link>
          </p>
        </div>
        <div className="border-t border-line p-5 sm:flex sm:gap-6">
          <p className="shrink-0 text-sm font-semibold text-ink sm:w-52">Canada Express Entry</p>
          <p className="mt-2 text-sm text-ink-soft sm:mt-0">
            {f.section.canada
              ? `${canadaClb(f.key, f.band)} for ${f.section.name}. The Federal Skilled Worker Program needs CLB 7 in every skill; CLB 9 earns the most points. `
              : "Canada's Express Entry accepts IELTS General Training only, so an Academic Reading score cannot be used. "}
            <Link href="/blog/ielts-score-for-canada-express-entry" className="font-medium text-brand hover:underline">
              IELTS score for Canada PR
            </Link>
          </p>
        </div>
      </div>

      <h2 className="mt-14 text-2xl font-semibold tracking-tight text-ink">
        {f.next ? `How to get the ${f.next.more} more answer${f.next.more === 1 ? "" : "s"} for Band ${fmtBand(f.next.band)}` : "How to keep Band 9"}
      </h2>
      <ul className="mt-4 max-w-2xl space-y-2">
        {TIPS[f.key].map((t) => (
          <li key={t} className="text-sm leading-relaxed text-ink-soft">{t}</li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-2">
        {SECTION_LINKS[f.key].map((l) => (
          <Link key={l.href} href={l.href} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
            {l.label} <ArrowRight className="size-4" />
          </Link>
        ))}
        {bandGuide && (
          <Link href={`/ielts-band/${bandGuide}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
            How to get Band {b} in IELTS, skill by skill <ArrowRight className="size-4" />
          </Link>
        )}
      </div>

      <h2 className="mt-14 text-2xl font-semibold tracking-tight text-ink">{f.section.name} score questions</h2>
      <div className="mt-5 divide-y divide-line border-y border-line">
        {faqs.map((q) => (
          <details key={q.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
              <h3 className="text-base font-semibold text-ink">{q.q}</h3>
              <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line text-ink-muted transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{q.a}</p>
          </details>
        ))}
      </div>

      <nav aria-label="Nearby scores" className="mt-10 flex items-center justify-between gap-4 text-sm font-medium">
        {f.score > MIN_SCORE ? (
          <Link href={scorePath(f.key, f.score - 1)} className="inline-flex items-center gap-1.5 text-brand hover:underline">
            <ArrowLeft className="size-4" /> {f.score - 1} out of 40
          </Link>
        ) : <span />}
        {f.score < MAX_SCORE ? (
          <Link href={scorePath(f.key, f.score + 1)} className="inline-flex items-center gap-1.5 text-brand hover:underline">
            {f.score + 1} out of 40 <ArrowRight className="size-4" />
          </Link>
        ) : <span />}
      </nav>

      <div className="mt-8">
        <p className="text-sm font-semibold text-ink">Every {f.section.name} score</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from({ length: MAX_SCORE - MIN_SCORE + 1 }, (_, i) => MIN_SCORE + i).map((s) =>
            s === f.score ? (
              <span key={s} className="rounded-md bg-brand px-2.5 py-1 text-xs font-semibold tabular-nums text-paper">{s}</span>
            ) : (
              <Link key={s} href={scorePath(f.key, s)} className="rounded-md border border-line px-2.5 py-1 text-xs tabular-nums text-ink transition-colors hover:bg-paper-sunken">
                {s}
              </Link>
            ),
          )}
        </div>
        <Link href="/blog/ielts-band-score-chart" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
          The full IELTS band score chart <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-line bg-paper-elev p-8 text-center">
        <h2 className="font-serif text-2xl tracking-tight">Find out your real {f.section.name} score.</h2>
        <p className="max-w-md text-sm text-ink-soft">
          Sit full timed {f.section.name} papers, marked out of 40 and converted to a band, with every answer explained.
        </p>
        <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-green px-6 py-3 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105">
          Start practising free <ArrowRight className="size-4" />
        </Link>
      </div>
    </MarketingShell>
  );
}
