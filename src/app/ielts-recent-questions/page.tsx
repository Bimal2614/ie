import Link from "next/link";
import { ArrowRight, BookOpen, Headphones, Mail, Mic, PenLine, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MarketingShell, PageHead } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, faqJsonLd, pageMeta } from "@/lib/seo";
import { POSTS, currentRecentPost, recentInfo, type RecentKind } from "@/lib/blog";

/*
 * One permanent URL for "ielts recent questions".
 *
 * Each month's lists live on dated slugs, so every month starts ranking from
 * zero. This page never changes address and always points at the list for
 * this month (the same `currentRecentPost` the homepage uses), so the ranking
 * it builds carries over from month to month. Nothing here is hand-kept:
 * publishing a new month's post moves the links on its own.
 */

const PATH = "/ielts-recent-questions";
const TITLE = "Recent IELTS Questions: This Month's Topics, All Skills";
const DESCRIPTION =
  "This month's recent IELTS questions in one place: Speaking cue cards, Writing Task 1 and Task 2, GT letters, Reading and Listening topics, updated monthly.";

export const metadata = pageMeta({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ielts recent questions",
    "recent ielts exam questions",
    "ielts questions this month",
    "latest ielts questions 2026",
    "recent ielts speaking questions",
    "recent ielts writing topics",
    "recent ielts reading topics",
    "recent ielts listening topics",
  ],
});

// The current list is derived from today's date, so refresh daily like the homepage.
export const revalidate = 86400;

const SKILLS: { kind: RecentKind; label: string; blurb: string; Icon: LucideIcon }[] = [
  { kind: "speaking", label: "Speaking", blurb: "Part 1 questions, Part 2 cue cards and Part 3 follow-ups, with model answers.", Icon: Mic },
  { kind: "writing", label: "Writing Task 2", blurb: "Essay themes by question type, with a plan and a Band 8 opening.", Icon: PenLine },
  { kind: "task1", label: "Writing Task 1 (Academic)", blurb: "Charts, maps and processes, with the overview sentence for each type.", Icon: BarChart3 },
  { kind: "letter", label: "Writing Task 1 (General Training)", blurb: "Letter situations with the right tone, a plan and an opening line.", Icon: Mail },
  { kind: "reading", label: "Reading", blurb: "Passage topics and the question types that came with them.", Icon: BookOpen },
  { kind: "listening", label: "Listening", blurb: "What each part contains, and where marks are lost.", Icon: Headphones },
];

const FAQS = [
  {
    q: "Are these the real IELTS questions?",
    a: "No. IELTS never publishes its live questions. These lists are built from topics candidates reported after their tests, written in our own words. The same topics come back across test dates, which is why recent reports are a useful guide.",
  },
  {
    q: "How often is this page updated?",
    a: "Every month. Each new month's lists go up about two weeks before the month starts, and this page switches to them automatically when the month begins.",
  },
  {
    q: "When do IELTS Speaking topics change?",
    a: "Part 2 cue cards are widely reported to refresh in January, May and September. IELTS does not confirm the dates. Writing, Reading and Listening have no reported rotation, and their topics recur across years.",
  },
  {
    q: "What is the best way to use recent questions?",
    a: "Practise the topic, not the exact wording. Write or record an answer for each theme, get it scored, and fix the criterion that is holding your band down. Memorised answers are easy for examiners to spot and lower your score.",
  },
];

export default function RecentQuestionsPage() {
  const current = SKILLS.map((s) => ({ ...s, post: currentRecentPost(s.kind) }));
  const currentSlugs = new Set(current.map((c) => c.post.slug));
  const earlier = POSTS.filter((p) => recentInfo(p.slug) && !currentSlugs.has(p.slug));

  return (
    <MarketingShell>
      <JsonLd data={faqJsonLd(FAQS)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Recent IELTS questions", path: PATH },
        ])}
      />

      <PageHead
        eyebrow="Updated every month"
        title="Recent IELTS questions, this month."
        lead="The topics candidates are reporting now, for every skill, in one place. Each list has a free practice link under every prompt, so you can answer it and get a band straight away."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {current.map(({ kind, label, blurb, Icon, post }) => (
          <Link
            key={kind}
            href={`/blog/${post.slug}`}
            className="group flex flex-col rounded-2xl border border-line bg-paper-elev p-5 transition-colors hover:border-brand"
          >
            <span className="flex items-center gap-2.5 text-sm font-semibold text-ink">
              <Icon className="size-5 shrink-0 text-brand" />
              {label}
            </span>
            <span className="mt-2 text-sm leading-relaxed text-ink-soft">{blurb}</span>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand">
              {post.title}
              <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
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

      {earlier.length > 0 && (
        <>
          <h2 className="mt-14 text-xl font-semibold text-ink">Earlier and upcoming lists</h2>
          <p className="mt-2 text-sm text-ink-soft">Topics repeat across months, so older lists are still worth practising.</p>
          <ul className="mt-4 space-y-2">
            {earlier.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="text-sm font-medium text-brand hover:underline">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Practise these topics with instant band scores <ArrowRight className="size-4" />
        </Link>
      </div>
    </MarketingShell>
  );
}
