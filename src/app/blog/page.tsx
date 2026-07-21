import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { MarketingShell, PageHead } from "@/components/marketing/marketing-shell";
import { Reveal } from "@/components/marketing/motion";
import { POSTS } from "@/lib/blog";

export const metadata: Metadata = {
  title: "IELTS Blog — Tips, Strategies & Score Guides | IELTSAce",
  description: "Practical IELTS advice: how the band score works, common Writing mistakes, study plans, and skill-by-skill strategies to reach your target band.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  return (
    <MarketingShell width="wide">
      <Reveal>
        <PageHead
          eyebrow="Blog"
          title="Practical IELTS advice that moves your band."
          lead="Clear, no-fluff guides on scoring, strategy and study planning — written around how the exam is actually marked."
        />
      </Reveal>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {POSTS.map((p, i) => (
          <Reveal key={p.slug} delay={i * 0.08} className="h-full">
            <Link href={`/blog/${p.slug}`} className="flex h-full flex-col rounded-2xl border border-line bg-paper-elev p-6 transition-shadow hover:shadow-lg">
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-medium text-brand">{p.category}</span>
                <span className="flex items-center gap-1 text-ink-muted"><Clock className="size-3" /> {p.readMins} min</span>
              </div>
              <h2 className="mt-4 text-lg font-semibold leading-snug text-ink">{p.title}</h2>
              <p className="mt-2 flex-1 text-sm text-ink-soft">{p.excerpt}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                Read article <ArrowRight className="size-4" />
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </MarketingShell>
  );
}
