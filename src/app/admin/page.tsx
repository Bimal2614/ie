import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CreditCard,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import { cardClass, StatTile } from "@/components/dashboard/ui";
import { adminDashboard, type Money } from "@/lib/admin";
import { requireAdmin } from "@/lib/dal";
import { formatPrice } from "@/lib/plans";
import { cn } from "@/lib/utils";

/**
 * The admin home: money, partners, students, and what needs doing.
 *
 * Five aggregates, none of them touching `user_responses` — the big table. That
 * is why "signed in this week" is counted from `users.last_login_at` rather
 * than from practice activity: a cheaper question with almost the same answer,
 * on the screen that gets opened most often.
 */

function money(m: Money): string {
  const parts = Object.entries(m).map(([currency, cents]) => formatPrice(cents, currency));
  return parts.length ? parts.join(" + ") : "—";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-ink">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

export default async function AdminOverview() {
  await requireAdmin();
  const d = await adminDashboard();

  const needsAction =
    d.action.abandoned + d.action.failed + d.action.deactivated + d.action.lapsing7;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-2xl text-ink">Overview</h1>
        <p className="mt-1 text-sm text-ink-muted">Where the business is this month.</p>
      </div>

      <Section title="Money">
        <StatTile
          label="Revenue this month"
          value={money(d.money.thisMonth)}
          sub={`Last month ${money(d.money.lastMonth)}`}
          icon={<TrendingUp className="size-3.5" />}
        />
        <StatTile
          label="On a plan"
          value={d.money.onAPlan}
          sub="Accounts entitled right now"
          icon={<CreditCard className="size-3.5" />}
        />
        <StatTile
          label="Lapsing in 30 days"
          value={d.money.lapsing30}
          sub="Renewal or churn"
          icon={<TrendingUp className="size-3.5" />}
        />
        <StatTile
          label="Partner seats"
          value={d.partners.students}
          sub="Students enrolled by a class"
          icon={<Building2 className="size-3.5" />}
        />
      </Section>

      <Section title="Partners">
        <StatTile
          label="Classes"
          value={d.partners.total}
          sub={`${d.partners.active} active`}
          icon={<Building2 className="size-3.5" />}
        />
        <StatTile
          label="Suspended"
          value={d.partners.suspended}
          sub="Read-only, students unaffected"
          icon={<Building2 className="size-3.5" />}
        />
        <div className={cn(cardClass, "flex items-center p-5")}>
          <Link href="/admin/partners" className="text-sm font-semibold text-brand hover:underline">
            Manage partners →
          </Link>
        </div>
        <div className={cn(cardClass, "flex items-center p-5")}>
          <Link href="/admin/coupons" className="text-sm font-semibold text-brand hover:underline">
            Manage coupons →
          </Link>
        </div>
      </Section>

      <Section title="Students">
        <StatTile
          label="Total"
          value={d.students.total}
          sub="Candidate accounts"
          icon={<Users className="size-3.5" />}
        />
        <StatTile
          label="New today"
          value={d.students.newToday}
          sub={`${d.students.newThisWeek} this week`}
          icon={<UserPlus className="size-3.5" />}
        />
        <StatTile
          label="Signed in this week"
          value={d.students.signedInThisWeek}
          sub="Came back in the last 7 days"
          icon={<Users className="size-3.5" />}
        />
        <div className={cn(cardClass, "flex items-center p-5")}>
          <Link href="/admin/students" className="text-sm font-semibold text-brand hover:underline">
            All students →
          </Link>
        </div>
      </Section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          Needs attention
          {needsAction > 0 && (
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-ink">
              {needsAction}
            </span>
          )}
        </h2>
        {needsAction === 0 ? (
          <p className={cn(cardClass, "p-5 text-sm text-ink-muted")}>
            Nothing waiting. No abandoned checkouts, failed payments or disabled accounts.
          </p>
        ) : (
          <ul className={cn(cardClass, "divide-y divide-line")}>
            <ActionRow
              n={d.action.abandoned}
              label="checkouts started and not completed"
              href="/admin/payments?filter=created"
            />
            <ActionRow n={d.action.failed} label="payments failed" href="/admin/payments?filter=failed" />
            <ActionRow
              n={d.action.lapsing7}
              label="plans lapsing within a week"
              href="/admin/students?filter=paid&sort=expires&dir=asc"
            />
            <ActionRow
              n={d.action.deactivated}
              label="accounts disabled by rate limits"
              href="/admin/students"
            />
          </ul>
        )}
      </section>
    </div>
  );
}

function ActionRow({ n, label, href }: { n: number; label: string; href: string }) {
  if (n === 0) return null;
  return (
    <li className="flex items-center gap-3 p-4 text-sm">
      <AlertTriangle className="size-4 shrink-0 text-warning" />
      <span className="font-semibold tabular-nums text-ink">{n}</span>
      <span className="text-ink-soft">{label}</span>
      <Link href={href} className="ml-auto font-medium text-brand hover:underline">
        Open
      </Link>
    </li>
  );
}
