"use client";

import { Ticket } from "lucide-react";

import { savingOf, type Quote } from "@/lib/partner-pricing";
import { formatPrice, PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

/**
 * Choosing a plan to pay for, and seeing what it costs THIS class.
 *
 * The quotes are computed on the server and handed down, so the number in this
 * <select> is the same number the order is opened for — there is no second
 * calculation here that could disagree with it.
 */

const CONTROL =
  "h-9 rounded-lg border border-line bg-paper-elev px-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-50";

/**
 * A native <option> cannot carry a strikethrough, so the discounted price is
 * spelled out instead: "Pro · ₹974 (was ₹1,299)". The struck-through version
 * lives on the rate card below, where it can be styled.
 */
function label(q: Quote): string {
  const paid = formatPrice(q.payableCents, q.currency);
  const months = `${q.months} month${q.months === 1 ? "" : "s"}`;
  if (q.percent === 0) return `${PLANS[q.plan].label} · ${paid} · ${months}`;
  return `${PLANS[q.plan].label} · ${paid} (was ${formatPrice(q.listCents, q.currency)}) · ${months}`;
}

export function PlanPicker({
  quotes,
  value,
  onChange,
  disabled,
  ariaLabel = "Plan",
  className,
}: {
  quotes: Quote[];
  value: string;
  onChange: (plan: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(CONTROL, className)}
    >
      {quotes.map((q) => (
        <option key={q.plan} value={q.plan}>
          {label(q)}
        </option>
      ))}
    </select>
  );
}

/**
 * "Your partner rate" — shown only to a class that has one.
 *
 * Absent entirely at list price, rather than rendered as "0% off": a panel that
 * mentions a discount to everyone invites the question of how to get one from
 * every partner who does not have one.
 */
export function RateCard({ quotes }: { quotes: Quote[] }) {
  const rate = quotes.find((q) => q.percent > 0);
  if (!rate) return null;

  return (
    <section className="rounded-2xl border border-brand/20 bg-brand-soft/40 p-4">
      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-brand">
        <Ticket className="size-4" /> Your partner rate · {rate.percent}% off
        {rate.code && <span className="rounded-full bg-paper-elev px-2 py-0.5 text-xs">{rate.code}</span>}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
        {quotes.map((q) => (
          <p key={q.plan} className="text-sm text-ink">
            <span className="font-medium">{PLANS[q.plan].label}</span>{" "}
            <span className="font-semibold tabular-nums">{formatPrice(q.payableCents, q.currency)}</span>{" "}
            <span className="text-ink-muted line-through tabular-nums">
              {formatPrice(q.listCents, q.currency)}
            </span>{" "}
            <span className="text-xs text-ink-muted">
              save {formatPrice(savingOf(q), q.currency)} per student
            </span>
          </p>
        ))}
      </div>
    </section>
  );
}
