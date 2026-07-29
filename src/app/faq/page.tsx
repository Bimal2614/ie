import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingShell, PageHead } from "@/components/marketing/marketing-shell";
import { Reveal } from "@/components/marketing/motion";
import { FAQS } from "@/lib/faqs";

export const metadata: Metadata = {
  title: "IELTS Practice FAQ — AI Band Scoring & Mock Tests | IELTSAce",
  description:
    "Answers to common questions about practising IELTS online with IELTSAce — AI band scoring for Writing and Speaking, mock tests, Academic vs General Training, and how to raise your band.",
  keywords: [
    "ielts practice faq",
    "ielts online",
    "ai ielts band scoring",
    "ielts mock test",
    "ielts academic",
    "ielts general",
    "how to improve ielts band",
  ],
  alternates: { canonical: "/faq" },
};

/** FAQPage structured data — pairs with the visible Q&A below. JSON-LD is data,
 *  so CSP script-src doesn't gate it and no nonce is needed. */
function FaqJsonLd() {
  const json = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

export default function FaqPage() {
  return (
    <MarketingShell>
      <FaqJsonLd />

      {/* Breadcrumb — internal links + hierarchy */}
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-brand hover:underline">Home</Link></li>
          <li aria-hidden className="text-ink-muted/50">/</li>
          <li aria-current="page" className="text-ink-soft">FAQ</li>
        </ol>
      </nav>

      <Reveal>
        <div className="mt-4">
          <PageHead
            eyebrow="FAQ"
            title="Questions about practising IELTS online, answered."
            lead="Everything about AI band scoring, mock tests, and how IELTSAce helps you reach your target band."
          />
        </div>
      </Reveal>

      <dl className="mt-12 divide-y divide-line border-y border-line">
        {FAQS.map((f) => (
          <div key={f.q} className="py-6">
            <dt><h2 className="text-lg font-semibold text-ink">{f.q}</h2></dt>
            <dd className="mt-2 leading-relaxed text-ink-soft">{f.a}</dd>
          </div>
        ))}
      </dl>

      {/* CTA */}
      <div className="mt-14 flex flex-col items-center gap-4 rounded-2xl border border-line bg-paper-elev p-8 text-center">
        <h2 className="font-serif text-2xl tracking-tight">Still have questions?</h2>
        <p className="max-w-md text-sm text-ink-soft">The fastest way to see how IELTSAce marks is to try it — free to start.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-green px-6 py-3 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105">
            Start practising free <ArrowRight className="size-4" />
          </Link>
          <Link href="/contact" className="inline-flex items-center gap-2 rounded-lg border border-line px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken">
            Contact us
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
}
