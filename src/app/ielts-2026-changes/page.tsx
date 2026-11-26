import Link from "next/link";
import { ArrowRight, Check, Globe, Info, Monitor, RefreshCw, PenLine, ShieldCheck, ExternalLink, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MarketingShell, PageHead } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { KEYWORDS, breadcrumbJsonLd, faqJsonLd, pageMeta } from "@/lib/seo";

const PATH = "/ielts-2026-changes";
const TITLE = "IELTS Changes 2026 & 2027: What's Real, What's Rumour";
const DESCRIPTION =
  "No IELTS format change is announced for 2027. Reading in order and longer Listening are rumours. What did change in 2026: computer tests and One Skill Retake.";

export const metadata = pageMeta({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [...KEYWORDS.changes2026, ...KEYWORDS.modules],
});

/**
 * 2027 rumours, fact-checked 25 Nov 2026 against ielts.org/news-and-insights
 * (nothing since the 5 Mar 2026 delivery update announces a format change) and
 * the official test-format pages. Re-check before editing: if IELTS announces a
 * real 2027 change, it goes in CHANGES and the matching row here is removed.
 */
const RUMOURS: { claim: string; verdict: string; detail: string }[] = [
  {
    claim: "From 2027, Reading questions will come in sequence: paragraph 1 answers question 1, and so on.",
    verdict: "Not announced. Partly true already.",
    detail: "Most Reading question types already follow the order of the passage: True/False/Not Given, Yes/No/Not Given, multiple choice, short answers, and sentence, note, table and flow-chart completion. Matching tasks (headings, which paragraph contains the information, matching features) are not in order, because finding the place is the skill being tested. A set of questions can also cover only part of a passage, so question 1 is not guaranteed to sit in paragraph 1. IELTS has announced no change to any of this.",
  },
  {
    claim: "IELTS Listening is getting more time in 2027.",
    verdict: "False.",
    detail: "Listening is still about 30 minutes of recording, four parts and 40 questions, heard once. If anything the computer test gives you less spare time, not more: there is no 10-minute transfer period as on paper, just about two minutes at the end to check what you typed.",
  },
  {
    claim: "The IELTS format is changing in 2027.",
    verdict: "No official announcement.",
    detail: "The most recent change to how IELTS is delivered was announced on 5 March 2026: paper-based testing ends from mid-2026, Writing on Paper comes in selected markets, and IELTS says this does not change the skills assessed or the test construct. Its news since then covers Test Report Forms, research and test security. It has announced no new question types, timings, sections or scoring for 2027.",
  },
];

const CHANGES: {
  Icon: LucideIcon;
  title: string;
  body: string;
  /** Optional deeper read, rendered under the body as an internal link. */
  link?: { label: string; href: string };
}[] = [
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
    body: "If one skill lets you down, you can re-sit that single skill instead of the whole exam and receive an updated Test Report Form. The rules are specific: computer-delivered tests only, within 60 days of the original test, in the same country you sat it, and once per full test. There is no minimum band to qualify. It is offered across most of the 110+ countries where IELTS runs, but not in the United States. Confirm the organisation you are applying to accepts a One Skill Retake result before you rely on it.",
  },
  {
    Icon: ShieldCheck,
    title: "The UK raised its work-visa English requirement to B2",
    body: "From 8 January 2026 the English requirement for first-time Skilled Worker, Scale-up and High Potential Individual applicants rose from B1 to B2. On IELTS for UKVI that is 5.5 in every one of the four skills — a per-skill benchmark, not an overall average, so a 6.5 overall with 5.0 in Writing does not qualify. UKVI IELTS also moved to computer-only delivery in early 2026, ahead of the global transition; the date was set country by country, between February and March.",
  },
  {
    Icon: Users,
    title: "Australia stopped most student visa dependants from 2 October 2026",
    body: "Since 2 October 2026, most new Student (subclass 500) visa applications can no longer include a partner or children. What counts is the date you lodge: applications made on or before 1 October follow the old rules. PhD students, Australian- or foreign-government-sponsored students, and Pacific and ASEAN nationals are exempt, and families already in Australia on a student visa are protected. The same change for Temporary Graduate (subclass 485) visas was announced on 17 September but is not yet law. No IELTS score requirement changed.",
    link: { label: "Australia student visa 2026: can you still bring your spouse?", href: "/blog/australia-student-visa-dependants-ban-2026" },
  },
  {
    Icon: Globe,
    title: "The UK promised two-year Graduate visas for some universities",
    body: "Under today's rules the UK Graduate visa lasts two years if you apply on or before 31 December 2026 and 18 months from 1 January 2027, with three years for a PhD. The Budget of 28 October 2026 announced that graduates of high-compliance universities with strong job outcomes will keep two years, but gave no start date, no definition and no list. It is not yet in the Immigration Rules. The Graduate visa has no English test of its own.",
    link: { label: "UK Graduate visa: two years or 18 months?", href: "/blog/uk-graduate-visa-2-years-or-18-months-2026" },
  },
  {
    Icon: Globe,
    title: "What did not change: the questions or the marking",
    body: "Nothing about what the test asks or how it is scored moved in 2026. The same question types, the same timings, the same 0-9 band scale, the same four criteria in Writing and Speaking. Scores are fully comparable across delivery formats, and there is no scoring advantage or penalty either way. Preparation material written for the paper test is still accurate about content — only about medium is it out of date.",
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
    q: "Is IELTS changing in 2027?",
    a: "As of 25 November 2026, IELTS has announced no change to the test format, question types, timings or scoring for 2027. The latest change to delivery was announced in March 2026: paper-based testing ends from mid-2026 and a Writing on Paper option comes in selected markets. Treat any other '2027 IELTS change' as a rumour until it appears on ielts.org.",
  },
  {
    q: "Will IELTS Reading questions be in order from 2027?",
    a: "Nothing has been announced. Most Reading question types already follow the order of the passage, including True/False/Not Given, multiple choice and the completion tasks. Matching headings, matching information and matching features do not, and there is no announcement that this will change.",
  },
  {
    q: "Has the IELTS Listening time increased?",
    a: "No. The recording is still about 30 minutes, with four parts and 40 questions, played once. On computer there is no 10-minute transfer time as on paper, only about two minutes to check your answers at the end, so in practice the spare time is shorter.",
  },
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
  {
    q: "Which IELTS sections are on computer, and can I still write on paper?",
    a: "Listening, Reading and Writing all run on computer as standard, and Speaking remains a live face-to-face interview with an examiner in every format. In selected markets a Writing on Paper option lets you handwrite the Writing component while Listening and Reading stay on screen. It is an option rather than the default, availability varies by test centre, and it does not change how the Writing is marked.",
  },
  {
    q: "Can I take One Skill Retake in a different country from my original test?",
    a: "No. You must sit the One Skill Retake in the same country where you took the original test, within 60 days of it, and it is available for computer-delivered IELTS only. You may use it once per full test, and there is no minimum band score needed to qualify. It is not currently offered in the United States.",
  },
  {
    q: "What IELTS score do I need for a UK Skilled Worker visa in 2026?",
    a: "From 8 January 2026 the requirement is CEFR B2, which on IELTS for UKVI means 5.5 in each of Listening, Reading, Writing and Speaking. The benchmark applies per skill rather than to your overall band, so every one of the four has to reach 5.5 independently. SELT results are valid for two years and must still be current when you submit the application.",
  },
  {
    q: "Is a computer-delivered IELTS score worth the same as a paper one?",
    a: "Yes. The band scale, the question types and the marking criteria are identical, and scores are fully comparable across formats. No university or visa authority treats a computer-delivered result differently from a paper-based one. Computer-delivered results are also released faster, typically within a few days rather than around two weeks.",
  },
];

const SOURCES = [
  { label: "IELTS.org: updates to IELTS test delivery (5 March 2026)", href: "https://ielts.org/news-and-insights/updates-to-ielts-test-delivery" },
  { label: "IELTS.org: news and insights", href: "https://ielts.org/news-and-insights" },
  { label: "Cambridge English: IELTS test format", href: "https://www.cambridgeenglish.org/exams-and-tests/ielts/test-format/" },
  { label: "IDP IELTS: test delivery updates for 2026", href: "https://ielts.idp.com/about/news-and-articles/article-updates-to-ielts-test-delivery" },
  { label: "IELTS.org: ways to take IELTS", href: "https://ielts.org/take-a-test/test-types" },
  { label: "UK Home Office: English language requirement for work visas", href: "https://www.gov.uk/english-language" },
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
        eyebrow="Updated 25 November 2026"
        title="What changed in IELTS in 2026, and what is not changing in 2027."
        lead="2026 was a delivery year, not a content year. The exam still asks the same things and marks them the same way, but how you sit it, and what happens if one skill lets you down, both changed. For 2027, IELTS has announced no format change at all."
      />

      {/* 2027 rumour check: the cluster "ielts changes 2027" lands here, not on a new post */}
      <section id="2027" className="mt-10 scroll-mt-24">
        <h2 className="text-xl font-semibold text-ink">IELTS 2027 changes: the rumours checked</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Claims about a "new IELTS pattern from 2027" are spreading on social media. We checked each
          one against IELTS&apos;s own announcements on 25 November 2026.
        </p>
        <div className="mt-4 space-y-4">
          {RUMOURS.map((r) => (
            <div key={r.claim} className="rounded-2xl border border-line bg-paper-elev p-5">
              <p className="text-sm font-semibold text-ink">&ldquo;{r.claim}&rdquo;</p>
              <p className="mt-2 inline-flex rounded-full bg-paper-sunken px-2.5 py-0.5 text-xs font-semibold text-ink">
                {r.verdict}
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{r.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <h2 className="mt-14 text-xl font-semibold text-ink">What actually changed in 2026</h2>

      {/* The three real changes */}
      <div className="mt-10 space-y-5">
        {CHANGES.map((c) => (
          <section key={c.title} className="rounded-2xl border border-line bg-paper-elev p-6">
            <h2 className="flex items-start gap-3 text-lg font-semibold text-ink">
              <c.Icon className="mt-0.5 size-5 shrink-0 text-brand" />
              {c.title}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{c.body}</p>
            {c.link && (
              <Link href={c.link.href} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                {c.link.label}
                <ArrowRight className="size-4" />
              </Link>
            )}
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
          href="/signup"
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
        <Link
          href="/ielts-typing-test"
          className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken"
        >
          Free IELTS typing test <ArrowRight className="size-4" />
        </Link>
      </div>
    </MarketingShell>
  );
}
