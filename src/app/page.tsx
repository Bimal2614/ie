import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  ArrowRight, ArrowUpRight, Check, Quote,
  Headphones, BookOpen, PenLine, Mic,
} from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { EntryLoader } from "@/components/marketing/entry-loader";
import { PremiumCursor } from "@/components/marketing/premium-cursor";
import { CountUp } from "@/components/marketing/count-up";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingHero } from "@/components/marketing/landing-hero";
import { Reveal, ScrollWords } from "@/components/marketing/motion";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { BlogStrip } from "@/components/marketing/blog-strip";
import { SITE_URL } from "@/lib/site";
import {
  WEBSITE_ID,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  KEYWORDS,
  faqJsonLd,
  graphJsonLd,
  organizationJsonLd,
  pageMeta,
  webSiteJsonLd,
} from "@/lib/seo";
import { LONG_TAIL } from "@/lib/keywords";
import { FAQS } from "@/lib/faqs";

/**
 * Built through pageMeta() rather than hand-rolled, which is what fixes three
 * things the audit caught on this page specifically: there was no `og:url` at
 * all (a page-level `openGraph` object replaces the layout's wholesale, url
 * included), the canonical pointed at the apex host that 308-redirects, and
 * there was no hreflang. The OG title/description are then overridden below —
 * a social card gets a different, punchier line than a SERP snippet.
 */
export const metadata: Metadata = (() => {
  const base = pageMeta({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: "/",
    keywords: [
      ...KEYWORDS.core,
      ...KEYWORDS.ai,
      ...LONG_TAIL.practiceMaterial,
      ...LONG_TAIL.aiTools,
    ],
  });
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      title: "IELTS Practice Online with AI Band Scoring: IELTSVega",
      description:
        "Real IELTS band jumps, instant AI scoring for Writing & Speaking, and full mock tests across Academic & General Training.",
    },
    twitter: {
      ...base.twitter,
      title: "IELTS Practice Online with AI Band Scoring",
      description: "AI-scored Writing & Speaking, full mock tests, and 15,000+ IELTS questions.",
    },
  };
})();
/* ---- Content. Swap the `img` and numbers for real data before launch. ---- */

const RESULTS = [
  { img: "/test-1.png", name: "Priya S.", place: "Melbourne, AU", from: 6.5, to: 8.0, module: "Academic", quote: "The AI writing feedback showed me exactly why I was stuck at 6.5. Two weeks later I hit 8." },
  { img: "/test-2.png", name: "Ahmed R.", place: "Lahore, PK", from: 5.5, to: 7.0, module: "General", quote: "Recording speaking answers and getting an instant band changed everything for me." },
  { img: "/test-3.png", name: "Lucia M.", place: "Bogotá, CO", from: 7.0, to: 8.5, module: "Academic", quote: "Full mocks under real timing made the actual exam feel routine. No surprises." },
];

const STATS = [
  { to: 94, suffix: "%", label: "reach their target band within 6 weeks" },
  { to: 1.2, decimals: 1, prefix: "+", label: "average band gain, first to latest mock" },
  { to: 15000, suffix: "+", label: "exam-style questions, every task type" },
  { to: 120, suffix: "+", label: "countries preparing with IELTSVega" },
];

const METHOD = [
  { n: "01", title: "Diagnose", copy: "One short diagnostic places your band across all four skills and finds the exact question types costing you marks." },
  { n: "02", title: "Target", copy: "A focused plan drills your weak types first: not a generic syllabus, the specific gaps between you and your target." },
  { n: "03", title: "Score with AI", copy: "Every Writing and Speaking answer is graded on the four official band criteria in seconds, with what to fix next." },
  { n: "04", title: "Mock under pressure", copy: "Full four-section mocks on real 2026 timing, ending in a band report. So exam day is a repeat, not a shock." },
];

/**
 * The internal-link hub.
 *
 * Two jobs at once. For readers it answers the question the marketing copy
 * above does not — "is the thing I keep failing actually covered here?" — with
 * a named list rather than a claim. For search it is the page's densest block of
 * real text, and the only place on the site where every question-type guide sits
 * one click from the home page with anchor text that says what the target is
 * about. Anchor text is a ranking input for the page being LINKED TO, so
 * "Discussion essays: both views plus your opinion" pointing at the discussion
 * guide is worth more to that guide than any amount of copy on this one.
 *
 * Every href resolves to a page or an on-page anchor that exists today
 * (resources/[section] renders `id={topic.slug}` on each question type). Verify
 * the target before adding a row — a hub full of 404s is worse than a short hub.
 */
const QUESTION_HUB: { skill: string; href: string; intro: string; links: { label: string; href: string }[] }[] = [
  {
    skill: "Listening",
    href: "/resources/listening",
    intro:
      "Most Listening marks are lost to spelling, plurals and distractors rather than to not hearing the answer. The audio plays once here too, exactly as it does on test day.",
    links: [
      { label: "Form, note, table and flow-chart completion", href: "/resources/listening#form-note-table-completion" },
      { label: "Plan, map and diagram labelling", href: "/resources/listening#plan-map-diagram-labelling" },
      { label: "Listening multiple choice and how distractors work", href: "/resources/listening#multiple-choice" },
      { label: "Matching questions in Listening", href: "/resources/listening#matching" },
      { label: "Sentence and summary completion", href: "/resources/listening#sentence-summary-completion" },
    ],
  },
  {
    skill: "Reading",
    href: "/resources/reading",
    intro:
      "Sixty minutes, forty questions, and no extra transfer time. Reading is a timing problem before it is a comprehension problem, so every guide below leads with the technique that costs the fewest minutes.",
    links: [
      { label: "True / False / Not Given (and Yes / No / Not Given)", href: "/resources/reading#true-false-notgiven" },
      { label: "Matching headings to paragraphs", href: "/resources/reading#matching-headings" },
      { label: "Matching information, features and sentence endings", href: "/resources/reading#matching-information-features" },
      { label: "Summary, note and table completion", href: "/resources/reading#completion-tasks" },
      { label: "Short-answer questions", href: "/resources/reading#short-answer" },
    ],
  },
  {
    skill: "Writing",
    href: "/resources/writing",
    intro:
      "Task 2 is worth twice Task 1, and both are marked on four criteria you can study directly. Each guide below carries a model answer and the band descriptors that produced its score.",
    links: [
      { label: "How to describe a line graph in Task 1", href: "/resources/writing/task-1/line-graph" },
      { label: "Bar charts and comparison language", href: "/resources/writing/task-1/bar-chart" },
      { label: "Process diagrams and the passive voice", href: "/resources/writing/task-1/process-diagram" },
      { label: "Map questions: describing changes over time", href: "/resources/writing/task-1/map" },
      { label: "Discussion essays: both views plus your opinion", href: "/resources/writing/task-2/discussion" },
      { label: "Agree or disagree: opinion essay structure", href: "/resources/writing/task-2/opinion" },
      { label: "Advantages and disadvantages essays", href: "/resources/writing/task-2/advantages-disadvantages" },
      { label: "Problem and solution essays", href: "/resources/writing/task-2/problem-solution" },
      { label: "Two-part questions", href: "/resources/writing/task-2/two-part" },
    ],
  },
  {
    skill: "Speaking",
    href: "/resources/speaking",
    intro:
      "Record an answer and get a band on Fluency, Lexical Resource, Grammar and Pronunciation in seconds, with the hesitation marked where it happened. The part most people underprepare is Part 3.",
    links: [
      { label: "Part 1: interview questions on work, study and home", href: "/resources/speaking#part-1-interview" },
      { label: "Part 2: the cue card and the one-minute long turn", href: "/resources/speaking#part-2-cue-card" },
      { label: "Part 3: the abstract two-way discussion", href: "/resources/speaking#part-3-discussion" },
      { label: "Sentence banks for Speaking Part 2", href: "/templates" },
    ],
  },
];

const SKILLS = [
  { label: "Listening", Icon: Headphones, copy: "40-question tests; audio plays once, exactly like exam day." },
  { label: "Reading", Icon: BookOpen, copy: "Academic & General passages with every official question type." },
  { label: "Writing", Icon: PenLine, copy: "Task 1 & 2 graded by AI on all four band criteria." },
  { label: "Speaking", Icon: Mic, copy: "Record Parts 1-3; instant band with pronunciation feedback." },
];


export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="landing min-h-svh bg-paper text-ink">
      <PremiumCursor />
      <EntryLoader />
      <StructuredData />

      {/* Sticky header across the whole landing (transparent → solid on scroll) */}
      <LandingNav />

      {/* ══ Hero — dark, image-backed, one quiet entrance ══ */}
      <LandingHero />

      {/* ══ Results — the authority centrepiece: real band jumps ══ */}
      <section id="results" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-20">
        <Reveal><Header eyebrow="Real results" title="Band jumps, not promises." lead="Students who practised the way examiners mark, and moved on with their lives." /></Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {RESULTS.map((r, i) => (
            <Reveal key={r.name} delay={i * 0.12} className="h-full">
            <figure className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper-elev">
              <Image
                src={r.img}
                alt={`IELTS score report: ${r.name} improved from Band ${r.from.toFixed(1)} to Band ${r.to.toFixed(1)} in IELTS ${r.module}`}
                width={1000}
                height={680}
                // Three-up from md, full width below. Without `sizes`, next/image
                // assumes 100vw at every breakpoint and served the 2048px variant
                // into a ~380px slot — three times over, all below the fold.
                sizes="(min-width: 768px) 33vw, 100vw"
                className="aspect-[3/2] w-full object-cover"
              />
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink-muted line-through">{r.from.toFixed(1)}</span>
                  <ArrowRight className="size-3.5 text-ink-muted" />
                  <span className="font-serif text-2xl tabular-nums text-green">{r.to.toFixed(1)}</span>
                  <span className="ml-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">{r.module}</span>
                </div>
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                  <Quote className="mb-1.5 size-4 text-brand/30" />
                  {r.quote}
                </blockquote>
                <figcaption className="mt-4 border-t border-line pt-3 text-sm">
                  <span className="font-semibold text-ink">{r.name}</span>
                  <span className="text-ink-muted"> · {r.place}</span>
                </figcaption>
              </div>
            </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ DARK SHOWCASE — stats + method, a rounded near-black panel like auth ══ */}
      <section id="method" className="scroll-mt-20 px-4 py-8 sm:px-5">
        <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] bg-paper-strong px-6 py-20 text-white sm:px-12 sm:py-24">
          {/* Stats — count-up, white serif on dark */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 border-b border-white/10 pb-14 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="font-serif text-4xl tabular-nums text-white sm:text-5xl">
                  <CountUp to={s.to} decimals={s.decimals ?? 0} prefix={s.prefix ?? ""} suffix={s.suffix ?? ""} />
                </p>
                <p className="mt-2 max-w-[15rem] text-xs text-white/50">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Method */}
          <div className="pt-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green">The IELTSVega Method</p>
            <h2 className="font-serif mt-3 max-w-2xl text-3xl tracking-tight sm:text-4xl">
              Four steps between you and your target band.
            </h2>
            <p className="mt-3 max-w-xl text-white/55">
              Not more study hours: the specific gaps examiners mark you down for, closed one by one.
            </p>

            <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
              {METHOD.map((m, i) => (
                <Reveal key={m.n} delay={i * 0.08} x={-24} y={0}>
                <div className="group grid gap-4 py-7 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-8">
                  <span className="font-serif text-4xl tabular-nums text-white/15 transition-colors group-hover:text-green sm:text-5xl">{m.n}</span>
                  <div className="sm:flex sm:items-baseline sm:gap-8">
                    <h3 className="w-40 shrink-0 text-xl font-semibold text-white">{m.title}</h3>
                    <p className="mt-1 max-w-xl text-sm text-white/55 sm:mt-0">{m.copy}</p>
                  </div>
                  <ArrowUpRight className="hidden size-5 text-white/25 transition-all group-hover:translate-x-1 group-hover:text-green sm:block" />
                </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ What you get — editorial: one feature image + a skills list ══ */}
      <section id="features" className="scroll-mt-20 border-y border-line bg-paper-elev">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-20 lg:grid-cols-2 lg:items-center">
          <Reveal x={-30} y={0} className="order-2 overflow-hidden rounded-2xl border border-line shadow-xl lg:order-1">
            <Image
              src="/test-6.png"
              alt="IELTSVega AI band scoring: a Writing Task 2 answer marked on Task Response, Coherence and Cohesion, Lexical Resource and Grammatical Range"
              width={1280}
              height={720}
              // Half of a max-w-6xl (1152px) grid from lg, so ~576px at most.
              // Was requesting w=3840.
              sizes="(min-width: 1024px) 576px, 100vw"
              className="h-auto w-full"
            />
          </Reveal>
          <Reveal x={30} y={0} delay={0.1} className="order-1 lg:order-2">
            <Header align="left" eyebrow="Scored like the real thing" title="AI band scoring on every criterion." lead="" />
            <p className="mt-4 max-w-md text-ink-soft">
              Writing and Speaking graded on Task Response, Coherence, Lexical Resource, Grammar, Fluency and Pronunciation, the exact criteria an examiner uses, in seconds.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {SKILLS.map(({ label, Icon, copy }) => (
                <div key={label} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Icon className="size-5" /></span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{label}</p>
                    <p className="text-xs text-ink-muted">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ Reframe narrative — word-by-word scroll reveal (signature motion) ══ */}
      <section className="mx-auto w-full max-w-3xl px-5 py-24 text-center">
        <Reveal><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Why fluent speakers still miss their band</p></Reveal>
        <ScrollWords
          className="font-serif mt-5 text-2xl leading-relaxed text-ink sm:text-[1.85rem]"
          text="Fluent English alone rarely earns a Band 8. IELTS scores your Writing and Speaking against four precise criteria. And most test-takers never learn what examiners actually reward. Criteria-based practice, scored the way the real exam marks, is how you close that gap and reach your target band."
        />
      </section>

      {/* ══ Two paths — decision ══ */}
      <section className="border-y border-line bg-paper-elev">
        <div className="mx-auto grid w-full max-w-5xl gap-5 px-5 py-20 md:grid-cols-2">
          <Reveal x={-28} y={0} className="rounded-2xl border border-line bg-paper p-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Keep guessing</p>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              {["Re-book the test and hope the next attempt is different", "Random YouTube tips with no idea what's scoring", "Pay exam fees again for the same band"].map((t) => (
                <li key={t} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-muted/40" />{t}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal x={28} y={0} delay={0.1} className="rounded-2xl border-2 border-brand bg-brand-soft/40 p-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">Practise the way it&apos;s marked</p>
            <ul className="mt-4 space-y-3 text-sm text-ink">
              {["See your band on every answer, instantly", "Drill the exact question types costing you marks", "Walk in knowing you're already at your target"].map((t) => (
                <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-green" />{t}</li>
              ))}
            </ul>
            <Link href="/signup" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105">
              Start free <ArrowRight className="size-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* == Question-type hub — the page's real content block, and the only
             route from the home page to every guide in a single click == */}
      <section id="question-types" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-20">
        <Reveal>
          <Header
            eyebrow="Every question type"
            title="Practise the exact task costing you marks."
            lead="Forty Listening questions, forty Reading questions, two Writing tasks and three Speaking parts, each with its own technique. Start with the one you keep getting wrong."
          />
        </Reveal>

        <div className="mt-14 grid gap-10 md:grid-cols-2">
          {QUESTION_HUB.map((g, i) => (
            <Reveal key={g.skill} delay={i * 0.08}>
              <h3 className="font-serif text-2xl tracking-tight text-ink">
                <Link href={g.href} className="transition-colors hover:text-brand">
                  IELTS {g.skill}
                </Link>
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">{g.intro}</p>
              <ul className="mt-4 space-y-2">
                {g.links.map((l) => (
                  <li key={l.href} className="flex gap-2 text-sm">
                    <ArrowRight className="mt-1 size-3.5 shrink-0 text-brand/50" />
                    <Link href={l.href} className="text-ink-soft transition-colors hover:text-brand">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>

        {/* Closing prose — carries the scoring and format queries onto the page
            as sentences, and links the three tool/explainer pages that were
            otherwise reachable only from the footer. */}
        <Reveal delay={0.1}>
          <div className="mt-16 border-t border-line pt-10">
            <h3 className="font-serif text-2xl tracking-tight text-ink">Know the number you need before you book</h3>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">
              IELTS is marked on a 0&ndash;9 band scale in half-band steps, and your overall score is the average
              of the four skill bands, rounded to the nearest half. That rounding is where people lose the band
              they thought they had: an average of 6.75 rounds up to 7.0, but 6.625 rounds down to 6.5. Work out
              where you actually stand with the{" "}
              <Link href="/ielts-band-score-calculator" className="text-brand underline underline-offset-4">
                IELTS band score calculator
              </Link>
              , which turns raw Listening and Reading marks and your Writing and Speaking bands into an overall
              score, or read{" "}
              <Link href="/ielts-band-scores" className="text-brand underline underline-offset-4">
                how IELTS band scores are calculated
              </Link>{" "}
              for the full marking rules.
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-soft">
              If you are aiming at a specific target, start from the band rather than the syllabus:{" "}
              <Link href="/ielts-band/6-5" className="text-brand underline underline-offset-4">how to get Band 6.5</Link>,{" "}
              <Link href="/ielts-band/7" className="text-brand underline underline-offset-4">Band 7</Link>,{" "}
              <Link href="/ielts-band/8" className="text-brand underline underline-offset-4">Band 8</Link>{" "}or{" "}
              <Link href="/ielts-band/9" className="text-brand underline underline-offset-4">Band 9</Link>. Each one
              sets out what that score takes in all four skills, and the specific mistakes that cap you one band
              below it. Before you book, check{" "}
              <Link href="/ielts-2026-changes" className="text-brand underline underline-offset-4">
                what changed in IELTS in 2026
              </Link>
              : computer-delivered testing is now the default in most markets, One Skill Retake lets you resit a
              single section instead of the whole test, and paper-based IELTS has been retired almost everywhere.
            </p>
          </div>
        </Reveal>
      </section>

      {/* == FAQ — SEO / AI-answer content == */}
      <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-20 px-5 py-20">
        <Header eyebrow="Questions, answered" title="Everything about practising IELTS online." lead="" />
        <div className="mt-10 divide-y divide-line">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
                <h3 className="text-base font-semibold text-ink">{f.q}</h3>
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line text-ink-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ══ From the blog — internal links into articles for crawl + SEO ══ */}
      <BlogStrip title="IELTS tips & guides" eyebrow="From the blog" />

      {/* ══ DARK CLOSE — shared CTA + footer ══ */}
      <LandingFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */


function Header({ eyebrow, title, lead, align = "center" }: { eyebrow: string; title: string; lead: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>
      <h2 className="font-serif mt-3 text-3xl tracking-tight sm:text-4xl">{title}</h2>
      {lead && <p className="mt-3 text-ink-soft">{lead}</p>}
    </div>
  );
}


function StructuredData() {
  /**
   * One `@graph`, not three separate <script> blocks — the FAQPage's publisher
   * edge and the WebSite's only resolve by `@id` when the entities share a
   * graph. The Organization and WebSite blocks live in lib/seo so the same
   * entity is emitted here, in emails and in any future page, with one
   * definition of `sameAs` behind them.
   */
  const json = graphJsonLd(
    organizationJsonLd(),
    webSiteJsonLd(),
    // isPartOf ties the FAQ to the site entity instead of leaving it floating.
    { ...faqJsonLd(FAQS), "@id": `${SITE_URL}/#faq`, isPartOf: { "@id": WEBSITE_ID }, inLanguage: "en" },
  );
  // JSON-LD is data, not executable script — CSP script-src doesn't gate it, so
  // no nonce is needed. Omitting it keeps server/client identical (no hydration
  // mismatch — the browser would otherwise blank a nonce and differ from SSR).
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}
