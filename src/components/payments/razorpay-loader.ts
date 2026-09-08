"use client";

/**
 * Razorpay Checkout, loaded once and shared by everyone who opens it.
 *
 * TWO CALLERS, TWO PRODUCTS. A candidate buying their own plan opens the modal
 * against a `subscription_id` (a mandate); a partner paying for a student opens
 * it against an `order_id` (a single charge). Everything else — the script, the
 * global, the brand colour — is identical, and this module exists so the global
 * `window.Razorpay` is DECLARED IN ONE PLACE. Two files declaring it with
 * different option types is a TypeScript error, and the workaround people reach
 * for is `any`, on the object that names the amount of money to collect.
 */

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export type RazorpayOptions = {
  key: string;
  /** A mandate to authorise. Mutually exclusive with `order_id`. */
  subscription_id?: string;
  /** A one-off charge. Requires `amount` and `currency` beside it. */
  order_id?: string;
  amount?: number;
  currency?: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: Record<string, string>) => void;
  modal: { ondismiss: () => void };
};

export type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (payload: unknown) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

/**
 * `--brand` from src/app/globals.css as the hex Razorpay's modal wants.
 *
 * Hard-coded rather than read from the custom property: Checkout renders in its
 * own iframe, which cannot see this document's variables, so the value has to
 * cross as a literal either way. Kept in step by hand with the light-theme
 * `--brand: 218 81% 32%`.
 */
export const BRAND_HEX = "#0f4094";

let loading: Promise<void> | null = null;

/**
 * Fetch the Checkout script on demand.
 *
 * NOT IN THE LAYOUT. It is ~100KB of third-party JavaScript that every visitor
 * would otherwise pay for so the few who press a pay button save a moment.
 *
 * Injected with `document.createElement` rather than a <script> tag because of
 * the CSP in src/proxy.ts: under `strict-dynamic` a plain tag with no nonce is
 * refused, while a script inserted by already-trusted code inherits that trust.
 */
export function loadCheckout(): Promise<void> {
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
