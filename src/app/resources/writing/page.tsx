import Link from "next/link";
import { ArrowLeft, ArrowRight, PenLine } from "lucide-react";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { Reveal } from "@/components/marketing/motion";
import { WRITING_TASK1, WRITING_TASK2 } from "@/lib/study-writing";
import { KEYWORDS, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "IELTS Writing Guide: Task 1 & Task 2 Band 9 Answers",
  description:
    "Every IELTS Writing Task 1 and Task 2 question type: how to answer, planning, structure, useful language, the common mistakes, and full Band 9 model answers.",
  path: "/resources/writing",
  keywords: [
    ...KEYWORDS.writing,
    "IELTS writing task 1 vocabulary",
    "IELTS writing task 2 topics",
    "IELTS essay structure",
    "IELTS band 9 essay",
    "IELTS writing templates",
  ],
});

const CARDS = [
  { guide: WRITING_TASK1, href: "/resources/writing/task-1" },
  { guide: WRITING_TASK2, href: "/resources/writing/task-2" },
];

/**
 * The four marking criteria, described by what they measure rather than by
 * their names. The names are public; what actually costs marks under each one
 * is the part candidates never get told, and it is the reason this hub exists
 * as a page rather than as a menu.
 */
const CRITERIA = [
  {
    name: "Task Achievement (Task 1) / Task Response (Task 2)",
    what: "Whether you answered the question that was asked, completely, and held one position while doing it.",
    trap: "The most common cap in the whole test. In Task 1 it is a missing overview — no summary of the main trend, so the script cannot pass 6 no matter how well written. In Task 2 it is a position that drifts: agreeing in paragraph two and hedging in paragraph three reads as no position at all.",
  },
  {
    name: "Coherence & Cohesion",
    what: "Whether a reader can follow your argument without re-reading, and whether each paragraph carries one idea.",
    trap: "Over-signposting. A Firstly / Moreover / In conclusion scaffold on every sentence is the classic Band 6 signature: it looks organised and reads as memorised. Band 7 cohesion is largely invisible — ideas connect because they follow, not because a connector announces them.",
  },
  {
    name: "Lexical Resource",
    what: "Range and precision of vocabulary, including collocation and natural word choice.",
    trap: "Reaching for impressive words instead of right ones. An almost-correct collocation is penalised more than a plain, accurate one, so a thesaurus is the fastest way to lower this score. Range means being able to say a thing several ways, not knowing rare words.",
  },
  {
    name: "Grammatical Range & Accuracy",
    what: "A mix of sentence structures, with the majority of sentences free of error.",
    trap: "Complex sentences carrying all the errors. Band 7 asks that most sentences be error-free, so three accurate complex sentences beat eight ambitious ones with mistakes. Articles, prepositions and plural agreement account for most of the residual errors at 6.5.",
  },
];

/** Time and weighting. The split is dictated by the marking, not by convention. */
const SPLIT = [
  {
    task: "Task 1",
    minutes: "20 min",
    weight: "One third of the Writing band",
    words: "150 words minimum",
    plan: "Two minutes reading the visual and grouping what it shows, fifteen writing, three checking. Academic candidates describe a chart, graph, table, process or map; General Training candidates write a letter. Both need an accurate opening line and, for Academic, an overview paragraph that states the main pattern without listing numbers.",
  },
  {
    task: "Task 2",
    minutes: "40 min",
    weight: "Two thirds of the Writing band",
    words: "250 words minimum",
    plan: "Five minutes planning, thirty writing, five checking. The five minutes of planning is the highest-value time in the whole exam: deciding your position and your two main ideas before you start is what prevents the drifting argument that caps Task Response.",
  },
];

export default function WritingHub() {
  return (
    <div className="min-h-svh bg-paper text-ink">
      <LandingNav alwaysSolid />

      <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-28 sm:pt-32">
        <Link href="/resources" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
          <ArrowLeft className="size-4" /> All study materials
        </Link>

        <Reveal className="mt-6 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">IELTS Writing · 2026</p>
          <h1 className="font-serif mt-3 text-4xl tracking-tight sm:text-5xl">
            Two tasks, sixty minutes, four marked criteria.
          </h1>
          <p className="mt-4 text-ink-soft">
            IELTS Writing is scored on Task Achievement/Response, Coherence &amp; Cohesion, Lexical
            Resource, and Grammatical Range &amp; Accuracy. Task 2 counts twice as much as Task 1
            toward your band. Pick a task below for the full, worked guide.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {CARDS.map(({ guide, href }, i) => (
            <Reveal key={href} delay={i * 0.1} className="h-full">
              <Link href={href} className="flex h-full flex-col rounded-2xl border border-line bg-paper-elev p-7 transition-shadow hover:shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-paper-sunken text-ink-soft">
                    <PenLine className="size-5" />
                  </span>
                  <h2 className="text-xl font-semibold text-ink">{guide.title}</h2>
                </div>
                <p className="mt-4 text-sm text-ink-soft">{guide.tagline}</p>
                <p className="mt-2 flex-1 text-sm text-ink-muted">{guide.intro.slice(0, 150)}…</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                  {guide.types.length} question types · Band 9 models <ArrowRight className="size-4" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
        {/* ── What the four criteria actually reward ──────────────────
             A hub ranks when it answers the question its children each answer
             a slice of. Twelve type pages sit under this one; without this
             section the page was 313 words of navigation and nothing to rank. */}
        <section className="mt-16">
          <h2 className="font-serif text-3xl tracking-tight">The four criteria, and what each one is really measuring</h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Both tasks are marked on four equally weighted criteria. Most candidates lose marks in
            the same two, and almost nobody is told which.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {CRITERIA.map((c) => (
              <div key={c.name} className="rounded-2xl border border-line bg-paper-elev p-6">
                <h3 className="text-base font-semibold text-ink">{c.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{c.what}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  <span className="font-medium text-ink-soft">Where marks go: </span>{c.trap}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── The 2026 format, for Writing specifically ─────────────── */}
        <section className="mt-16 rounded-2xl border border-line bg-paper-elev p-7">
          <h2 className="font-serif text-2xl tracking-tight">Writing on screen, and the Writing on Paper option</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">
            IELTS moved to computer-delivered as the standard during 2026, with the final
            paper-based date set at 27 June 2026 in most markets, and UKVI IELTS moving to
            computer-only earlier, on 22 March 2026. For Writing this is the change with the
            largest practical effect on your band, because it changes how you draft. A typed essay
            can be restructured in seconds, so the planning-then-revising approach that was
            expensive on paper is now the cheapest way to lift Coherence and Cohesion. The word
            counter is on screen, which removes the guesswork that used to cost people the
            under-length penalty.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">
            If you genuinely think faster with a pen, a <strong>Writing on Paper</strong> option has
            launched in selected markets: Reading and Listening run on computer, and you handwrite
            the Writing component only. It is an option rather than the default and availability
            varies by test centre, so confirm locally before you book. Handwriting legibility is
            marked in practice on that route — an examiner cannot award marks for a word they
            cannot read.
          </p>
          <Link href="/ielts-2026-changes" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
            Everything that changed in IELTS in 2026 <ArrowRight className="size-4" />
          </Link>
        </section>

        {/* ── Task 1 vs Task 2 weighting ────────────────────────────── */}
        <section className="mt-16">
          <h2 className="font-serif text-3xl tracking-tight">Where to spend your sixty minutes</h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Task 2 is worth twice Task 1 in the Writing band, which makes the standard time split a
            direct consequence of the marking, not a convention.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {SPLIT.map((t) => (
              <div key={t.task} className="rounded-2xl border border-line bg-paper-elev p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base font-semibold text-ink">{t.task}</h3>
                  <span className="font-serif text-2xl tabular-nums text-green">{t.minutes}</span>
                </div>
                <p className="mt-1 text-xs uppercase tracking-wider text-ink-muted">{t.weight} · {t.words}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{t.plan}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-ink-soft">
            Write Task 2 first if you tend to run out of time. Losing five minutes on Task 1 costs
            you a third of one task&apos;s marks; losing five minutes on Task 2 costs you two thirds
            of the whole Writing band. The arithmetic is not close.
          </p>
        </section>

      </main>

      <LandingFooter />
    </div>
  );
}
