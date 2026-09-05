"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  DEFAULT_CURRENCY,
  formatPrice,
  priceOf,
  type BillingCurrency,
  type PlanKey,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

/**
 * Which currency the pricing page is quoting, and the control that changes it.
 *
 * THE SERVER DECIDES THE DEFAULT — src/lib/payments/region.ts reads the CDN's
 * country header on the request that rendered the page, so a candidate in Dubai
 * lands on dollars without pressing anything and nothing flickers on hydration.
 * THIS IS THE OVERRIDE for when that guess is wrong: a VPN, a mis-placed IP, an
 * Indian card being used from abroad. A detected price with no way to correct it
 * is the version of this feature that generates support tickets.
 *
 * THE CHOICE TRAVELS TO CHECKOUT. `PlanCta` reads it out of this context and
 * hands it to `startCheckout`, which narrows it to a currency we actually hold
 * Razorpay plans for and then reads the amount out of src/lib/plans.ts — the
 * browser names a currency here, never a price. That is what keeps the figure
 * on the card and the figure on the card statement the same number.
 *
 * Deliberately NOT persisted to localStorage. The switch exists on one page,
 * the purchase happens on that page, and a currency remembered from a previous
 * visit would silently outrank the country the visitor is in today.
 */

type CurrencyContextValue = {
  currency: BillingCurrency;
  setCurrency: (currency: BillingCurrency) => void;
  /** False when only one currency has Razorpay plans behind it. */
  switchable: boolean;
};

/*
 * Defaults to rupees and to NOT switchable, so a card rendered outside a
 * provider — a future page reusing `PlanCta` — shows the base price and no
 * control, rather than throwing.
 */
const CurrencyContext = createContext<CurrencyContextValue>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
  switchable: false,
});

export function CurrencyProvider({
  initial,
  switchable,
  children,
}: {
  initial: BillingCurrency;
  switchable: boolean;
  children: ReactNode;
}) {
  const [currency, setCurrency] = useState<BillingCurrency>(initial);
  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, switchable }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useBillingCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}

const OPTIONS: { code: BillingCurrency; symbol: string; label: string }[] = [
  { code: "INR", symbol: "₹", label: "INR" },
  { code: "USD", symbol: "$", label: "USD" },
];

/**
 * The ₹/$ segmented control.
 *
 * RENDERS NOTHING when only one currency is on sale, which is the state this
 * ships in until `RAZORPAY_PLAN_PRO_USD` and `RAZORPAY_PLAN_PREMIUM_USD` are
 * set. A switch that offers a currency the checkout would then refuse is worse
 * than no switch: the visitor picks it, presses Subscribe, and is told card
 * payments are unavailable.
 */
export function CurrencySwitch({ className }: { className?: string }) {
  const { currency, setCurrency, switchable } = useBillingCurrency();
  if (!switchable) return null;

  return (
    <div
      role="radiogroup"
      aria-label="Currency"
      className={cn(
        "inline-flex items-center rounded-full border border-line bg-paper-elev p-1 text-sm",
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const active = option.code === currency;
        return (
          <button
            key={option.code}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setCurrency(option.code)}
            className={cn(
              "rounded-full px-3.5 py-1.5 font-semibold transition-colors",
              active ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
            )}
          >
            <span aria-hidden="true">{option.symbol}</span> {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A tier's price, in whichever currency is showing.
 *
 * BOTH FIGURES COME FROM THE PLANS TABLE, never from the page's markup — the
 * same table `resolvePlanTerms` checks the Razorpay plan against — so a card
 * cannot advertise a number nothing would charge. The struck price simply does
 * not render on a tier that isn't discounted in this currency.
 *
 * "Was"/"now" are spoken but not shown: line-through is a visual convention a
 * screen reader gives no hint of, so without them the two figures read as one
 * price.
 */
export function PriceTag({ tier, cadence }: { tier: PlanKey; cadence: string }) {
  const { currency } = useBillingCurrency();
  const { priceCents, listPriceCents } = priceOf(tier, currency);

  return (
    <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      {listPriceCents !== null && (
        <span className="font-serif text-2xl tracking-tight text-ink-muted line-through">
          <span className="sr-only">Was </span>
          {formatPrice(listPriceCents, currency)}
        </span>
      )}
      <span className="font-serif text-5xl tracking-tight text-ink">
        {listPriceCents !== null && <span className="sr-only">now </span>}
        {formatPrice(priceCents, currency)}
      </span>
      <span className="text-sm text-ink-muted">/ {cadence}</span>
    </div>
  );
}
