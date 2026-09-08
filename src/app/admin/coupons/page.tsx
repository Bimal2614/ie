import { Ticket } from "lucide-react";

import { CouponToggle, CreateCouponForm } from "@/components/admin/coupon-controls";
import { cardClass } from "@/components/dashboard/ui";
import { ListControls, Pager } from "@/components/ui/list-controls";
import { COUPON_DEFAULTS, listCoupons } from "@/lib/admin";
import { requireAdmin } from "@/lib/dal";
import { parsePageRequest } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const date = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/**
 * Coupons are wholesale rates we hand to classes. Nobody types one: there is no
 * input for a code anywhere in the app, and the discount applies because a
 * student belongs to a partner holding the deal.
 */
export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const req = parsePageRequest(await searchParams, COUPON_DEFAULTS);
  const page = await listCoupons(req);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-2xl text-ink">Coupons</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Partner rates. A class on one is quoted the discounted price in its own panel; nobody
            enters a code anywhere.
          </p>
        </div>
        <CreateCouponForm />
      </div>

      <section className={cn(cardClass, "overflow-hidden")}>
        <ListControls
          basePath="/admin/coupons"
          req={req}
          filters={[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "inactive", label: "Inactive" },
          ]}
          sorts={[
            { key: "created", label: "Created" },
            { key: "code", label: "Code" },
          ]}
          placeholder="Search codes"
        />

        {page.rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Ticket className="size-5" />
            </span>
            <p className="text-sm text-ink-muted">
              {req.q || req.filter !== "all"
                ? "No coupons match that."
                : "No coupons yet. Create one, then apply it to a class from its page."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {page.rows.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{c.code}</span>
                    <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
                      {c.percent}% off
                    </span>
                    {!c.live && (
                      <span className="rounded-full bg-paper-sunken px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                        {c.status === "inactive" ? "Inactive" : "Ended"}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    {c.note ? `${c.note} · ` : ""}
                    {c.partners} class{c.partners === 1 ? "" : "es"} ·{" "}
                    {c.endsAt ? `ends ${date(c.endsAt)}` : "no end date"} · created {date(c.createdAt)}
                  </span>
                </span>
                <CouponToggle couponId={c.id} status={c.status} />
              </li>
            ))}
          </ul>
        )}

        <Pager basePath="/admin/coupons" req={req} page={page} noun="coupon" />
      </section>
    </div>
  );
}
