import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { MarketingShell, PageHead } from "@/components/marketing/marketing-shell";
import { TypingTest } from "@/components/marketing/typing-test";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, faqJsonLd, pageMeta, webAppJsonLd } from "@/lib/seo";

/**
 * Free IELTS typing test. TARGETING: "ielts typing test", "ielts typing speed",
 * "typing speed for ielts writing", "ielts writing on computer typing". This page
 * owns the typing cluster on its own, tool and explainer together, rather than
 * splitting it with a blog post: on a domain with no authority, two URLs chasing
 * one cluster just compete. The format decision (computer vs Writing on Paper)
 * stays owned by /blog/ielts-online-vs-paper-based and the Writing on Paper post.
 *
 * The typing-minutes table is arithmetic (400 words / wpm), not a statistic.
 */

const PATH = "/ielts-typing-test";
const TITLE = "IELTS Typing Test: Is Your Speed Enough for Writing?";
const DESCRIPTION =
  "Free IELTS typing test on a copy of the computer Writing screen. Check your typing speed and exam pace, and see how much of the 60 minutes typing will take.";

export const metadata = pageMeta({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "IELTS typing test",
    "IELTS typing speed",
    "typing speed for IELTS writing",
    "IELTS computer writing practice",
    "IELTS writing on computer",
    "words per minute IELTS",
    "computer delivered IELTS writing",
    "IELTS typing practice",
  ],
});

const FAQS = [
  {
    q: "What typing speed do I need for IELTS Writing?",
    a: "About 30 words per minute is comfortable, and 40 or more means typing stops mattering. The two tasks need at least 400 words between them, so at 30 wpm the typing itself takes around 13 minutes of your 60, leaving the rest for planning, thinking and checking. Below 20 wpm, typing takes 20 minutes or more, and that comes straight out of your thinking time.",
  },
  {
    q: "Is there a spell-checker in computer-delivered IELTS?",
    a: "No. There is no spell-checker and no grammar checker, so every typo counts as a spelling mistake. You do get a live word count, and cut, copy and paste work inside your own answer.",
  },
  {
    q: "Is typing speed the same as how fast I write an essay?",
    a: "No. Copying a passage measures your mechanical speed, which is your ceiling. Writing your own answer is always slower because you think as you type. Use the Typing speed test to see how much of the hour the keyboard takes, and the Exam pace test to see whether you would actually finish both tasks.",
  },
  {
    q: "Can I write IELTS Writing by hand instead of typing?",
    a: "In selected markets, yes: the Writing on Paper option runs Listening and Reading on computer and lets you handwrite the Writing test. It is not offered for IELTS for UKVI, and you give up the live word count and free editing. Check that your centre offers it before you book.",
  },
  {
    q: "How can I improve my typing speed before the IELTS test?",
    a: "Ten to fifteen minutes a day for two weeks is usually enough to move up a bracket. Type real IELTS answers rather than random words, keep accuracy above 95% before chasing speed, and practise with spell-check switched off so your fingers learn the correct spellings.",
  },
  {
    q: "Does this IELTS typing test save or send what I type?",
    a: "No. The test runs entirely in your browser. Nothing you type is uploaded or stored.",
  },
];

const WPM_ROWS = [15, 20, 25, 30, 40, 50].map((wpm) => {
  const typing = 400 / wpm;
  return { wpm, typing: Math.round(typing), left: Math.round(60 - typing) };
});

export default function TypingTestPage() {
  return (
    <MarketingShell width="wide">
      <JsonLd data={webAppJsonLd({ name: "IELTS Typing Test", description: DESCRIPTION, path: PATH })} />
      <JsonLd data={faqJsonLd(FAQS)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Study materials", path: "/resources" },
          { name: "IELTS typing test", path: PATH },
        ])}
      />

      <PageHead
        eyebrow="Free tool · no sign-up"
        title="IELTS typing test."
        lead="Most IELTS Writing tests are now typed, and the clock does not care how fast your fingers are. Take the test on a copy of the computer-delivered Writing screen, then see how much of your 60 minutes the keyboard will eat."
      />

      <div className="mt-8 max-w-5xl">
        <TypingTest />
      </div>

      <h2 className="mt-16 text-xl font-semibold text-ink">What typing speed do you need for IELTS Writing?</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        IELTS Writing gives you 60 minutes for two tasks: at least 150 words for Task 1 and at least 250 for Task 2.
        Whatever the keyboard takes to put those 400 words on screen is time you cannot spend planning, thinking or
        proofreading. The arithmetic:
      </p>
      <div className="mt-5 max-w-2xl overflow-hidden rounded-2xl border border-line bg-paper-elev">
        <table className="w-full text-sm">
          <caption className="sr-only">Minutes needed to type 400 words at different typing speeds</caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
              <th scope="col" className="px-5 py-2.5 font-medium">Typing speed</th>
              <th scope="col" className="px-5 py-2.5 font-medium">Typing 400 words takes</th>
              <th scope="col" className="px-5 py-2.5 font-medium">Left of your 60 minutes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {WPM_ROWS.map((r) => (
              <tr key={r.wpm}>
                <td className="px-5 py-2.5 font-semibold tabular-nums text-ink">{r.wpm} wpm</td>
                <td className="px-5 py-2.5 tabular-nums text-ink-soft">about {r.typing} min</td>
                <td className={`px-5 py-2.5 font-semibold tabular-nums ${r.wpm >= 30 ? "text-success" : r.wpm >= 20 ? "text-warning" : "text-danger"}`}>
                  about {r.left} min
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
        That is the best case, because it assumes you type without pausing. In a real essay you stop to think, so the
        honest number is your exam pace: the words you produce per minute while composing your own answer. The Exam
        pace mode above measures exactly that.
      </p>

      <h2 className="mt-14 text-xl font-semibold text-ink">What the computer Writing screen gives you, and what it does not</h2>
      <ul className="mt-4 max-w-2xl space-y-2.5">
        {[
          "A live word count. Estimating 250 words by eye is obsolete: watch the counter and stop guessing.",
          "Cut, copy and paste inside your own answer, so reordering a paragraph costs seconds, not a rewrite.",
          "No spell-checker and no grammar checker. Every typo is a spelling mistake the examiner sees, so accuracy matters as much as speed.",
          "Both tasks on one clock. Task 1 and Task 2 share the 60 minutes, and the screen will not stop you spending 35 minutes on Task 1.",
          "Paper for notes. You can still plan by hand on the paper the centre provides.",
        ].map((t) => (
          <li key={t} className="flex gap-2.5 text-sm text-ink-soft">
            <Check className="mt-0.5 size-4 shrink-0 text-green" />
            {t}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm">
        <Link href="/blog/computer-delivered-ielts-guide" className="font-medium text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand">
          A screen-by-screen guide to computer-delivered IELTS
        </Link>
      </p>

      <h2 className="mt-14 text-xl font-semibold text-ink">If you type slowly: drill, or write on paper?</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        In selected markets you can book IELTS with Writing on Paper, where Listening and Reading stay on computer and
        you handwrite the Writing test. It is not offered for IELTS for UKVI, and you give up the word count and free
        editing. For most people the better fix is the keyboard: typing speed is the most improvable variable in the
        whole Writing test, and two weeks of short daily drills usually moves you up a bracket.
      </p>
      <p className="mt-3 text-sm">
        <Link href="/blog/ielts-writing-on-paper-option" className="font-medium text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand">
          IELTS Writing on Paper: who should take the hybrid option
        </Link>
      </p>

      <h2 className="mt-14 text-xl font-semibold text-ink">A two-week plan to close a typing gap</h2>
      <ol className="mt-4 max-w-2xl space-y-3">
        {[
          ["Days 1–3", "Take the 3-minute Typing speed test once a day. Do not chase speed yet: get accuracy above 95% first."],
          ["Days 4–7", "Ten minutes a day copying model IELTS paragraphs, with spell-check off. Your fingers learn the spellings you will need on test day."],
          ["Days 8–11", "Switch to Exam pace. Write a 10-minute opening to a new Task 2 question each day and watch your words per minute."],
          ["Days 12–14", "Write one full Task 2 essay in 40 minutes on a typed screen, then a Task 1 in 20. Check the word count you reached and how much time was left."],
        ].map(([d, t]) => (
          <li key={d} className="flex gap-3 text-sm text-ink-soft">
            <span className="w-20 shrink-0 font-semibold tabular-nums text-ink">{d}</span>
            <span>{t}</span>
          </li>
        ))}
      </ol>

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
          href="/ielts-band-score-calculator"
          className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken"
        >
          IELTS band score calculator <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Practise Writing with AI band scores <ArrowRight className="size-4" />
        </Link>
      </div>
    </MarketingShell>
  );
}
