"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { UpiPayDialog } from "@/components/marketing/upi-pay-dialog";
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
 * A PAID card's button does not navigate. There is no card gateway, so buying
 * means a UPI transfer: the button opens <UpiPayDialog/> with the QR and the
 * VPA, for a visitor and for a signed-in candidate stepping up alike. The free
 * card still links to /signup, since starting free really is just signing up.
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
  const [paying, setPaying] = useState(false);

  const base =
    "mt-6 inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-[filter,background-color]";
  const primary = "bg-green text-green-ink hover:brightness-105";
  const secondary = "border border-line text-ink hover:bg-paper-sunken";

  /** The purchase button on any paid card — the QR is the checkout. */
  const buy = (text: string) => (
    <>
      <button
        type="button"
        onClick={() => setPaying(true)}
        className={cn(base, featured ? primary : secondary)}
      >
        {text} <ArrowRight className="size-4" />
      </button>
      {paying && <UpiPayDialog plan={plan} onClose={() => setPaying(false)} />}
    </>
  );

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

  // A visitor. Free means sign up; anything paid opens the QR.
  if (plan !== "free") return buy(label);

  return (
    <Link href={href} className={cn(base, featured ? primary : secondary)}>
      {label} <ArrowRight className="size-4" />
    </Link>
  );
}
