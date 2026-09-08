import Link from "next/link";
import { Building2, ExternalLink } from "lucide-react";

import { CreatePartnerForm } from "@/components/admin/create-partner-form";
import { cardClass } from "@/components/dashboard/ui";
import { ListControls, Pager } from "@/components/ui/list-controls";
import { requireAdmin } from "@/lib/dal";
import { parsePageRequest } from "@/lib/pagination";
import { listPartnersForAdmin, PARTNER_LIST_DEFAULTS } from "@/lib/partners";
import { formatPrice } from "@/lib/plans";
import { cn } from "@/lib/utils";

const date = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Money is summed per currency, so it is rendered per currency too. */
function revenueLabel(revenue: Record<string, number>): string {
  const parts = Object.entries(revenue).map(([currency, cents]) => formatPrice(cents, currency));
  return parts.length ? parts.join(" + ") : "—";
}

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const req = parsePageRequest(await searchParams, PARTNER_LIST_DEFAULTS);
  const page = await listPartnersForAdmin(req);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-2xl text-ink">Partners</h1>
          <p className="mt-1 text-sm text-ink-muted">
            IELTS classes that enrol and pay for their own students.
          </p>
        </div>
        <CreatePartnerForm />
      </div>

      <section className={cn(cardClass, "overflow-hidden")}>
        <ListControls
          basePath="/admin/partners"
          req={req}
          filters={[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "suspended", label: "Suspended" },
          ]}
          sorts={[
            { key: "onboarded", label: "Onboarded" },
            { key: "name", label: "Name" },
          ]}
          placeholder="Search classes"
        />

        {page.rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Building2 className="size-5" />
            </span>
            <p className="text-sm text-ink-muted">
              {req.q || req.filter !== "all"
                ? "No classes match that."
                : "No partners yet. Onboard a class and hand over its login."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {page.rows.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/partners/${p.id}`} className="font-medium text-ink hover:underline">
                      {p.name}
                    </Link>
                    {p.status === "suspended" && (
                      <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
                        Suspended
                      </span>
                    )}
                    {p.rate && (
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
                        {p.rate.percent}% · {p.rate.code}
                      </span>
                    )}
                    {p.website && (
                      <a
                        href={p.website}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
                      >
                        <ExternalLink className="size-3" /> site
                      </a>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {p.location ? `${p.location} · ` : ""}
                    {p.login ? p.login.email : "no login"} · onboarded {date(p.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-6 text-xs text-ink-muted">
                  <span className="tabular-nums">
                    <span className="block text-sm font-semibold text-ink">{p.students}</span>
                    students
                  </span>
                  <span className="tabular-nums">
                    <span className="block text-sm font-semibold text-ink">{p.paidStudents}</span>
                    on a plan
                  </span>
                  <span className="tabular-nums sm:w-32 sm:text-right">
                    <span className="block text-sm font-semibold text-ink">{revenueLabel(p.revenue)}</span>
                    collected
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Pager basePath="/admin/partners" req={req} page={page} noun="partner" />
      </section>
    </div>
  );
}
