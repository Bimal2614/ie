"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { confirmCheckout, startCheckout } from "@/app/actions/billing";
import type { CheckoutSession } from "@/lib/payments/billing";

/**
 * Opening Razorpay Checkout, from the one button that does it.
 *
 * THE SCRIPT IS LOADED ON DEMAND, not in the layout. Checkout is ~100KB of
 * third-party JavaScript that every visitor to a marketing page would otherwise
 * pay for so that the small fraction who press Subscribe save a moment; loading
 * it when the button is pressed costs that fraction one round trip and everyone
 * else nothing.
 *
 * It is injected with `document.createElement` rather than a <script> tag in the
 * markup because of the CSP in src/proxy.ts: `script-src` uses `strict-dynamic`,
 * under which a plain tag with no nonce is refused and a script inserted by
 * already-trusted code inherits that trust. See the Razorpay entries in that
 * file for the frame/connect rules the modal also needs.
 */

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/** Razorpay Checkout's global, narrowed to what this file uses. */
type RazorpayOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: Record<string, string>) => void;
  modal: { ondismiss: () => void };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (payload: unknown) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let loading: Promise<void> | null = null;

function loadCheckout(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  // One in-flight load shared by every button on the page: a double click must
  // not append the script twice.
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null; // let a later attempt retry after a dropped connection
      reject(new Error("Could not load the payment window"));
    };
    document.body.appendChild(script);
  });
  return loading;
}

/**
 * `--brand` from src/app/globals.css as the hex Razorpay's modal wants.
 *
 * Hard-coded rather than read from the custom property: Checkout renders in its
 * own iframe, which cannot see this document's variables, so the value has to
 * cross as a literal either way. Kept in step by hand with the light-theme
 * `--brand: 218 81% 32%`.
 */
const BRAND_HEX = "#0f4094";

export type CheckoutPhase = "idle" | "opening" | "confirming" | "done";

export type CheckoutState = {
  phase: CheckoutPhase;
  error: string | null;
  /** Set once the plan is actually granted, for the confirmation copy. */
  granted: { plan: string; entitledUntil: string } | null;
};

export function useRazorpayCheckout() {
  const router = useRouter();
  // Re-probes /api/me. `router.refresh()` below re-renders the server tree; this
  // is the other half — the client-side auth state the nav and the cards read.
  const { refresh: refreshAuth } = useAuth();
  const [state, setState] = useState<CheckoutState>({
    phase: "idle",
    error: null,
    granted: null,
  });
  // Guards against a second press while the modal is being prepared; the modal
  // itself is exclusive once open.
  const busy = useRef(false);

  const open = useCallback(
    async (plan: string) => {
      if (busy.current) return;
      busy.current = true;
      setState({ phase: "opening", error: null, granted: null });

      const fail = (error: string) => {
        busy.current = false;
        setState({ phase: "idle", error, granted: null });
      };

      // The subscription is created server-side first: the browser never names
      // a price, only a tier, and the server decides whether that tier is on
      // sale and what it costs.
      const created = await startCheckout(plan).catch(() => null);
      if (!created) return fail("Something went wrong. Please try again.");
      if (!created.ok) return fail(created.error);

      try {
        await loadCheckout();
      } catch {
        return fail("Could not open the payment window. Check your connection and try again.");
      }

      const session: CheckoutSession = created.session;
      const Razorpay = window.Razorpay;
      if (!Razorpay) return fail("Could not open the payment window. Please try again.");

      const checkout = new Razorpay({
        key: session.keyId,
        subscription_id: session.subscriptionId,
        name: "IELTSVega",
        description: session.description,
        prefill: session.prefill,
        theme: { color: BRAND_HEX },

        /**
         * Razorpay hands back the signed proof of payment. It is sent straight
         * to the server, which verifies the signature and reads the real
         * subscription back from Razorpay before granting anything — nothing in
         * this object is trusted here.
         */
        handler: (response) => {
          setState({ phase: "confirming", error: null, granted: null });
          confirmCheckout(response)
            .then((result) => {
              busy.current = false;
              if (!result.ok) {
                setState({ phase: "idle", error: result.error, granted: null });
                return;
              }
              // The plan was granted a moment ago on the server, and this page
              // is not about to navigate — so ask for it. The provider writes
              // the new tier into its localStorage cache, which is what stops a
              // stale "free" showing an upgrade prompt to someone who just
              // paid. Clearing that cache instead, as this once did, now reads
              // as a sign-OUT and would blank the nav of a paying customer.
              refreshAuth();
              setState({
                phase: "done",
                error: null,
                granted: { plan: result.plan, entitledUntil: result.entitledUntil },
              });
              router.refresh();
            })
            .catch(() => {
              busy.current = false;
              // The webhook activates the same subscription independently, so a
              // failure here is a delay and not a lost payment.
              setState({
                phase: "idle",
                error: "Your payment went through and we're still confirming it. Refresh in a minute.",
                granted: null,
              });
            });
        },

        // Closing the modal without paying is not an error; it just releases
        // the button. The unpaid subscription at Razorpay stays in `created`
        // and is never charged.
        modal: {
          ondismiss: () => {
            busy.current = false;
            setState((s) => (s.phase === "confirming" ? s : { phase: "idle", error: null, granted: null }));
          },
        },
      });

      checkout.on("payment.failed", () => {
        busy.current = false;
        setState({
          phase: "idle",
          error: "That payment didn't go through. No money has been taken — please try again.",
          granted: null,
        });
      });

      checkout.open();
    },
    [router, refreshAuth],
  );

  const dismiss = useCallback(() => {
    setState({ phase: "idle", error: null, granted: null });
  }, []);

  return { ...state, open, dismiss };
}
