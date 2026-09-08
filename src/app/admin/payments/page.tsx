import Link from "next/link";

import { cardClass } from "@/components/dashboard/ui";
import { ListControls, Pager } from "@/components/ui/list-controls";
import { adminPayments, PAYMENT_DEFAULTS } from "@/lib/admin";
import { requireAdmin } from "@/lib/dal";
import { parsePageRequest } from "@/lib/pagination";
import { formatPrice, PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

const dateTime = (d: Date) =>
  d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

/** Every seat a partner has paid for, or tried to. */
export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const req = parsePageRequest(await searchParams, PAYMENT_DEFAULTS);
  const page = await adminPayments(req);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-2xl text-ink">Payments</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Partner-bought seats. A candidate paying for themselves goes through the subscription
          checkout and appears in the billing ledger instead.
        </p>
      </div>

      <section className={cn(cardClass, "overflow-hidden")}>
        <ListControls
          basePath="/admin/payments"
          req={req}
          filters={[
            { key: "all", label: "All" },
            { key: "paid", label: "Paid" },
            { key: "created", label: "Not completed" },
            { key: "failed", label: "Failed" },
          ]}
          sorts={[{ key: "created", label: "Date" }]}
          placeholder="Search student, class or order id"
        />

        {page.rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-ink-muted">No payments match that.</p>
        ) : (
          <ul className="divide-y divide-line">
            {page.rows.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink">{p.studentName ?? "Deleted student"}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    <Link href={`/admin/partners/${p.partnerId}`} className="hover:underline">
                      {p.partnerName ?? "Unknown class"}
                    </Link>{" "}
                    · {p.razorpayOrderId}
                  </span>
                </span>
                <span className="text-xs text-ink-muted">{PLANS[p.plan].label}</span>
                <span className="tabular-nums text-ink">{formatPrice(p.amountCents, p.currency)}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    p.status === "paid" && "bg-green-soft text-green-ink",
                    p.status === "created" && "bg-warning-soft text-ink",
                    p.status === "failed" && "bg-danger-soft text-danger",
                  )}
                >
                  {p.status === "paid" ? "Paid" : p.status === "created" ? "Not completed" : "Failed"}
                </span>
                <span className="w-40 text-right text-xs text-ink-muted">
                  {dateTime(p.paidAt ?? p.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <Pager basePath="/admin/payments" req={req} page={page} noun="payment" />
      </section>
    </div>
  );
}
