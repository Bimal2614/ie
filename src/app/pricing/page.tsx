import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { Reveal } from "@/components/marketing/motion";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing — IELTS Practice Plans | IELTSAce",
  description:
    "Simple IELTS practice pricing. Start free, or unlock unlimited AI band scoring for Writing & Speaking, full mock tests, and 15,000+ Academic and General Training questions.",
  alternates: { canonical: "/pricing" },
};

/* ---- Placeholder pricing — swap prices/features for the real plan before launch. ---- */
const PLANS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    tagline: "Get a feel for how IELTSAce marks.",
    cta: "Start free",
    href: "/signup",
    featured: false,
    features: [
      "50 practice questions / month",
      "1 full mock test / month",
      "Basic band estimate",
      "Academic & General content",
    ],
  },
  {
    name: "Pro",
    price: "$19",
    cadence: "per month",
    tagline: "Everything you need to reach your target band.",
    cta: "Start Pro",
    href: "/signup",
    featured: true,
    features: [
      "Unlimited practice questions",
      "AI band scoring on Writing & Speaking",
      "Unlimited full mock tests",
      "Full history & progress tracking",
      "All 4 skills, every task type",
    ],
  },
  {
    name: "Premium",
    price: "$39",
    cadence: "per month",
    tagline: "Serious prep with expert guidance.",
    cta: "Go Premium",
    href: "/signup",
    featured: false,
    features: [
      "Everything in Pro",
      "Priority AI scoring",
      "Human feedback on 4 essays / month",
      "Band-prediction reports",
      "Priority support",
    ],
  },
];

const INCLUDED = [
  "Academic & General Training",
  "Real 2026 exam timing",
  "Cancel anytime",
  "No card required to start",
];

export default function PricingPage() {
  return (
    <div className="min-h-svh bg-paper text-ink">
      <LandingNav alwaysSolid />

      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-28 sm:pt-32">
        {/* Header */}
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Pricing</p>
          <h1 className="font-serif mt-3 text-4xl tracking-tight sm:text-5xl">
            One plan to your target band.
          </h1>
          <p className="mt-4 text-ink-soft">
            Start free and upgrade when you&apos;re ready. Every plan is built around the way IELTS
            examiners actually mark — no filler.
          </p>
        </Reveal>

        {/* Plans */}
        <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.1} className="h-full">
              <div
                className={cn(
                  "flex h-full flex-col rounded-2xl border bg-paper-elev p-7",
                  p.featured ? "border-2 border-green shadow-lg" : "border-line",
                )}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-ink">{p.name}</h2>
                  {p.featured && (
                    <span className="rounded-full bg-green px-3 py-1 text-xs font-semibold text-green-ink">
                      Most popular
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-ink-muted">{p.tagline}</p>

                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="font-serif text-5xl tracking-tight text-ink">{p.price}</span>
                  <span className="text-sm text-ink-muted">/ {p.cadence}</span>
                </div>

                <Link
                  href={p.href}
                  className={cn(
                    "mt-6 inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-[filter,background-color]",
                    p.featured
                      ? "bg-green text-green-ink hover:brightness-105"
                      : "border border-line text-ink hover:bg-paper-sunken",
                  )}
                >
                  {p.cta} <ArrowRight className="size-4" />
                </Link>

                <ul className="mt-7 space-y-3 border-t border-line pt-6 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-ink-soft">
                      <Check className="mt-0.5 size-4 shrink-0 text-green" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Included-in-all strip */}
        <Reveal className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-line bg-paper-elev px-6 py-5 text-sm text-ink-soft">
          {INCLUDED.map((f) => (
            <span key={f} className="flex items-center gap-2">
              <Check className="size-4 text-green" /> {f}
            </span>
          ))}
        </Reveal>
      </main>

      <LandingFooter />
    </div>
  );
}
