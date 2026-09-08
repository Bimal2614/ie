import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { StudentActions } from "@/components/partner/student-actions";
import { BandCell, cardClass } from "@/components/dashboard/ui";
import { QUESTION_TYPES, SECTIONS } from "@/lib/ielts";
import { quotesFor } from "@/lib/partner-pricing";
import { partnerContext, partnerStudentDetail } from "@/lib/partners";
import { DEFAULT_CURRENCY, formatPrice, PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format-date";

/**
 * One student's record, as their class sees it.
 *
 * THE 404 IS THE ACCESS CHECK. `partnerStudentDetail` returns null for a
 * student who is not this partner's, so a guessed uuid is indistinguishable
 * from one that does not exist.
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

export default async function PartnerStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { partner, rate } = await partnerContext();
  const detail = await partnerStudentDetail(partner.id, id);
  if (!detail) notFound();

  const { student, sections, attempts, mocks, payments } = detail;
  const paid = student.plan !== "free";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/partner"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Students
        </Link>
        <h1 className="display mt-2 text-2xl text-ink">{student.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {student.email}
          {student.phone ? ` · ${student.phone}` : ""}
        </p>
      </div>

      <section className={cn(cardClass, "grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4")}>
        <Meta
          label="Plan"
          value={
            paid
              ? `${PLANS[student.plan].label}${student.planExpiresAt ? ` · to ${date(student.planExpiresAt)}` : " · no expiry"}`
              : "Free — awaiting payment"
          }
        />
        <Meta label="Module" value={student.targetModule === "academic" ? "Academic" : "General Training"} />
        <Meta label="Enrolled" value={date(student.joinedAt)} />
        <Meta
          label="Last signed in"
          value={student.lastLoginAt ? date(student.lastLoginAt) : "Never"}
        />
      </section>

      <section className={cn(cardClass, "p-5")}>
        <StudentActions
          studentId={student.id}
          quotes={quotesFor(DEFAULT_CURRENCY, rate)}
          onPaidPlan={paid}
          canAct={partner.status === "active"}
        />
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
                    {a.avgBand !== null
                      ? a.avgBand.toFixed(1)
                      : `${a.correct}/${a.answers}`}
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
        <h2 className="mb-3 font-semibold text-ink">Payments</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nothing has been paid for this student yet.
          </p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <span className="font-medium text-ink">{PLANS[p.plan].label}</span>
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
                <span className="ml-auto text-xs text-ink-muted">
                  {dateTime(p.paidAt ?? p.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
