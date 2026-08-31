"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Check, Copy, ShieldCheck, Smartphone, X } from "lucide-react";
import {
  billingPeriodLabel,
  formatPrice,
  PLANS,
  type PlanKey,
} from "@/lib/plans";
import { useAuth } from "@/components/auth/auth-provider";

/** The account the QR pays into. Kept beside the image it belongs to. */
const UPI_ID = "9033558972@ybl";
const PAYEE = "IELTSVega";
const QR_SRC = "/upi_1788085858597.png";

/**
 * How a visitor actually pays for a plan today.
 *
 * There is no card gateway yet, so the purchase button opens this instead of
 * navigating: a UPI QR, the VPA in copyable text, and the one thing that makes
 * a manual transfer matchable — the instruction to put their email in the
 * payment note. Nothing is charged or recorded here; a human reconciles the
 * payment and moves the account onto the tier.
 *
 * Rendered through a PORTAL, not in place. Every pricing card sits inside a
 * `<Reveal>`, which is a `motion.div` carrying a transform — and a transform on
 * an ancestor makes `position: fixed` resolve against that ancestor instead of
 * the viewport, which would pin this dialog inside one card. document.body is
 * the only parent guaranteed to be untransformed.
 */
export function UpiPayDialog({
  plan,
  onClose,
}: {
  plan: PlanKey;
  onClose: () => void;
}) {
  const { authenticated } = useAuth();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Nothing exists to focus or to cover until the portal is on the page.
    if (!mounted) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // The page behind must not scroll under the sheet on touch.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, mounted]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard is permission-gated and can simply say no. The ID is on
      // screen either way, so a failure needs no alarm — it just doesn't tick.
    }
  };

  const entitlements = PLANS[plan];
  const price = formatPrice(entitlements.priceCents);

  if (!mounted) return null;

  return createPortal(
    <div
      className="animate-in fade-in fixed inset-0 z-[80] flex items-center justify-center bg-ink-strong/50 p-4 backdrop-blur-sm duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* The card caps itself at the viewport and scrolls its MIDDLE, so the two
          controls that get someone out of here — the X and Close — stay pinned
          and reachable on a laptop's short window, where centring a
          taller-than-viewport dialog would otherwise clip the top off. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upi-pay-title"
        className="animate-in zoom-in-95 slide-in-from-bottom-2 flex max-h-[calc(100svh-2rem)] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-line bg-paper-elev shadow-[var(--shadow-pop)] duration-200"
      >
        {/* Header — the plan and the price, so the amount is never guessed at
            from a half-remembered card behind the dialog.
            Tinted with `brand`, not the card's green: `--brand-soft` is one of
            the tokens `.dark` redefines, so the wash and the label on it invert
            with the theme. `--green-soft` is not — it stays a pale mint on a
            near-black dialog, which is why the green here is only ever ink
            (the shield below), never a fill. */}
        <div className="relative shrink-0 bg-gradient-to-br from-brand-soft to-paper-elev px-6 pb-4 pt-5">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-paper-elev hover:text-ink"
          >
            <X className="size-4" />
          </button>

          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-brand">
            {entitlements.label}
          </p>
          <h2
            id="upi-pay-title"
            className="font-serif mt-1 text-2xl tracking-tight text-ink"
          >
            Scan to pay
          </h2>
          <p className="mt-1 flex items-baseline gap-1.5 text-sm">
            <span className="text-lg font-semibold text-ink">{price}</span> + GST
            <span className="text-ink-muted">/ {billingPeriodLabel(plan)}</span>
          </p>
        </div>

        {/* The QR.
            The source PNG is a 593x783 payment card: an "IELTSVEGA" header band
            (rows 33-54) and a "create your own QR code" watermark (rows
            720-736) top and tail it. Neither belongs in a dialog that has
            already said who we are and what this costs, so the frame shows rows
            104-702 only — the code itself (130-408), the VPA (456-475) and the
            BHIM / GPay / PhonePe / Paytm strip (528-673).
            `object-cover` on a 593:598 box scales the image to the full width,
            so the crop is purely vertical, and `object-position` chooses which
            598 rows survive: 104 / (783 - 598) = 56.2%.
            The panel is hard white in BOTH themes on purpose — a dark surface
            behind a QR is the classic way to make one unscannable. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-1">
          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[var(--shadow-sm)]">
            <div className="aspect-[593/598] w-full">
              <Image
                src={QR_SRC}
                alt={`UPI QR code to pay ${PAYEE} at ${UPI_ID}`}
                width={593}
                height={783}
                className="h-full w-full object-cover [object-position:center_56.2%]"
              />
            </div>
          </div>

          {/* The VPA as real text, because a screen cannot scan itself: on the
              phone that would be paying, copying beats scanning. */}
          <button
            type="button"
            onClick={copy}
            className="group mt-3 flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-paper-sunken/60 px-3 py-2.5 text-left transition-colors hover:border-brand/40"
          >
            <span className="min-w-0">
              <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                UPI ID
              </span>
              <span className="block truncate font-mono text-sm text-ink">
                {UPI_ID}
              </span>
            </span>
            <span
              className={
                copied
                  ? "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-green/50 px-2.5 py-1.5 text-xs font-semibold text-green"
                  : "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors group-hover:border-brand/50 group-hover:text-brand"
              }
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </span>
          </button>

          {/* On a phone the QR is useless — this hands the payment straight to
              GPay / PhonePe / Paytm. Desktop browsers have nothing to open, so
              the link is not offered there. */}
          <a
            href={`upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE)}&cu=INR`}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-brand/50 hover:text-ink sm:hidden"
          >
            <Smartphone className="size-4" /> Open in a UPI app
          </a>

          {/* What happens after they pay. Spelled out because a manual transfer
              with no receipt page is exactly where someone starts to worry. */}
          <ol className="-mx-6 mt-4 space-y-2.5 border-t border-line px-6 py-4 text-xs leading-relaxed text-ink-soft">
            {[
              "Scan the code with any UPI app and pay the amount above.",
              authenticated
                ? "Put the email on your account in the payment note."
                : "Put the email you'll sign up with in the payment note.",
              "We confirm the transfer and switch your plan over, usually within a few hours.",
            ].map((step, i) => (
              <li key={step} className="flex gap-2.5">
                <span className="mt-px grid size-4 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.6rem] font-bold text-brand">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-paper-sunken/40 px-6 py-3">
          <span className="flex items-center gap-1.5 text-[0.7rem] text-ink-muted">
            <ShieldCheck className="size-3.5 text-green" /> Paid directly to{" "}
            {PAYEE}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-3.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand/50 hover:text-ink"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
