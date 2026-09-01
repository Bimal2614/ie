import { Check, X } from "lucide-react";
import { LandingNav } from "@/components/marketing/landing-nav";
import { PlanCta } from "@/components/marketing/plan-cta";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { Reveal } from "@/components/marketing/motion";
import { cn } from "@/lib/utils";
import {
  billingPeriodLabel,
  formatPrice,
  PLANS as PLAN_ENTITLEMENTS,
  type PlanKey,
} from "@/lib/plans";
import { KEYWORDS, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Pricing: IELTS Practice Plans | IELTSVega",
  description:
    "Start IELTS practice free, then unlock unlimited AI band scoring for Writing and Speaking, full mock tests, and 15,000+ Academic and General questions.",
  path: "/pricing",
  keywords: [...KEYWORDS.core, "IELTS practice price", "IELTS course cost", "IELTS preparation online cost", "IELTS practice subscription"],
});

/**
 * "₹4,000" for a plan that now costs ₹2,499 — the pre-discount price, or `null`
 * for a tier that isn't discounted. Read from the same table as the price beside
 * it, so a promotion that ends cannot leave a struck-out figure on the card.
 */
function listPrice(tier: PlanKey): string | null {
  const cents = PLAN_ENTITLEMENTS[tier].listPriceCents;
  return cents === null ? null : formatPrice(cents);
}

/*
 * The cards.
 *
 * PRICES AND TERMS ARE NOT WRITTEN HERE. Both come from src/lib/plans.ts, which
 * is also what every gate on every submit reads, and what the subscription
 * writer computes an expiry from — so a page promising one price for one
 * stretch of time while the server grants another cannot happen. The copy below
 * (taglines, feature lines) is marketing's, and stays.
 *
 * ONE PAID TIER IS SOLD. Pro is still defined in src/lib/plans.ts — an account
 * granted it must keep resolving to what it was sold — but it has no card here,
 * so Premium is the only thing a visitor can buy and the only thing an upgrade
 * prompt names. Bringing it back is a card here plus `OFFERED_PLANS` there.
 */
const PLANS = [
  {
    name: "Free",
    tier: "free" as PlanKey,
    price: formatPrice(PLAN_ENTITLEMENTS.free.priceCents),
    was: listPrice("free"),
    cadence: billingPeriodLabel("free"),
    tagline: "Get a feel for how IELTSVega practice works.",
    cta: "Start free",
    href: "/signup",
    featured: false,
    features: [
      "50 Reading & Listening practice questions / month",
      "Instant answers and explanations",
      "Academic & General content",
    ],
    // Rendered with a muted cross, so the free tier's ceiling is stated rather
    // than left for the reader to infer from an absence.
    excludes: ["AI band scoring on Writing & Speaking"],
  },
  {
    name: "Premium",
    tier: "premium" as PlanKey,
    price: formatPrice(PLAN_ENTITLEMENTS.premium.priceCents),
    was: listPrice("premium"),
    // "3 months" — one payment covers the whole term. `billingMonths` in
    // src/lib/plans.ts is what both this and the granted window read from.
    cadence: billingPeriodLabel("premium"),
    tagline: "Serious prep, with a plan built around your weak spots.",
    cta: "Go Premium",
    href: "/signup",
    featured: true,
    features: [
      "Unlimited practice questions",
      "AI band scoring on Writing & Speaking",
      "Unlimited full mock tests",
      "All 4 skills, every task type",
      "Priority AI scoring",
      "Personalised weekly study plan from your weakest criteria",
      "Band-prediction reports",
      "Full history & progress tracking",
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
            Start free and upgrade when you&apos;re ready. Every plan is built around the way IELTS examiners actually mark, no filler.
          </p>
        </Reveal>

        {/* Plans */}
        <div className="mx-auto mt-14 grid max-w-3xl items-start gap-6 sm:grid-cols-2">
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

                {/* The struck price is the tier's own `listPriceCents`, never a
                    number typed here, and it simply doesn't render on a tier
                    that isn't discounted. "Was"/"now" are spoken but not shown:
                    line-through is a visual convention a screen reader gives no
                    hint of, so without them both figures read as one price. */}
                <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {p.was && (
                    <span className="font-serif text-2xl tracking-tight text-ink-muted line-through">
                      <span className="sr-only">Was </span>
                      {p.was}
                    </span>
                  )}
                  <span className="font-serif text-5xl tracking-tight text-ink">
                    {p.was && <span className="sr-only">now </span>}
                    {p.price}
                  </span>
                  <span className="text-sm text-ink-muted">/ {p.cadence}</span>
                </div>

                <PlanCta plan={p.tier} label={p.cta} href={p.href} featured={p.featured} />

                <ul className="mt-7 space-y-3 border-t border-line pt-6 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-ink-soft">
                      <Check className="mt-0.5 size-4 shrink-0 text-green" />
                      {f}
                    </li>
                  ))}
                  {p.excludes?.map((f) => (
                    <li key={f} className="flex gap-2.5 text-ink-muted">
                      <X className="mt-0.5 size-4 shrink-0 text-ink-muted" />
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
