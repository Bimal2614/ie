import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { StudentControls } from "@/components/admin/student-controls";
import { BandCell, cardClass, StatTile } from "@/components/dashboard/ui";
import { adminStudentDetail } from "@/lib/admin";
import { requireAdmin } from "@/lib/dal";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { QUESTION_TYPES, SECTIONS } from "@/lib/ielts";
import { formatPrice, PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { isUuid } from "@/lib/uuid";

/**
 * One candidate's whole record, for the console.
 *
 * THE PARTNER PANEL'S STUDENT SCREEN, for everybody. A class already had this
 * view of the students it enrolled (/partner/students/<id>) while the console
 * had only a row in a list, so support could see that somebody was on a plan
 * but not whether they had ever practised. The practice half is the same code
 * — src/lib/student-progress.ts — so the two screens cannot drift.
 *
 * What is here and NOT in the partner's version is everything a class has no
 * business seeing: the money ledger, the subscription history behind the plan
 * badge, and the controls that grant or withdraw access.
 *
 * `requireAdmin()` in the layout is the gate; this page repeats it because a
 * page that depends on a parent layout for its access check is one refactor
 * away from being public.
 */

const date = (d: unknown) => formatDate(d) ?? "—";
const dateTime = (d: unknown) => formatDateTime(d) ?? "—";

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{value}</p>
    </div>
  );
}

const STATUS_CLASS: Record<string, string> = {
  paid: "bg-green-soft text-green-ink",
  created: "bg-warning-soft text-ink",
  failed: "bg-danger-soft text-danger",
};

const SUB_STATUS_CLASS: Record<string, string> = {
  active: "bg-green-soft text-green-ink",
  cancelling: "bg-warning-soft text-ink",
  past_due: "bg-warning-soft text-ink",
  expired: "bg-paper-sunken text-ink-soft",
  cancelled: "bg-paper-sunken text-ink-soft",
};

export default async function AdminStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound(); // see src/lib/uuid.ts
  const detail = await adminStudentDetail(id);
  if (!detail) notFound();

  const { student, totals, progress, subscriptions, ledger, revenue, partnerOrders } = detail;
  const { sections, attempts, mocks } = progress;
  const paid = student.plan !== "free";
  /* Straight from the ledger, never summed off the rows below — those are
     capped at fifty. Currencies are kept apart: an INR total added to a USD
     total is a number that means nothing. */
  const collected =
    Object.entries(revenue)
      .map(([c, cents]) => formatPrice(cents, c))
      .join(" + ") || "—";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Students
        </Link>
        <h1 className="display mt-2 flex flex-wrap items-center gap-2 text-2xl text-ink">
          {student.name}
          {student.deactivatedAt && (
            <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
              Disabled
            </span>
          )}
          {!student.emailVerified && (
            <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-ink">
              Email unverified
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {student.email}
          {student.phone ? ` · ${student.phone}` : ""}
          {student.country ? ` · ${student.country}` : ""}
          {student.partnerName && (
            <>
              {" · "}
              <Link
                href={`/admin/partners/${student.partnerId}`}
                className="font-medium text-brand hover:underline"
              >
                {student.partnerName}
              </Link>
            </>
          )}
        </p>
        {student.deactivatedAt && (
          <p className="mt-1 text-xs text-danger">
            Disabled {date(student.deactivatedAt)}
            {student.deactivationReason ? ` — ${student.deactivationReason}` : ""}
          </p>
        )}
      </div>

      <section className={cn(cardClass, "grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4")}>
        <Meta
          label="Plan"
          value={
            paid
              ? `${PLANS[student.plan].label}${student.planExpiresAt ? ` · to ${date(student.planExpiresAt)}` : " · no expiry"}`
              : student.storedPlan === "free"
                ? "Free"
                : /* The column still says what it was; the window has closed and
                     the nightly sweep has not caught up. Every gate already
                     reads this as free — say so rather than showing the tier. */
                  `Free — ${PLANS[student.storedPlan].label} lapsed ${date(student.planExpiresAt)}`
          }
        />
        <Meta
          label="Target"
          value={`${student.targetModule === "academic" ? "Academic" : "General Training"}${student.targetBand ? ` · band ${student.targetBand}` : ""}`}
        />
        <Meta
          label="Joined"
          value={`${date(student.createdAt)}${student.examDate ? ` · exam ${date(student.examDate)}` : ""}`}
        />
        <Meta
          label="Last signed in"
          value={student.lastLoginAt ? dateTime(student.lastLoginAt) : "Never"}
        />
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Practice"
          value={totals.attempts}
          sub={`${totals.answers} answers submitted`}
          icon={null}
        />
        <StatTile
          label="Average band"
          value={totals.avgBand === null ? "—" : totals.avgBand.toFixed(1)}
          sub="Across everything graded"
          icon={null}
        />
        <StatTile
          label="Mock tests"
          value={totals.mocks}
          sub={totals.bestMockBand === null ? "None sat" : `best ${totals.bestMockBand.toFixed(1)}`}
          icon={null}
        />
        <StatTile
          label="Collected"
          /* Straight through to the rows behind it, the same link the partner
             screen offers — the ledger is site-wide by default. */
          value={
            <Link
              href={`/admin/transactions?q=${encodeURIComponent(student.email)}`}
              className="hover:underline"
            >
              {collected}
            </Link>
          }
          sub="All money received"
          icon={null}
        />
      </div>

      <section className={cn(cardClass, "p-5")}>
        <h2 className="mb-3 font-semibold text-ink">Access</h2>
        <StudentControls
          studentId={student.id}
          name={student.name}
          plan={student.plan}
          disabled={Boolean(student.deactivatedAt)}
        />
        <p className="mt-3 text-xs text-ink-muted">
          A grant here is the manual path — a payment made off-platform, a support credit, a class we
          invoiced directly. It records no money in the ledger.
        </p>
      </section>

      <section className={cn(cardClass, "p-5")}>
        <h2 className="mb-3 font-semibold text-ink">Progress by section</h2>
        {sections.length === 0 ? (
          <p className="text-sm text-ink-muted">Nothing practised yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sections.map((s) => (
              <div key={s.section} className="rounded-xl bg-paper-sunken p-4">
                <p className="text-sm font-semibold text-ink">{SECTIONS[s.section].label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">
                  {s.avgBand === null
                    ? s.graded === 0
                      ? "—"
                      : `${Math.round((s.correct / Math.max(s.graded, 1)) * 100)}%`
                    : s.avgBand.toFixed(1)}
                </p>
                <p className="text-xs text-ink-muted">
                  {s.avgBand === null ? "accuracy" : "average band"}
                </p>
                <p className="mt-2 text-xs text-ink-muted tabular-nums">
                  {s.attempts} attempt{s.attempts === 1 ? "" : "s"} · {s.answers} answers
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cn(cardClass, "p-5")}>
          <h2 className="mb-3 font-semibold text-ink">Recent practice</h2>
          {attempts.length === 0 ? (
            <p className="text-sm text-ink-muted">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {attempts.map((a) => (
                <li key={a.attemptId} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">
                      {QUESTION_TYPES[a.questionType as keyof typeof QUESTION_TYPES]?.label ??
                        a.questionType}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {SECTIONS[a.section as keyof typeof SECTIONS]?.label ?? a.section} ·{" "}
                      {dateTime(a.at)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                    {a.avgBand !== null ? a.avgBand.toFixed(1) : `${a.correct}/${a.answers}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={cn(cardClass, "p-5")}>
          <h2 className="mb-3 font-semibold text-ink">Mock tests</h2>
          {mocks.length === 0 ? (
            <p className="text-sm text-ink-muted">No full mock sittings yet.</p>
          ) : (
            <ul className="space-y-3">
              {mocks.map((m) => (
                <li key={m.id} className="rounded-xl bg-paper-sunken p-3">
                  <p className="mb-2 text-xs text-ink-muted">
                    {m.module === "academic" ? "Academic" : "General Training"} · {dateTime(m.at)}
                  </p>
                  <div className="grid grid-cols-5 gap-1.5 text-center">
                    <BandCell label="L" value={m.listeningBand} />
                    <BandCell label="R" value={m.readingBand} />
                    <BandCell label="W" value={m.writingBand} />
                    <BandCell label="S" value={m.speakingBand} />
                    <BandCell label="Overall" value={m.overallBand} highlight />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className={cn(cardClass, "p-5")}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Money received</h2>
          <Link
            href={`/admin/transactions?q=${encodeURIComponent(student.email)}`}
            className="text-sm font-medium text-brand hover:underline"
          >
            In the ledger
          </Link>
        </div>
        {ledger.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nothing has been charged for this account.
            {paid ? " The plan it is on was granted, not bought." : ""}
          </p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {ledger.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <span className="font-medium tabular-nums text-ink">
                  {formatPrice(t.amountCents, t.currency)}
                </span>
                <span className="rounded-full bg-paper-sunken px-2 py-0.5 text-[11px] font-semibold capitalize text-ink-soft">
                  {t.provider}
                </span>
                {t.partnerName && (
                  <Link
                    href={`/admin/partners/${t.partnerId}`}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    {t.partnerName}
                  </Link>
                )}
                {t.providerPaymentId && (
                  <span className="truncate font-mono text-xs text-ink-muted">
                    {t.providerPaymentId}
                  </span>
                )}
                {t.note && <span className="truncate text-xs text-ink-muted">{t.note}</span>}
                <span className="ml-auto text-xs text-ink-muted">{dateTime(t.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cn(cardClass, "p-5")}>
        <h2 className="mb-3 font-semibold text-ink">Subscriptions</h2>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-ink-muted">This account has never been on a plan.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {subscriptions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <span className="font-medium text-ink">{PLANS[s.plan as keyof typeof PLANS].label}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    SUB_STATUS_CLASS[s.status] ?? "bg-paper-sunken text-ink-soft",
                  )}
                >
                  {s.status}
                </span>
                <span className="text-xs text-ink-muted">
                  {date(s.currentPeriodStart)} → {s.currentPeriodEnd ? date(s.currentPeriodEnd) : "no expiry"}
                </span>
                {s.priceCents !== null && (
                  <span className="tabular-nums text-xs text-ink-muted">
                    {formatPrice(s.priceCents, s.currency)}
                  </span>
                )}
                <span className="text-xs capitalize text-ink-muted">{s.provider}</span>
                <span className="ml-auto text-xs text-ink-muted">
                  {s.cancelAtPeriodEnd ? "Cancels at period end" : date(s.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Only for a seat a class bought. These are ORDERS, not money — an
          abandoned checkout leaves a `created` row here and nothing above. */}
      {partnerOrders.length > 0 && (
        <section className={cn(cardClass, "p-5")}>
          <h2 className="mb-3 font-semibold text-ink">Partner orders</h2>
          <ul className="divide-y divide-line text-sm">
            {partnerOrders.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <Link
                  href={`/admin/partners/${p.partnerId}`}
                  className="font-medium text-brand hover:underline"
                >
                  {p.partnerName ?? "Deleted partner"}
                </Link>
                <span className="text-xs text-ink-muted">{PLANS[p.plan].label}</span>
                <span className="tabular-nums text-ink">
                  {formatPrice(p.amountCents, p.currency)}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    STATUS_CLASS[p.status],
                  )}
                >
                  {p.status === "paid" ? "Paid" : p.status === "created" ? "Not completed" : "Failed"}
                </span>
                <span className="ml-auto text-xs text-ink-muted">
                  {dateTime(p.paidAt ?? p.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
