"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { confirmStudentPayment, startStudentCheckout } from "@/app/actions/partner";
import { BRAND_HEX, loadCheckout } from "@/components/payments/razorpay-loader";
import type { BillingCurrency } from "@/lib/plans";

/**
 * Paying for one student, from whichever button was pressed.
 *
 * A ONE-OFF ORDER, not a mandate: the modal is opened against `order_id`, so
 * the class is charged once for the term it chose and nothing recurs. See
 * src/lib/payments/partner-billing.ts for why that is the shape.
 *
 * The order is created SERVER-SIDE first. The browser names a student and a
 * tier; it never names a price.
 */

export type StudentCheckoutPhase = "idle" | "opening" | "confirming" | "done";

export type StudentCheckoutState = {
  phase: StudentCheckoutPhase;
  error: string | null;
  /** The student id the modal is currently about, so one row can show a spinner. */
  activeStudentId: string | null;
  granted: { studentId: string; plan: string; entitledUntil: string | null } | null;
};

const IDLE: StudentCheckoutState = {
  phase: "idle",
  error: null,
  activeStudentId: null,
  granted: null,
};

export function useStudentCheckout() {
  const router = useRouter();
  const [state, setState] = useState<StudentCheckoutState>(IDLE);
  // Guards a second press while the modal is being prepared; the modal itself
  // is exclusive once open.
  const busy = useRef(false);

  const open = useCallback(
    async (studentId: string, plan: string, currency?: BillingCurrency) => {
      if (busy.current) return;
      busy.current = true;
      setState({ ...IDLE, phase: "opening", activeStudentId: studentId });

      const fail = (error: string) => {
        busy.current = false;
        setState({ ...IDLE, error });
      };

      const created = await startStudentCheckout(studentId, plan, currency).catch(() => null);
      if (!created) return fail("Something went wrong. Please try again.");
      if (!created.ok) return fail(created.error);

      try {
        await loadCheckout();
      } catch {
        return fail("Could not open the payment window. Check your connection and try again.");
      }

      const session = created.session;
      const Razorpay = window.Razorpay;
      if (!Razorpay) return fail("Could not open the payment window. Please try again.");

      const checkout = new Razorpay({
        key: session.keyId,
        order_id: session.orderId,
        amount: session.amount,
        currency: session.currency,
        name: "IELTSVega",
        description: session.description,
        prefill: session.prefill,
        theme: { color: BRAND_HEX },

        /**
         * The signed proof of payment, sent straight to the server. Nothing in
         * this object is trusted here: the action verifies the signature and
         * then reads the order back from Razorpay before granting a term.
         */
        handler: (response) => {
          setState({ ...IDLE, phase: "confirming", activeStudentId: studentId });
          confirmStudentPayment(response)
            .then((result) => {
              busy.current = false;
              if (!result.ok) {
                setState({ ...IDLE, error: result.error });
                return;
              }
              setState({
                phase: "done",
                error: null,
                activeStudentId: studentId,
                granted: {
                  studentId,
                  plan: result.plan,
                  entitledUntil: result.entitledUntil,
                },
              });
              router.refresh();
            })
            .catch(() => {
              busy.current = false;
              // The `order.paid` webhook settles the same order independently,
              // so a failure here is a delay and not a lost payment.
              setState({
                ...IDLE,
                error: "The payment went through and we're still confirming it. Refresh in a minute.",
              });
            });
        },

        // Closing the modal without paying is not an error. The unpaid order
        // stays `created` at Razorpay and on our side, and the student is still
        // there to be paid for later.
        modal: {
          ondismiss: () => {
            busy.current = false;
            setState((s) => (s.phase === "confirming" ? s : IDLE));
          },
        },
      });

      checkout.on("payment.failed", () => {
        busy.current = false;
        setState({
          ...IDLE,
          error: "That payment didn't go through. No money has been taken — please try again.",
        });
      });

      checkout.open();
    },
    [router],
  );

  const dismiss = useCallback(() => setState(IDLE), []);

  return { ...state, open, dismiss };
}
