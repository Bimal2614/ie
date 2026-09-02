"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cancelSubscriptionAction } from "@/app/actions/billing";
import { cn } from "@/lib/utils";

/**
 * Stopping a recurring charge, from the Settings subscription card.
 *
 * THIS EXISTS BECAUSE THE BILLING IS RECURRING. While a plan was a single
 * payment that simply ran out, there was nothing to cancel — the account
 * lapsed on its own. A Razorpay mandate debits the card every cycle until
 * something tells it not to, so a customer with no way to stop it has only
 * their bank to complain to, and the pricing page's "Cancel anytime" becomes
 * a claim the product does not honour.
 *
 * TWO PRESSES, not one. The first reveals what cancelling actually does; the
 * second does it. A single irreversible button next to "Change password" is
 * how someone ends a subscription they meant to keep.
 */
export function CancelSubscription({ entitledUntil }: { entitledUntil: string | null }) {
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (result) {
    return (
      <p
        role="status"
        className={cn("text-sm", result.ok ? "text-ink-soft" : "text-red-600 dark:text-red-400")}
      >
        {result.message}
      </p>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm font-medium text-ink-muted underline underline-offset-4 transition-colors hover:text-ink"
      >
        Cancel subscription
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-paper-sunken/50 p-4">
      <p className="flex gap-2 text-sm text-ink">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ink-muted" />
        <span>
          {/* Says what is KEPT, not just what is lost: the commonest reason a
              cancellation turns into a support ticket is a customer who thinks
              they have just thrown away the rest of a period they paid for. */}
          You&apos;ll keep full access
          {entitledUntil ? ` until ${entitledUntil}` : " until the end of this period"}, and your
          card won&apos;t be charged again.
        </span>
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setResult(await cancelSubscriptionAction());
            })
          }
          className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper-elev disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Cancelling…" : "Yes, cancel it"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:text-ink"
        >
          Keep my plan
        </button>
      </div>
    </div>
  );
}
