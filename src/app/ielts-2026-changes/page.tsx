import Link from "next/link";
import { ArrowRight, Check, Info, Monitor, RefreshCw, PenLine, ExternalLink } from "lucide-react";
import { MarketingShell, PageHead } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { KEYWORDS, breadcrumbJsonLd, faqJsonLd, pageMeta } from "@/lib/seo";

const PATH = "/ielts-2026-changes";
const TITLE = "IELTS 2026 Changes: Computer-Delivered Tests, One Skill Retake & Writing on Paper | IELTSVega";
const DESCRIPTION =
  "What changed in IELTS in 2026: paper-based testing retired in most markets from 27 June 2026, computer-delivered IELTS as the standard, One Skill Retake, and the new Writing on Paper option. What it means for how you prepare.";

export const metadata = pageMeta({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [...KEYWORDS.changes2026, ...KEYWORDS.modules],
});

const CHANGES = [
  {
    Icon: Monitor,
    title: "Paper-based IELTS has been retired in most markets",
    body: "IELTS test delivery moved to computer as the standard. In most markets the final paper-based test date was 27 June 2026, and new bookings are computer-delivered. If you last prepared on paper, the content is identical. What changes is how you read, navigate and answer.",
  },
  {
    Icon: PenLine,
    title: "A 'Writing on Paper' option in selected markets",
    body: "In selected markets you can choose to handwrite the Writing component while the rest of the test runs on computer. It is an option, not the default, and availability varies by test centre. Check your centre before you book if handwriting matters to you.",
  },
  {
    Icon: RefreshCw,
    title: "One Skill Retake is a standard feature",
    body: "If one skill lets you down, you can re-sit that single skill instead of the whole exam, within 60 days of your original test, and receive an updated Test Report Form. It only applies to computer-delivered IELTS. Confirm the organisation you are applying to accepts a One Skill Retake result before you rely on it.",
  },
];

const UNCHANGED = [
  "Four skills, same order: Listening, Reading, Writing, Speaking.",
  "The same 0-9 band scale, and the same rounding to the nearest half band.",
  "Listening 30 minutes / 40 questions; Reading 60 minutes / 40 questions.",
  "Writing 60 minutes: Task 1 (150+ words) and Task 2 (250+ words), Task 2 weighted double.",
  "Speaking is still a live 11-14 minute interview with an examiner, in three parts.",
  "Academic and General Training remain separate modules with separate Reading and Task 1 papers.",
];

const PREP_SHIFTS = [
  { title: "Read on screen, not on paper", body: "You cannot underline a passage with a pencil. Practise using the on-screen highlight and note tools, and get used to scrolling a long passage rather than seeing it in one spread." },
  { title: "Type your essays under time", body: "Typing speed and on-screen editing now directly affect your Writing score. Draft, restructure and proofread in a text box, not in a notebook, so 60 minutes feels the same on test day." },
  { title: "Transfer time is gone in Listening", body: "Computer-delivered Listening gives you around two minutes to check answers at the end instead of ten minutes to transfer them. Type answers correctly the first time; spelling still counts." },
  { title: "Target your weakest skill", body: "With One Skill Retake available, it is worth pushing one weak skill hard rather than spreading effort evenly. A half band there can move your overall result." },
];

const FAQS = [
  {
    q: "Is the paper-based IELTS test still available in 2026?",
    a: "In most markets, no. IELTS moved to computer-delivered as the standard, with the final paper-based date set at 27 June 2026 in most markets. Some markets offer a Writing on Paper option, where you handwrite the Writing component only. Availability varies by centre, so check locally before booking.",
  },
  {
    q: "Did the IELTS test format or scoring change in 2026?",
    a: "No. The four skills, the question types, the timings and the 0-9 band scale are unchanged. The 2026 updates are about how the test is delivered, not what it asks or how it is marked.",
  },
  {
    q: "What is IELTS One Skill Retake?",
    a: "One Skill Retake lets you re-sit a single skill, Listening, Reading, Writing or Speaking, within 60 days of your original computer-delivered test, and receive an updated Test Report Form. Check that the institution or visa authority you are applying to accepts it.",
  },
  {
    q: "Is computer-delivered IELTS harder than paper?",
    a: "It is not marked differently and the questions are the same. What differs is the working style: reading long passages on screen, typing essays, and a much shorter answer-checking window in Listening. Candidates who practise on screen generally find the switch straightforward.",
  },
  {
    q: "How should I prepare for computer-delivered IELTS?",
    a: "Practise in the same medium as the test. Do full-length timed sections on screen, type your Writing answers rather than handwriting them, and rehearse using on-screen highlighting for Reading. Familiarity with the interface removes a whole category of avoidable mistakes.",
  },
];

const SOURCES = [
  { label: "IDP IELTS: test delivery updates for 2026", href: "https://ielts.idp.com/about/news-and-articles/article-updates-to-ielts-test-delivery" },
  { label: "IELTS.org, how IELTS is scored", href: "https://www.ielts.org/for-test-takers/how-ielts-is-scored" },
  { label: "British Council: prepare for IELTS", href: "https://takeielts.britishcouncil.org/take-ielts/prepare" },
];

export default function Ielts2026ChangesPage() {
  return (
    <MarketingShell>
      <JsonLd data={faqJsonLd(FAQS)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "IELTS 2026 changes", path: PATH },
        ])}
      />

      <PageHead
        eyebrow="Updated August 2026"
        title="What changed in IELTS in 2026."
        lead="2026 was a delivery year, not a content year. The exam still asks the same things and marks them the same way, but how you sit it, and what happens if one skill lets you down, both changed."
      />

      {/* The three real changes */}
      <div className="mt-10 space-y-5">
        {CHANGES.map((c) => (
          <section key={c.title} className="rounded-2xl border border-line bg-paper-elev p-6">
            <h2 className="flex items-start gap-3 text-lg font-semibold text-ink">
              <c.Icon className="mt-0.5 size-5 shrink-0 text-brand" />
              {c.title}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{c.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-6 flex gap-3 rounded-2xl border border-line bg-paper-sunken p-5">
        <Info className="mt-0.5 size-5 shrink-0 text-ink-muted" />
        <p className="text-sm leading-relaxed text-ink-soft">
          Test dates, formats and the availability of One Skill Retake vary by country
          and by test centre. Always confirm the current arrangements with your test
          centre and with whoever is asking for your score before you book.
        </p>
      </div>

      {/* What did NOT change — reassurance, and it ranks for "is IELTS changing" */}
      <h2 className="mt-14 text-xl font-semibold text-ink">What did not change</h2>
      <ul className="mt-4 space-y-2.5">
        {UNCHANGED.map((t) => (
          <li key={t} className="flex gap-2.5 text-sm text-ink-soft">
            <Check className="mt-0.5 size-4 shrink-0 text-green" />
            {t}
          </li>
        ))}
      </ul>

      {/* The practical consequence */}
      <h2 className="mt-14 text-xl font-semibold text-ink">What this changes about how you prepare</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {PREP_SHIFTS.map((p) => (
          <div key={p.title} className="rounded-2xl border border-line bg-paper-elev p-5">
            <h3 className="text-sm font-semibold text-ink">{p.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{p.body}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-14 text-xl font-semibold text-ink">Frequently asked questions</h2>
      <dl className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper-elev">
        {FAQS.map((f) => (
          <div key={f.q} className="px-5 py-4">
            <dt className="text-sm font-semibold text-ink">{f.q}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">{f.a}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-12 rounded-2xl border border-line bg-paper-elev p-6">
        <h2 className="text-lg font-semibold text-ink">Official sources</h2>
        <ul className="mt-3 space-y-2">
          {SOURCES.map((s) => (
            <li key={s.href}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
              >
                {s.label} <ExternalLink className="size-3.5" />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-ink-muted">
          IELTS is jointly owned by the British Council, IDP: IELTS Australia and
          Cambridge University Press &amp; Assessment. IELTSVega is an independent
          practice platform and is not affiliated with them.
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/mock-tests"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Practise on screen, like the real test <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/ielts-band-score-calculator"
          className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken"
        >
          Band score calculator <ArrowRight className="size-4" />
        </Link>
      </div>
    </MarketingShell>
  );
}
