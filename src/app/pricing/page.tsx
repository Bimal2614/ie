import { Check, X } from "lucide-react";
import { LandingNav } from "@/components/marketing/landing-nav";
import { PlanCta } from "@/components/marketing/plan-cta";
import {
  CurrencyProvider,
  CurrencySwitch,
  PriceTag,
} from "@/components/marketing/currency-switch";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { Reveal } from "@/components/marketing/motion";
import { isCurrencyOnSale } from "@/lib/env";
import { cn } from "@/lib/utils";
import { billingPeriodLabel, type PlanKey } from "@/lib/plans";
import { resolveBillingCurrency } from "@/lib/payments/region";
import { KEYWORDS, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Pricing: IELTS Practice Plans | IELTSVega",
  description:
    "Start IELTS practice free, then unlock unlimited AI band scoring for Writing and Speaking, full mock tests, and 15,000+ Academic and General questions.",
  path: "/pricing",
  keywords: [...KEYWORDS.core, "IELTS practice price", "IELTS course cost", "IELTS preparation online cost", "IELTS practice subscription"],
});

/**
 * The prices depend on where the visitor is, so this page is rendered per
 * request rather than at build time.
 *
 * `resolveBillingCurrency` reads the CDN's country header, which makes the route
 * dynamic on its own; saying so here is documentation as much as configuration.
 * The cost is one server render of a page that was static — worth it against
 * the alternative, which is quoting the currency in the browser after paint and
 * showing every visitor outside India the wrong price for a frame.
 */
export const dynamic = "force-dynamic";

/*
 * The cards.
 *
 * PRICES AND TERMS ARE NOT WRITTEN HERE. Both come from src/lib/plans.ts, which
 * is also what every gate on every submit reads, and what the subscription
 * writer computes an expiry from — so a page promising one price for one
 * stretch of time while the server grants another cannot happen. The copy below
 * (taglines, feature lines) is marketing's, and stays.
 *
 * NOR IS THE CURRENCY. `PriceTag` renders whichever of the tier's prices the
 * visitor is being quoted — the country header picks the default, the ₹/$ switch
 * overrides it, and the same choice is what `PlanCta` opens the checkout in.
 *
 * A CARD HERE IS NOT WHAT PUTS A TIER ON SALE — `OFFERED_PLANS` in
 * src/lib/plans.ts is, and it is also what the checkout action validates
 * against. The two must agree: a card for a tier missing from that list renders
 * a button whose server action refuses it.
 */
const PLANS = [
  {
    name: "Free",
    tier: "free" as PlanKey,
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
    name: "Pro",
    tier: "pro" as PlanKey,
    cadence: billingPeriodLabel("pro"),
    tagline: "Everything marked, month to month.",
    cta: "Go Pro",
    href: "/signup",
    featured: false,
    features: [
      "Unlimited practice questions",
      "AI band scoring on Writing & Speaking",
      "Unlimited full mock tests",
      "All 4 skills, every task type",
      "Full history & progress tracking",
    ],
    // What Pro does NOT buy, stated rather than left to be inferred from the
    // longer list on the card beside it.
    excludes: ["Priority AI scoring", "Band-prediction reports & study plan"],
  },
  {
    name: "Premium",
    tier: "premium" as PlanKey,
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

export default async function PricingPage() {
  /*
   * Where this visitor is, decided once, on the server.
   *
   * The same function the checkout action calls, on the same request, so the
   * figure on the card and the plan the mandate is created against cannot come
   * from two different guesses. The switch below can move it from here; nothing
   * else can.
   */
  const currency = await resolveBillingCurrency();
  // Only offer the switch when there is something to switch to — see
  // `CurrencySwitch`. Until the USD plans are set, everyone is quoted rupees
  // and no control appears.
  const switchable = isCurrencyOnSale("INR") && isCurrencyOnSale("USD");

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

        <CurrencyProvider initial={currency} switchable={switchable}>
          {/* Renders nothing while only one currency has plans behind it. */}
          <div className="mt-8 flex justify-center">
            <CurrencySwitch />
          </div>

          {/* Plans */}
          <div className="mx-auto mt-6 grid max-w-5xl items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

                  <PriceTag tier={p.tier} cadence={p.cadence} />

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
        </CurrencyProvider>

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
