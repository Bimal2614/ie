import Link from "next/link";
import { Headphones, BookOpen, PenLine, Mic, ArrowRight, type LucideIcon } from "lucide-react";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { Reveal } from "@/components/marketing/motion";
import { STUDY } from "@/lib/study-content";
import { BAND_SLUGS } from "@/lib/band-content";
import { BlogStrip } from "@/components/marketing/blog-strip";
import { KEYWORDS, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "IELTS Study Materials: Strategies, Templates & Tips",
  description:
    "Free IELTS study materials: exam strategies, dos and don'ts, essay and letter templates, and tips for every Listening, Reading, Writing and Speaking task.",
  path: "/resources",
  keywords: [
    "IELTS study material",
    "free IELTS resources",
    ...KEYWORDS.listening.slice(0, 2),
    ...KEYWORDS.reading.slice(0, 2),
    ...KEYWORDS.writing.slice(0, 2),
    ...KEYWORDS.speaking.slice(0, 2),
  ],
});

/**
 * The 2026 delivery change, framed as what it does to preparation rather than
 * as news. The format shift is the highest-volume IELTS query cluster right
 * now, and this hub is where someone planning their study lands.
 */
const SHIFTS_2026 = [
  {
    title: "Reading and Listening are on screen",
    body: "Paper-based IELTS was retired in most markets from 27 June 2026, and UKVI IELTS moved to computer-only on 22 March 2026. You cannot underline a passage with a pencil any more — the highlight and note tools are on screen, and long passages scroll instead of sitting open in a spread.",
  },
  {
    title: "Listening transfer time is gone",
    body: "Computer-delivered Listening gives about two minutes to check answers at the end, in place of the ten-minute transfer window paper allowed. Spelling still counts and there is no longer a safety net for fixing it, so accuracy has to happen the first time.",
  },
  {
    title: "Writing on Paper exists, in some markets",
    body: "A hybrid option launched in selected markets: Reading and Listening on computer, Writing handwritten. It is not the default and availability varies by centre. Worth seeking out only if you genuinely draft faster by hand — otherwise typing is the easier route, because revising is faster.",
  },
];

const ICONS: Record<string, LucideIcon> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};

export default function ResourcesPage() {
  return (
    <div className="min-h-svh bg-paper text-ink">
      <LandingNav alwaysSolid />

      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-28 sm:pt-32">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Study materials · 2026</p>
          <h1 className="font-serif mt-3 text-4xl tracking-tight sm:text-5xl">
            Everything the exam rewards, in one place.
          </h1>
          <p className="mt-4 text-ink-soft">
            Real strategies, dos and don&apos;ts, ready-to-use templates, and tips for every task type across all four skills. Aligned to the current 2026 IELTS format.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {STUDY.map((s, i) => {
            const Icon = ICONS[s.key];
            return (
              <Reveal key={s.key} delay={i * 0.08} className="h-full">
                <Link
                  href={`/resources/${s.key}`}
                  className="flex h-full flex-col rounded-2xl border border-line bg-paper-elev p-7 transition-shadow hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-paper-sunken text-ink-soft">
                      <Icon className="size-5" />
                    </span>
                    <h2 className="text-xl font-semibold text-ink">{s.name}</h2>
                  </div>
                  <p className="mt-4 text-sm text-ink-soft">{s.tagline}</p>
                  <p className="mt-2 flex-1 text-sm text-ink-muted">{s.overview.slice(0, 120)}…</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                    {s.key === "writing" ? "Task 1 & Task 2 · Band 9 models" : `${s.topics.length} guides`}
                    <ArrowRight className="size-4" />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>

        {/* ── How to actually use these ─────────────────────────────── */}
        <section className="mt-16 max-w-3xl">
          <h2 className="font-serif text-3xl tracking-tight">How to use these guides</h2>
          <p className="mt-4 leading-relaxed text-ink-soft">
            Reading strategy does not raise a band on its own. What moves a score is diagnosing
            which specific question types you get wrong, then drilling those until the technique is
            automatic under time pressure. Every guide here is organised by question type for
            exactly that reason: you are meant to arrive at one section, not read the set.
          </p>
          <p className="mt-4 leading-relaxed text-ink-soft">
            The order that works for most people is: sit one full timed test to find your weakest
            skill, open that skill&apos;s guide and find the question types you lost marks on, work
            through those, then re-test. Repeating full mock tests without that middle step is the
            most common reason people practise for months and stay on the same band.
          </p>
        </section>

        {/* ── The 2026 format shift ─────────────────────────────────── */}
        <section className="mt-16">
          <h2 className="font-serif text-3xl tracking-tight">What changed in 2026, and what it means for practice</h2>
          <p className="mt-3 max-w-3xl text-ink-soft">
            The questions, the timings and the 0&ndash;9 band scale did not change. How you sit the
            test did, and that changes how you should prepare.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {SHIFTS_2026.map((x) => (
              <div key={x.title} className="rounded-2xl border border-line bg-paper-elev p-6">
                <h3 className="text-base font-semibold text-ink">{x.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{x.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-ink-soft">
            The practical conclusion is simple and most candidates ignore it:{" "}
            <strong>practise in the same medium as the test</strong>. Reading long passages on a
            screen, typing essays into a box and checking Listening answers in two minutes are
            different physical skills from doing the same things on paper, and the gap between them
            is worth real marks on test day.
          </p>
          <Link href="/ielts-2026-changes" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
            Full breakdown of the 2026 changes <ArrowRight className="size-4" />
          </Link>
        </section>

        {/* ── Target a band ─────────────────────────────────────────── */}
        <section className="mt-16">
          <h2 className="font-serif text-3xl tracking-tight">Or start from the band you need</h2>
          <p className="mt-3 max-w-3xl text-ink-soft">
            If you already know your target, working backwards from it is faster than working
            through a syllabus. Each guide below sets out the raw scores that band needs in
            Listening and Reading, what it takes in Writing and Speaking, a realistic timeline from
            where you are now, and whether that band actually clears the requirement you are
            chasing &mdash; which is stated per skill far more often than as an overall average.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {BAND_SLUGS.map((slug) => (
              <Link
                key={slug}
                href={`/ielts-band/${slug}`}
                className="rounded-full border border-line bg-paper-elev px-5 py-2 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand"
              >
                How to get Band {slug.replace("-", ".")}
              </Link>
            ))}
            <Link
              href="/ielts-band-score-calculator"
              className="rounded-full border border-brand/40 bg-brand-soft px-5 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand hover:text-white"
            >
              Band score calculator
            </Link>
          </div>
        </section>

        {/* Templates cross-link — the quick-reference companion to these guides. */}
        <Link
          href="/templates"
          className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-brand/30 bg-brand-soft p-6 sm:flex-row sm:items-center"
        >
          <div>
            <p className="text-lg font-semibold text-ink">Writing sentence banks & templates</p>
            <p className="mt-1 text-sm text-ink-soft">
              Band 7-9 sentence patterns for Task 1 and Task 2 you can adapt to any topic. The quick reference to go with these guides.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white">
            Open templates <ArrowRight className="size-4" />
          </span>
        </Link>

        {/* Internal links into the blog — flows crawl equity to articles. */}
        <BlogStrip title="Latest from the blog" eyebrow="Guides & tips" />
      </main>

      <LandingFooter />
    </div>
  );
}
