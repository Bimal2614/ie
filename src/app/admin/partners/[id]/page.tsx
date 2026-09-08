import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PartnerControls } from "@/components/admin/partner-controls";
import { cardClass, StatTile } from "@/components/dashboard/ui";
import { ListControls, Pager } from "@/components/ui/list-controls";
import { couponOptions } from "@/lib/admin";
import { requireAdmin } from "@/lib/dal";
import { parsePageRequest } from "@/lib/pagination";
import { partnerForAdmin, STUDENT_LIST_DEFAULTS } from "@/lib/partners";
import { formatPrice, PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

const date = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function AdminPartnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const { id } = await params;
  const req = parsePageRequest(await searchParams, STUDENT_LIST_DEFAULTS);
  const [data, allCoupons] = await Promise.all([partnerForAdmin(id, req), couponOptions()]);
  if (!data) notFound();

  const { partner, logins, students, overview, payments } = data;
  const basePath = `/admin/partners/${partner.id}`;
  const collected = payments
    .filter((p) => p.status === "paid")
    .reduce<Record<string, number>>((acc, p) => {
      acc[p.currency] = (acc[p.currency] ?? 0) + p.amountCents;
      return acc;
    }, {});

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/partners"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Partners
        </Link>
        <h1 className="display mt-2 flex flex-wrap items-center gap-2 text-2xl text-ink">
          {partner.name}
          {partner.status === "suspended" && (
            <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
              Suspended
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {partner.location ? `${partner.location} · ` : ""}
          {logins.map((l) => l.email).join(", ") || "no login"} · onboarded {date(partner.createdAt)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Students" value={overview.students} sub={`${overview.neverSignedIn} never signed in`} icon={null} />
        <StatTile label="On a plan" value={overview.paid} sub={`${overview.expiringSoon} lapsing soon`} icon={null} />
        <StatTile label="Awaiting payment" value={overview.awaitingPayment} sub="Enrolled, not paid for" icon={null} />
        <StatTile
          label="Collected"
          value={
            Object.entries(collected)
              .map(([c, cents]) => formatPrice(cents, c))
              .join(" + ") || "—"
          }
          sub="Recent payments"
          icon={null}
        />
      </div>

      <section className={cn(cardClass, "p-5")}>
        <PartnerControls
          partnerId={partner.id}
          status={partner.status}
          details={{ name: partner.name, location: partner.location, website: partner.website }}
          logins={logins.map((l) => ({ id: l.id, name: l.name, email: l.email }))}
          couponId={partner.couponId}
          coupons={allCoupons.map((c) => ({
            id: c.id,
            code: c.code,
            percent: c.percent,
            status: c.status,
          }))}
        />
      </section>

      <section className={cn(cardClass, "overflow-hidden")}>
        <h2 className="border-b border-line p-4 font-semibold text-ink">Students</h2>
        <ListControls
          basePath={basePath}
          req={req}
          filters={[
            { key: "all", label: "All" },
            { key: "unpaid", label: "Awaiting payment" },
            { key: "active", label: "On a plan" },
            { key: "never", label: "Never signed in" },
          ]}
          sorts={[
            { key: "joined", label: "Enrolled" },
            { key: "name", label: "Name" },
            { key: "lastSeen", label: "Last sign-in" },
            { key: "expires", label: "Plan ends" },
          ]}
          placeholder="Search this class"
        />
        {students.rows.length === 0 ? (
          <p className="p-4 text-sm text-ink-muted">No students match that.</p>
        ) : (
          <ul className="divide-y divide-line">
            {students.rows.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{s.name}</span>
                  <span className="block truncate text-xs text-ink-muted">{s.email}</span>
                </span>
                <span className="text-xs text-ink-muted">
                  {s.plan === "free"
                    ? "Free"
                    : `${PLANS[s.plan].label}${s.planExpiresAt ? ` to ${date(s.planExpiresAt)}` : ""}`}
                </span>
                <span className="w-24 text-right text-xs tabular-nums text-ink-muted">
                  {s.attempts} attempts
                </span>
              </li>
            ))}
          </ul>
        )}
        <Pager basePath={basePath} req={req} page={students} noun="student" />
      </section>

      <section className={cn(cardClass, "overflow-hidden")}>
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="font-semibold text-ink">Recent payments</h2>
          <Link href="/admin/payments" className="text-sm font-medium text-brand hover:underline">
            All payments
          </Link>
        </div>
        {payments.length === 0 ? (
          <p className="p-4 text-sm text-ink-muted">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 text-sm">
                <span className="min-w-0 flex-1 truncate text-ink">
                  {p.studentName ?? "Deleted student"}
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
                <span className="w-28 text-right text-xs text-ink-muted">
                  {date(p.paidAt ?? p.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
