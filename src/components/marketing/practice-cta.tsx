import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * The mid-content call to action on organic landing pages.
 *
 * Organic readers arrive with a question (what is 32/40, which linking words),
 * get the answer, and leave: the only CTA used to sit under the last section,
 * after the reason to stay was gone. This one sits where the page turns from
 * "what is it" to "how do I improve it", and it offers the matching practice
 * rather than a generic signup.
 *
 * Drawn as a Test Report Form strip: the four skills in TRF order, with the
 * one the reader is studying showing "?" where the band would be. It is the
 * document every reader is working towards, which says "find out your band"
 * without a paragraph of copy.
 *
 * `from` rides on the signup URL so GA4's page_location shows which surface
 * produced the visit; there is no click handler to keep this a server
 * component. The claims match the free tier: Reading and Listening practice on
 * every account, Writing and Speaking through the free AI credits.
 */

export type PracticeSkill = "listening" | "reading" | "writing" | "speaking";
export type PracticeCtaKind = PracticeSkill | "cost" | "overall";

const SKILLS: readonly PracticeSkill[] = ["listening", "reading", "writing", "speaking"];

const SKILL_TINT: Record<PracticeSkill, string> = {
  listening: "bg-section-listening-soft text-section-listening",
  reading: "bg-section-reading-soft text-section-reading",
  writing: "bg-section-writing-soft text-section-writing",
  speaking: "bg-section-speaking-soft text-section-speaking",
};

const COPY: Record<PracticeCtaKind, { eyebrow: string; heading: string; body: string; label: string; next: string }> = {
  writing: {
    eyebrow: "Free AI scoring",
    heading: "What would your essay score today?",
    body: "Write a Task 1 or Task 2 answer and get a band for each of the four criteria, with feedback on what to fix. Your first answers are scored free, no card.",
    label: "Score my writing free",
    next: "/practice/writing",
  },
  speaking: {
    eyebrow: "Free AI scoring",
    heading: "What is your Speaking band right now?",
    body: "Answer real Part 1, 2 and 3 questions out loud and get a band for fluency, vocabulary, grammar and pronunciation. Your first attempts are scored free, no card.",
    label: "Try a speaking test free",
    next: "/practice/speaking",
  },
  reading: {
    eyebrow: "Free on every account",
    heading: "Now try it against the clock.",
    body: "Timed Reading practice, marked the moment you submit, with every answer explained. Free on every account, no card.",
    label: "Start Reading practice",
    next: "/practice/reading",
  },
  listening: {
    eyebrow: "Free on every account",
    heading: "Now try it with the audio running.",
    body: "Timed Listening practice with full recordings, marked the moment you submit, with every answer explained. Free on every account, no card.",
    label: "Start Listening practice",
    next: "/practice/listening",
  },
  cost: {
    eyebrow: "Before you book",
    heading: "Know your band before you pay for the test.",
    body: "Free Reading and Listening practice, and your first Writing and Speaking answers AI-scored, so you book a date you are ready for instead of paying twice.",
    label: "Check my level free",
    next: "/practice",
  },
  overall: {
    eyebrow: "Free to start",
    heading: "Find your band today, not on results day.",
    body: "Free Reading and Listening practice, and your first Writing and Speaking answers AI-scored by band criteria. No card needed.",
    label: "Check my level free",
    next: "/practice",
  },
};

/** Which CTA a blog post gets, from its category. */
export function practiceCtaKindFor(category: string): PracticeCtaKind {
  switch (category) {
    case "Writing":
      return "writing";
    case "Speaking":
      return "speaking";
    case "Reading":
      return "reading";
    case "Listening":
      return "listening";
    case "Booking":
    case "Requirements":
    case "Test format":
      return "cost";
    default:
      return "overall";
  }
}

export function PracticeCta({
  kind,
  from,
  heading,
  body,
}: {
  kind: PracticeCtaKind;
  /** Where the click came from, e.g. `blog-inline` — lands in GA4 page_location. */
  from: string;
  /** Overrides for a page that can say something more specific. */
  heading?: string;
  body?: string;
}) {
  const copy = COPY[kind];
  const focus = kind === "cost" || kind === "overall" ? null : kind;
  const href = `/signup?${new URLSearchParams({ next: copy.next, from }).toString()}`;

  return (
    <aside
      aria-label="Free IELTS practice"
      className="my-10 overflow-hidden rounded-2xl border border-line bg-paper-elev"
    >
      {/* The TRF strip. Decorative: the heading and button say it in words. */}
      <div aria-hidden className="flex items-stretch border-b border-dashed border-line bg-paper-sunken/60 text-center">
        {SKILLS.map((s) => {
          const on = focus === null || focus === s;
          return (
            <div key={s} className="flex-1 border-r border-line/70 px-1 py-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.04em] text-ink-muted sm:text-[10px] sm:tracking-[0.14em]">{s}</p>
              <p
                className={`mx-auto mt-1 grid size-8 place-items-center rounded-md font-serif text-lg tabular-nums ${
                  on ? SKILL_TINT[s] : "text-ink-muted/40"
                }`}
              >
                {on ? "?" : "–"}
              </p>
            </div>
          );
        })}
        <div className="flex-1 px-1 py-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.04em] text-ink sm:text-[10px] sm:tracking-[0.14em]">Overall</p>
          <p className="mx-auto mt-1 grid size-8 place-items-center rounded-md bg-brand font-serif text-lg text-paper">?</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{copy.eyebrow}</p>
          <p className="font-serif mt-2 text-2xl leading-snug tracking-tight text-ink">{heading ?? copy.heading}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body ?? copy.body}</p>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-green px-5 py-3 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105"
        >
          {copy.label} <ArrowRight className="size-4" />
        </Link>
      </div>
    </aside>
  );
}
