import { Download } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The download trigger for a paid seat's receipt.
 *
 * A PLAIN ANCHOR, not a button with a fetch behind it. The route at
 * /api/partner/receipts/[paymentId] answers with the PDF and a
 * `Content-Disposition: attachment`, so the browser saves it — which means this
 * keeps working with the keyboard, with middle-click, and with "Save link as",
 * and shows a real URL on hover. Nothing to load, nothing to spin.
 *
 * ONLY EVER RENDERED FOR A SETTLED PAYMENT. The route refuses anything else,
 * but offering a link that 404s is its own kind of wrong: a class that sees
 * "Receipt" next to an abandoned checkout has been told it paid.
 *
 * Deliberately NOT disabled while the partner is suspended. Suspension makes
 * the panel read-only; proof of money already taken is not a write.
 */
export function ReceiptLink({
  paymentId,
  label,
  studentName,
  className,
}: {
  paymentId: string;
  /** Visible text. Omit for the roster's compact, icon-only trigger. */
  label?: string;
  /** Names the student in the accessible label, since the icon alone cannot. */
  studentName?: string;
  className?: string;
}) {
  return (
    <a
      href={`/api/partner/receipts/${paymentId}`}
      download
      title={studentName ? `Download the receipt for ${studentName}` : "Download receipt"}
      aria-label={studentName ? `Download the receipt for ${studentName}` : "Download receipt"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-line text-sm font-semibold text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink",
        label ? "h-8 px-2.5 text-xs" : "size-9 justify-center",
        className,
      )}
    >
      <Download className="size-3.5 shrink-0" />
      {label}
    </a>
  );
}
