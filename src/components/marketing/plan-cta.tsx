"use client";

import Link from "next/link";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useRazorpayCheckout } from "@/components/marketing/use-razorpay-checkout";
import { planAtLeast, PLANS, type PlanKey } from "@/lib/plans";
import { cn } from "@/lib/utils";

/**
 * The button on a pricing card, which depends on who is reading it.
 *
 * A visitor gets the marketing call to action. Someone signed in gets told
 * where they already stand instead — a card they are on says so, a card below
 * what they own says it is covered, and only a genuine step up stays clickable.
 * Sending a signed-in candidate to /signup was the bug this replaces: the proxy
 * bounces a cookie-carrying request off /signup to /dashboard, so the one
 * button that mattered led nowhere.
 *
 * Auth comes from `useAuth()` because /pricing is a static page — the server
 * that rendered it had no session to read. Until the probe resolves, the guest
 * copy shows, which is the safe way round.
 *
 * A PAID CARD OPENS RAZORPAY CHECKOUT, and requires a session to do it. That is
 * the one behavioural change from the UPI QR this replaces: a QR could be shown
 * to a logged-out visitor because a human matched the transfer to an email
 * afterwards, but a recurring mandate has to be attached to an account at the
 * moment it is created, or the renewal three months later has nothing to grant.
 * So a visitor on a paid card is sent to sign up first.
 */
export function PlanCta({
  plan,
  label,
  href,
  featured,
}: {
  plan: PlanKey;
  label: string;
  href: string;
  featured: boolean;
}) {
  const { authenticated, plan: current } = useAuth();
  const { open, phase, error, granted } = useRazorpayCheckout();

  const base =
    "mt-6 inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-[filter,background-color]";
  const primary = "bg-green text-green-ink hover:brightness-105";
  const secondary = "border border-line text-ink hover:bg-paper-sunken";

  /** Sub-copy under the button: an error, or the receipt. Never both. */
  const note = granted ? (
    <p className="mt-3 text-xs font-medium text-green">
      You&apos;re on {granted.plan}. Head to your{" "}
      <Link href="/dashboard" className="underline underline-offset-2">
        dashboard
      </Link>
      .
    </p>
  ) : error ? (
    <p role="status" className="mt-3 text-xs text-ink-soft">
      {error}
    </p>
  ) : null;

  /** The purchase button on any paid card — Razorpay Checkout is the till. */
  const buy = (text: string) => {
    const working = phase === "opening" || phase === "confirming";
    return (
      <>
        <button
          type="button"
          onClick={() => open(plan)}
          disabled={working || phase === "done"}
          className={cn(base, featured ? primary : secondary, working && "cursor-wait opacity-80")}
        >
          {working ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {phase === "confirming" ? "Confirming payment…" : "Opening checkout…"}
            </>
          ) : phase === "done" ? (
            <>
              <Check className="size-4" /> Subscribed
            </>
          ) : (
            <>
              {text} <ArrowRight className="size-4" />
            </>
          )}
        </button>
        {note}
      </>
    );
  };

  if (authenticated && current) {
    if (current === plan) {
      return (
        <div
          aria-current="true"
          className={cn(base, "cursor-default border border-green bg-green-soft text-green-ink")}
        >
          <Check className="size-4" /> Your current plan
        </div>
      );
    }

    // Below what they own — nothing to buy, and nothing lost by saying so.
    if (planAtLeast(current, plan)) {
      return (
        <div className={cn(base, "cursor-default border border-line text-ink-muted")}>
          <Check className="size-4" /> Included in your plan
        </div>
      );
    }

    // A real step up — pay for it.
    return buy(`Upgrade to ${PLANS[plan].label}`);
  }

  /*
   * A visitor, or a probe that has not answered yet.
   *
   * Every card leads to /signup, paid ones included: rendering the checkout
   * button here would open a modal that the server action behind it rejects for
   * having no user. Signing up lands on /dashboard rather than back here — the
   * auth actions redirect there unconditionally and do not read a `next` — so
   * the upgrade prompts on the dashboard are what carry a new account onward.
   */
  return (
    <Link href={href} className={cn(base, featured ? primary : secondary)}>
      {label} <ArrowRight className="size-4" />
    </Link>
  );
}
