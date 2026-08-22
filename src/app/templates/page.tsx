import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, ListChecks } from "lucide-react";
import { MarketingShell, PageHead } from "@/components/marketing/marketing-shell";
import { Reveal } from "@/components/marketing/motion";
import { TEMPLATE_SECTIONS, type TemplateSet, type TemplateSection } from "@/lib/templates";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "IELTS Writing & Speaking Templates & Sentence Banks | IELTSVega",
  description:
    "Free IELTS templates and sentence banks for Writing (Task 1 & 2) and Speaking (Parts 1–3) — examiner-friendly Band 7–9 patterns, structures and formulas you can adapt to any topic.",
  keywords: [
    "ielts writing template",
    "ielts writing task 2 template",
    "ielts writing task 1 sentences",
    "ielts speaking phrases",
    "ielts speaking part 2 template",
    "ielts sentence bank",
    "ielts band 9 sentences",
    "ielts essay sentences",
  ],
  alternates: { canonical: "/templates" },
};

/** Article + Breadcrumb structured data (JSON-LD is data, no CSP nonce needed). */
function TemplatesJsonLd() {
  const base = SITE_URL;
  const graph = [
    {
      "@type": "Article",
      headline: "IELTS Writing & Speaking Templates & Sentence Banks",
      description:
        "Examiner-friendly Band 7–9 sentence patterns and structures for IELTS Writing (Task 1 & 2) and Speaking (Parts 1–3).",
      articleSection: "Templates",
      url: `${base}/templates`,
      mainEntityOfPage: { "@type": "WebPage", "@id": `${base}/templates` },
      author: { "@type": "Organization", name: "IELTSVega", url: base },
      publisher: { "@type": "Organization", name: "IELTSVega", url: base },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${base}/` },
        { "@type": "ListItem", position: 2, name: "Templates", item: `${base}/templates` },
      ],
    },
  ];
  const json = { "@context": "https://schema.org", "@graph": graph };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

export default function TemplatesPage() {
  return (
    <MarketingShell width="wide">
      <TemplatesJsonLd />

      {/* Breadcrumb — internal links + hierarchy */}
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-brand hover:underline">Home</Link></li>
          <li aria-hidden className="text-ink-muted/50">/</li>
          <li aria-current="page" className="text-ink-soft">Templates</li>
        </ol>
      </nav>

      <Reveal>
        <div className="mt-4">
          <PageHead
            eyebrow="Templates"
            title="IELTS templates & sentence banks."
            lead="Ready-made, examiner-friendly sentences you can adapt to almost any topic. Learn a few from each group, practise them until they're automatic — and follow the links to full worked examples in the study guides."
          />
        </div>
      </Reveal>

      {/* Section tabs (jump to Writing / Speaking) */}
      <div className="mt-10 flex flex-wrap gap-2">
        {TEMPLATE_SECTIONS.map((s) => (
          <a
            key={s.key}
            href={`#${s.key}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition-colors hover:border-brand"
          >
            {s.label}
          </a>
        ))}
        <Link
          href="/resources"
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-sunken"
        >
          <BookOpen className="size-4" /> More study materials
        </Link>
      </div>

      <div className="mt-12 space-y-20">
        {TEMPLATE_SECTIONS.map((section) => (
          <SectionBlock key={section.key} section={section} />
        ))}
      </div>

      {/* CTA — send readers to practise, and to the deeper guides */}
      <div className="mt-16 flex flex-col items-center gap-4 rounded-2xl border border-line bg-paper-elev p-8 text-center">
        <h2 className="font-serif text-2xl tracking-tight">Templates only work if you use them.</h2>
        <p className="max-w-md text-sm text-ink-soft">
          Practise with these patterns and get instant AI band scoring — or read the full guides with Band 9 model answers.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-green px-6 py-3 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105">
            Start practising free <ArrowRight className="size-4" />
          </Link>
          <Link href="/resources" className="inline-flex items-center gap-2 rounded-lg border border-line px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken">
            All study guides <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
}

function SectionBlock({ section }: { section: TemplateSection }) {
  return (
    <section id={section.key} className="scroll-mt-24">
      <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">{section.title}</h2>
      <p className="mt-2 max-w-2xl text-ink-soft">{section.blurb}</p>

      {/* Set jump nav */}
      <div className="mt-5 flex flex-wrap gap-2 border-y border-line py-3 text-sm">
        <span className="text-ink-muted">Jump to:</span>
        {section.sets.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="font-medium text-brand hover:underline">
            {s.label}
          </a>
        ))}
      </div>

      <div className="mt-10 space-y-14">
        {section.sets.map((set) => (
          <TemplateSetBlock key={set.id} set={set} />
        ))}
      </div>
    </section>
  );
}

function TemplateSetBlock({ set }: { set: TemplateSet }) {
  return (
    <div id={set.id} className="scroll-mt-24">
      <h3 className="font-serif text-2xl tracking-tight">{set.title}</h3>
      <p className="mt-2 max-w-2xl text-ink-soft">{set.blurb}</p>

      {/* Cross-link to the deeper guide */}
      <Link
        href={set.resource.href}
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft px-4 py-2.5 text-sm font-medium text-brand transition-colors hover:border-brand/60"
      >
        <BookOpen className="size-4" /> Want worked examples? {set.resource.label}
        <ArrowUpRight className="size-4" />
      </Link>

      {/* Sentence groups */}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {set.groups.map((g) => (
          <div key={g.heading} className="rounded-2xl border border-line bg-paper-elev p-5">
            <h4 className="text-base font-semibold text-ink">{g.heading}</h4>
            {g.note && <p className="mt-1 text-xs text-ink-muted">{g.note}</p>}
            <ul className="mt-3 space-y-3">
              {g.items.map((it) => (
                <li key={it.pattern} className="text-sm">
                  <span className="text-ink-soft">{it.pattern}</span>
                  {it.example && (
                    <span className="mt-1 block border-l-2 border-line pl-3 text-ink-muted italic">
                      e.g. {it.example}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Formula */}
      {set.formula && (
        <div className="mt-6 rounded-2xl border border-line bg-paper-sunken p-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ListChecks className="size-4 text-brand" /> {set.formula.title}
          </p>
          <ol className="mt-4 space-y-2">
            {set.formula.steps.map((st, i) => (
              <li key={st.label} className="flex gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <span className="text-ink-soft">
                  <span className="font-medium text-ink">{st.label} — </span>
                  {st.text}
                </span>
              </li>
            ))}
          </ol>
          {set.formula.note && <p className="mt-4 text-xs text-ink-muted">{set.formula.note}</p>}
        </div>
      )}
    </div>
  );
}
