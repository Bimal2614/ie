import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/dal";
import { partnerReceiptPdf } from "@/lib/payments/receipt";
import { guardGeneral, RateLimitError } from "@/lib/security/rate-guard";
import { isUuid } from "@/lib/uuid";

/**
 * `GET /api/partner/receipts/<partner_payments.id>` — the PDF receipt for one
 * seat this institution has paid for.
 *
 * A ROUTE AND NOT A SERVER ACTION, for the one reason routes exist here: the
 * response IS a file. An action would have to hand the bytes to the browser as
 * base64, which doubles them in a JSON payload and then asks client code to
 * rebuild a Blob and synthesise a click — for a link the platform already knows
 * how to render. `Content-Disposition: attachment` does the whole job, and the
 * trigger stays an `<a download>` that works with the keyboard and the
 * middle-click.
 *
 * THE SESSION IS THE ONLY SCOPE. `partnerId` comes off the signed-in user and
 * is passed to `partnerReceipt` as its filter — the URL names a payment, never
 * whose it is. A payment belonging to another institution and a payment that
 * does not exist both return the same 404, so the endpoint cannot be used to
 * enumerate anything.
 *
 * `no-store`, not `private`: this document names a student, an institution and
 * a payment reference, and there is nothing to gain from any cache holding it.
 */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const user = await getCurrentUser();
  // Not a redirect. This is fetched as a file, and bouncing it to /login would
  // download the login page's HTML under a .pdf name.
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (user.role !== "partner" || !user.partnerId) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    await guardGeneral(user.id);
  } catch (e) {
    if (e instanceof RateLimitError) {
      return new NextResponse("Too many requests: slow down.", { status: 429 });
    }
    throw e;
  }

  const { paymentId } = await params;
  if (!isUuid(paymentId)) return new NextResponse("Not found", { status: 404 });

  /*
   * Deliberately NOT gated on `partner.status`. Suspending an institution makes
   * it read-only — it stops new enrolments and new payments — and a receipt for
   * money already taken is the last thing that should disappear when a
   * commercial relationship ends.
   */
  const receipt = await partnerReceiptPdf(user.partnerId, paymentId);
  if (!receipt) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(receipt.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receipt.fileName}"`,
      "Content-Length": String(receipt.bytes.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
