import type { Metadata } from "next";
import Link from "next/link";
import { Target, Sparkles, ShieldCheck, Globe, ArrowRight } from "lucide-react";
import { MarketingShell, PageHead } from "@/components/marketing/marketing-shell";
import { Reveal } from "@/components/marketing/motion";

export const metadata: Metadata = {
  title: "About IELTSAce — Our Mission & Method for IELTS Success",
  description:
    "IELTSAce is an independent IELTS practice platform combining AI band scoring for Writing & Speaking, full mock tests, and 15,000+ Academic and General Training questions built around how examiners actually mark.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  { Icon: Target, title: "Built around the marking", body: "Every question, mock and score is designed around the official band descriptors — the exact criteria examiners use — not generic English practice." },
  { Icon: Sparkles, title: "AI where it genuinely helps", body: "Instant, criteria-based band scores for Writing and Speaking mean you learn from every answer in seconds, not days." },
  { Icon: ShieldCheck, title: "Honest about your level", body: "Calibrated scoring that tells you the truth, plus specific, actionable feedback on exactly how to reach your next half-band." },
  { Icon: Globe, title: "For Academic & General", body: "Full, separate content for both modules — including General letters and Academic Task 1 visuals — so your practice matches your real exam." },
];

const STATS = [
  { value: "15,000+", label: "exam-style questions" },
  { value: "4", label: "skills, every task type" },
  { value: "2026", label: "exam format, kept current" },
  { value: "9.0", label: "the band we build toward" },
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <Reveal>
        <PageHead
          eyebrow="About IELTSAce"
          title="We help capable people prove it — in band form."
          lead="Fluent, hard-working candidates miss their target band every day. Not because their English is weak, but because IELTS rewards specific, criteria-driven answers that no one shows them how to produce. IELTSAce exists to close that gap."
        />
      </Reveal>

      {/* Mission */}
      <Reveal delay={0.05} className="mt-10 space-y-4 text-ink-soft">
        <p>
          IELTSAce is an independent IELTS preparation platform. We combine a large bank of
          exam-accurate practice, full-length mock tests timed to the real exam, and AI band scoring
          for Writing and Speaking that grades every answer against the four official criteria.
        </p>
        <p>
          Our belief is simple: preparation should mirror the exam. That means practising the exact
          question types you&apos;ll face, under real conditions, with feedback that speaks the
          language of the band descriptors — so improvement is measurable, not hopeful.
        </p>
      </Reveal>

      {/* Stats */}
      <Reveal delay={0.1} className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-paper-elev px-4 py-6 text-center">
            <p className="font-serif text-3xl tracking-tight text-ink">{s.value}</p>
            <p className="mt-1 text-xs text-ink-muted">{s.label}</p>
          </div>
        ))}
      </Reveal>

      {/* Values */}
      <h2 className="mt-14 text-2xl font-semibold tracking-tight text-ink">What we stand for</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {VALUES.map((v, i) => (
          <Reveal key={v.title} delay={i * 0.08} className="h-full">
            <div className="flex h-full flex-col rounded-2xl border border-line bg-paper-elev p-6">
              <span className="grid size-10 place-items-center rounded-xl bg-paper-sunken text-ink-soft"><v.Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold text-ink">{v.title}</h3>
              <p className="mt-1.5 text-sm text-ink-soft">{v.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      {/* CTA */}
      <Reveal delay={0.1} className="mt-14 rounded-2xl border border-line bg-paper-elev p-8 text-center">
        <h2 className="font-serif text-2xl tracking-tight sm:text-3xl">Practise the way it&apos;s marked.</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">Start free — get scored on your first answer today.</p>
        <Link href="/signup" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-green px-6 py-3 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105">
          Start practising free <ArrowRight className="size-4" />
        </Link>
      </Reveal>

      <p className="mt-10 text-center text-xs text-ink-muted">
        IELTS is jointly owned by the British Council, IDP: IELTS Australia and Cambridge University Press &amp; Assessment. IELTSAce is an independent platform and is not affiliated with or endorsed by these organisations.
      </p>
    </MarketingShell>
  );
}
