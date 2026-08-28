import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  ArrowRight, ArrowUpRight,
  Headphones, BookOpen, PenLine, Mic,
} from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { EntryLoader } from "@/components/marketing/entry-loader";
import { PremiumCursor } from "@/components/marketing/premium-cursor";
import { CountUp } from "@/components/marketing/count-up";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingHero } from "@/components/marketing/landing-hero";
import { ResultsMarquee } from "@/components/marketing/results-marquee";
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
/* ---- Content. Swap the numbers for real data before launch. ----

   Student testimonials moved to src/lib/student-results.ts and render through
   <ResultsMarquee/> — that file is the one place to paste your real students. */

const STATS = [
  { to: 94, suffix: "%", label: "reach their target band within 6 weeks" },
  { to: 1.2, decimals: 1, prefix: "+", label: "average band gain, first to latest mock" },
  { to: 15000, suffix: "+", label: "exam-style questions, every task type" },
  { to: 120, suffix: "+", label: "countries preparing with IELTSVega" },
];

const METHOD = [
  { n: "01", title: "Pick a section", copy: "Listening, Reading, Writing or Speaking. Practise one part at a time from a library of real exam-style material, Academic or General." },
  { n: "02", title: "Drill the question type", copy: "Every official task type, from True / False / Not Given to map labelling, each with the technique and the model answers that go with it." },
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
const QUESTION_HUB: {
  skill: string;
  href: string;
  /** Matches the icon used in the SKILLS row above, so a skill reads the same everywhere. */
  Icon: typeof Headphones;
  /** Real exam facts. They double as the card's scannable sub-line — the design
   *  device and the content are the same thing, which is the only kind of
   *  decoration worth shipping on a page that has to rank. */
  count: string;
  time: string;
  intro: string;
  links: { label: string; href: string }[];
}[] = [
  {
    skill: "Listening",
    href: "/resources/listening",
    Icon: Headphones,
    count: "40 questions",
    time: "30 min",
    intro:
      "Most Listening marks are lost to spelling, plurals and distractors rather than to not hearing the answer. The audio plays once here too, exactly as it does on test day.",
    links: [
      { label: "Form, note, table and flow-chart completion", href: "/resources/listening#form-note-table-completion" },
      { label: "Plan, map and diagram labelling", href: "/resources/listening#plan-map-diagram-labelling" },
      { label: "Listening multiple choice and how distractors work", href: "/resources/listening#multiple-choice" },
      { label: "Matching questions in Listening", href: "/resources/listening#matching" },
      { label: "Sentence and summary completion", href: "/resources/listening#sentence-summary-completion" },
      { label: "Listening strategies that actually work", href: "/blog/ielts-listening-strategies" },
    ],
  },
  {
    skill: "Reading",
    href: "/resources/reading",
    Icon: BookOpen,
    count: "40 questions",
    time: "60 min",
    intro:
      "Sixty minutes, forty questions, and no extra transfer time. Reading is a timing problem before it is a comprehension problem, so every guide below leads with the technique that costs the fewest minutes.",
    links: [
      { label: "True / False / Not Given (and Yes / No / Not Given)", href: "/resources/reading#true-false-notgiven" },
      { label: "Matching headings to paragraphs", href: "/resources/reading#matching-headings" },
      { label: "Matching information, features and sentence endings", href: "/resources/reading#matching-information-features" },
      { label: "Summary, note and table completion", href: "/resources/reading#completion-tasks" },
      { label: "Short-answer questions", href: "/resources/reading#short-answer" },
      { label: "Reading tips to improve your score fast", href: "/blog/ielts-reading-tips-improve-score" },
    ],
  },
  {
    skill: "Writing",
    href: "/resources/writing",
    Icon: PenLine,
    count: "2 tasks",
    time: "60 min",
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
    Icon: Mic,
    count: "3 parts",
    time: "11-14 min",
    intro:
      "Record an answer and get a band on Fluency, Lexical Resource, Grammar and Pronunciation in seconds, with the hesitation marked where it happened. The part most people underprepare is Part 3.",
    links: [
      { label: "Part 1: interview questions on work, study and home", href: "/resources/speaking#part-1-interview" },
      { label: "Part 2: the cue card and the one-minute long turn", href: "/resources/speaking#part-2-cue-card" },
      { label: "Part 3: the abstract two-way discussion", href: "/resources/speaking#part-3-discussion" },
      { label: "Sentence banks for Speaking Part 2", href: "/templates" },
      { label: "Band descriptors: Band 6 vs 7 vs 8", href: "/blog/ielts-speaking-band-descriptors" },
      { label: "Recent Speaking questions this cycle", href: "/blog/recent-ielts-speaking-questions-july-2026" },
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

      {/* ══ Results — the authority centrepiece: real band jumps ══

             Was a three-up grid of three students. It is now every student, on
             two rails looping in opposite directions and pausing on hover so a
             quote can be read. The heading block is unchanged.

             The rail is full-bleed rather than boxed to the max-w-6xl column:
             a marquee that stops dead at a container edge reads as a carousel
             someone forgot to put arrows on. The heading keeps the column. ══ */}
      <section id="results" className="scroll-mt-20 py-16">
        <div className="mx-auto w-full max-w-6xl px-5">
          <Reveal><Header eyebrow="Real results" title="Band jumps, not promises." lead="Students who practised the way examiners mark, and moved on with their lives." /></Reveal>
        </div>
        <Reveal y={32} className="mt-12">
          <ResultsMarquee />
        </Reveal>
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green">How IELTSVega works</p>
            <h2 className="font-serif mt-3 max-w-2xl text-3xl tracking-tight sm:text-4xl">
              From your first question to a full mock.
            </h2>
            <p className="mt-3 max-w-xl text-white/55">
              An online practice platform, not a coaching course: real exam material to work through, an instant band on everything you write or say, and full mocks whenever you want one.
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
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 lg:grid-cols-2 lg:items-center">
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
      <section className="mx-auto w-full max-w-2xl px-5 py-16 text-center">
        <Reveal><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Why fluent speakers still miss their band</p></Reveal>
        <ScrollWords
          className="font-serif mt-4 text-lg leading-relaxed text-ink sm:text-xl"
          text="Fluent English alone rarely earns a Band 8. IELTS scores your Writing and Speaking against four precise criteria. And most test-takers never learn what examiners actually reward. Criteria-based practice, scored the way the real exam marks, is how you close that gap and reach your target band."
        />
      </section>

      {/* == Question-type hub — the page's real content block, and the only
             route from the home page to every guide in a single click == */}
      {/* == Question-type hub — the page's real content block, and the only
             route from the home page to every guide in a single click.

             Designed as four skill cards rather than four bulleted lists: the
             list version carried the same links and the same words, but nothing
             about it invited a reader in, and a block people scroll past earns
             nothing however well it is optimised. Every visual element here is
             load-bearing content — the icon matches the skill's icon elsewhere
             on the page, and the count/time sub-line is a real exam fact people
             search for, not a decorative chip. == */}
      {/* Same rounded near-black slab as the #method panel above — inset from
          the viewport edges rather than full-bleed, so the two dark sections
          read as the same object appearing twice instead of as two different
          treatments. Geometry is copied from #method deliberately: identical
          max-width, radius, and horizontal/vertical padding at both breakpoints. */}
      <section id="question-types" className="scroll-mt-20 px-4 py-8 sm:px-5">
        <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] bg-paper-strong px-6 py-20 text-white sm:px-12 sm:py-24">
          <Reveal>
            <Header
              tone="dark"
              eyebrow="Every question type"
              title="Practise the exact task costing you marks."
              lead="Forty Listening questions, forty Reading questions, two Writing tasks and three Speaking parts, each with its own technique. Start with the one you keep getting wrong."
            />
          </Reveal>

          {/* EQUAL HEIGHTS. `items-start` was letting every card shrink to its
              own content, so Writing (nine question types) towered over
              Speaking (six) beside it. Dropping it restores the grid's default
              `stretch`; `h-full` then has to be threaded through BOTH the
              Reveal wrapper and the article, because Reveal renders a real div
              between the grid and the card and a percentage height collapses
              through any ancestor that is not itself full-height. The card is
              a flex column so the "Full guide" link can be pinned to the
              bottom with mt-auto, which is what actually makes the four cards
              look aligned rather than merely be the same height. */}
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {QUESTION_HUB.map((g, i) => (
              <Reveal key={g.skill} delay={i * 0.07} className="h-full">
                <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:border-white/20 hover:bg-white/[0.07]">
                  {/* Head — icon, skill, and the two exam facts */}
                  <div className="flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-green">
                      <g.Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-2xl leading-none tracking-tight text-white">
                        <Link href={g.href} className="transition-colors hover:text-green">
                          IELTS {g.skill}
                        </Link>
                      </h3>
                      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium uppercase tracking-wider text-white/45">
                        <span>{g.count}</span>
                        <span aria-hidden className="text-white/25">&middot;</span>
                        <span>{g.time}</span>
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-[0.8125rem] leading-relaxed text-white/55">{g.intro}</p>

                  {/* Question types as chips, not rows. Same links, same anchor
                      text, a quarter of the height — and a block of tags reads
                      as something to browse rather than as more paragraph. */}
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {g.links.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className="inline-block rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs leading-snug text-white/70 transition-colors hover:border-green/50 hover:bg-green/10 hover:text-green"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={g.href}
                    className="group/all mt-auto pt-5 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-green"
                  >
                    Full IELTS {g.skill} guide
                    <ArrowRight className="size-4 transition-transform group-hover/all:translate-x-0.5" />
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* == Scoring explainer — carries the band and format queries onto the
             page as prose, and links the three tool pages that were otherwise
             reachable only from the footer. The rounding rule gets a panel of
             its own because it is the single most misunderstood fact in IELTS
             scoring, and showing the two sums side by side explains it faster
             than the paragraph beside it can. == */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:items-start lg:gap-14">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Before you book</p>
            <h2 className="font-serif mt-3 text-3xl tracking-tight sm:text-4xl">
              Know the number you actually need.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              IELTS is marked on a 0&ndash;9 band scale in half-band steps, and your overall score is the
              average of the four skill bands, rounded to the nearest half. That rounding is where people
              lose the band they thought they had. Work out where you stand with the{" "}
              <Link href="/ielts-band-score-calculator" className="font-medium text-brand underline decoration-brand/30 underline-offset-4 transition-colors hover:decoration-brand">
                IELTS band score calculator
              </Link>
              , or read{" "}
              <Link href="/ielts-band-scores" className="font-medium text-brand underline decoration-brand/30 underline-offset-4 transition-colors hover:decoration-brand">
                how IELTS band scores are calculated
              </Link>{" "}
              for the full marking rules.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              And before you book, check{" "}
              <Link href="/ielts-2026-changes" className="font-medium text-brand underline decoration-brand/30 underline-offset-4 transition-colors hover:decoration-brand">
                what changed in IELTS in 2026
              </Link>
              : computer-delivered testing is the default in most markets, One Skill Retake lets you resit a
              single section instead of the whole test, and paper-based IELTS has been retired almost everywhere.
            </p>

            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Start from your target band</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { label: "Band 6.5", href: "/ielts-band/6-5" },
                  { label: "Band 7", href: "/ielts-band/7" },
                  { label: "Band 8", href: "/ielts-band/8" },
                  { label: "Band 9", href: "/ielts-band/9" },
                ].map((b) => (
                  <Link
                    key={b.href}
                    href={b.href}
                    className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand"
                  >
                    How to get {b.label}
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>

          {/* The rounding panel */}
          <Reveal x={24} y={0} delay={0.08}>
            <div className="rounded-2xl border border-line bg-paper-elev p-7">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                The half-band rounding rule
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Two averages, a tenth of a band apart, and a whole band between the results.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  { skills: "7.5 · 7.0 · 6.5 · 6.0", avg: "6.75", band: "7.0", up: true },
                  { skills: "7.0 · 6.5 · 6.5 · 6.5", avg: "6.625", band: "6.5", up: false },
                ].map((r) => (
                  <div
                    key={r.avg}
                    className={`rounded-xl border p-4 ${r.up ? "border-green/30 bg-green-soft/40" : "border-line bg-paper"}`}
                  >
                    <p className="text-xs uppercase tracking-wider text-ink-muted">{r.skills}</p>
                    <div className="mt-2 flex items-baseline gap-2.5">
                      <span className="font-serif text-lg tabular-nums text-ink-muted">{r.avg}</span>
                      <ArrowRight className="size-3.5 shrink-0 text-ink-muted" />
                      <span className={`font-serif text-3xl tabular-nums ${r.up ? "text-green" : "text-ink"}`}>
                        {r.band}
                      </span>
                      <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                        {r.up ? "rounds up" : "rounds down"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/ielts-band-score-calculator"
                className="group/calc mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-brand-ink transition-[filter] hover:brightness-110"
              >
                Calculate your overall band
                <ArrowRight className="size-4 transition-transform group-hover/calc:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* A hairline that fades out at both ends, rather than a rule straight
          across the viewport — it marks the change of subject into the FAQ
          without drawing a hard box across the page. */}
      <div className="mx-auto w-full max-w-3xl px-5">
        <hr className="h-px border-0 bg-gradient-to-r from-transparent via-line-strong to-transparent" />
      </div>

      {/* == FAQ — SEO / AI-answer content == */}
      <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-20 px-5 py-16">
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


function Header({ eyebrow, title, lead, align = "center", tone = "light" }: { eyebrow: string; title: string; lead: string; align?: "center" | "left"; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {/* Green is the accent that already carries eyebrows on the dark method
          panel; brand blue is too dark to read on near-black. */}
      <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${dark ? "text-green" : "text-brand"}`}>{eyebrow}</p>
      <h2 className={`font-serif mt-3 text-3xl tracking-tight sm:text-4xl ${dark ? "text-white" : ""}`}>{title}</h2>
      {lead && <p className={`mt-3 ${dark ? "text-white/55" : "text-ink-soft"}`}>{lead}</p>}
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
