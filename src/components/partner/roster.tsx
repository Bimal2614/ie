"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react";

import { useStudentCheckout } from "@/components/partner/use-student-checkout";
import { cardClass } from "@/components/dashboard/ui";
import { ListControls, Pager } from "@/components/ui/list-controls";
import type { Page } from "@/lib/pagination";
import { PlanPicker } from "@/components/partner/plan-picker";
import type { Quote } from "@/lib/partner-pricing";
import type { StudentFilter, StudentPageRequest, StudentSort } from "@/lib/partners";
import { DEFAULT_CURRENCY, DEFAULT_OFFERED_PLAN, PLANS, type PlanKey } from "@/lib/plans";
import { cn } from "@/lib/utils";

/**
 * The class's roster — every student, what they are on, and what they have done.
 *
 * PRESENTATIONAL. Searching, filtering, sorting and paging all happen in the
 * query behind this; the controls only rewrite the URL. Dates arrive
 * pre-formatted from the server, because a `toLocaleDateString` reading the
 * viewer's timezone renders one string on the server and another here — a
 * hydration error.
 *
 * The currency is INR: the panel exists for Indian classes, and a price should
 * not change with the network someone is browsing from. The server re-reads it
 * regardless — the tier is all the browser is trusted to name.
 */

export type RosterStudent = {
  id: string;
  name: string;
  email: string;
  plan: PlanKey;
  expiresLabel: string | null;
  lastActiveLabel: string | null;
  everSignedIn: boolean;
  attempts: number;
  avgBand: number | null;
  mocks: number;
  /** The last payment started for them, so an abandoned checkout is visible. */
  paymentStatus: "created" | "paid" | "failed" | null;
};

const FILTERS: ReadonlyArray<{ key: StudentFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "unpaid", label: "Awaiting payment" },
  { key: "active", label: "On a plan" },
  { key: "never", label: "Never signed in" },
];

const SORTS: ReadonlyArray<{ key: StudentSort; label: string }> = [
  { key: "joined", label: "Enrolled" },
  { key: "name", label: "Name" },
  { key: "lastSeen", label: "Last sign-in" },
  { key: "expires", label: "Plan ends" },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function Chip({ tone, children }: { tone: "green" | "warn" | "muted"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "green" && "bg-green-soft text-green-ink",
        tone === "warn" && "bg-warning-soft text-ink",
        tone === "muted" && "bg-paper-sunken text-ink-soft",
      )}
    >
      {children}
    </span>
  );
}

export function Roster({
  page,
  req,
  quotes,
  canPay,
  basePath = "/partner",
}: {
  page: Page<RosterStudent>;
  req: StudentPageRequest;
  /** Priced for this class on the server — see `PlanPicker`. */
  quotes: Quote[];
  canPay: boolean;
  basePath?: string;
}) {
  const checkout = useStudentCheckout();
  const searching = Boolean(req.q) || req.filter !== "all";

  return (
    <section className={cn(cardClass, "overflow-hidden")}>
      <ListControls
        basePath={basePath}
        req={req}
        filters={FILTERS}
        sorts={SORTS}
        placeholder="Search by name or email"
      />

      {checkout.error && (
        <p className="flex items-start gap-2 border-b border-line bg-danger-soft px-4 py-2.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {checkout.error}
        </p>
      )}
      {checkout.granted && (
        <p className="flex items-start gap-2 border-b border-line bg-green-soft px-4 py-2.5 text-sm text-green-ink">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          Paid. That student is on {checkout.granted.plan} now.
        </p>
      )}

      {page.rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand">
            <UserPlus className="size-5" />
          </span>
          <p className="text-sm text-ink-muted">
            {searching
              ? "No students match that."
              : "No students yet. Enrol your first one and pay for their plan."}
          </p>
          {!searching && (
            <Link
              href="/partner/students/new"
              className="rounded-lg border border-line bg-paper-elev px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken"
            >
              Enrol a student
            </Link>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {page.rows.map((s) => (
            <StudentRow key={s.id} student={s} quotes={quotes} canPay={canPay} checkout={checkout} />
          ))}
        </ul>
      )}

      <Pager basePath={basePath} req={req} page={page} noun="student" />
    </section>
  );
}

function StudentRow({
  student,
  quotes,
  canPay,
  checkout,
}: {
  student: RosterStudent;
  quotes: Quote[];
  canPay: boolean;
  checkout: ReturnType<typeof useStudentCheckout>;
}) {
  const [plan, setPlan] = useState<Exclude<PlanKey, "free">>(DEFAULT_OFFERED_PLAN);
  const busy =
    checkout.activeStudentId === student.id &&
    (checkout.phase === "opening" || checkout.phase === "confirming");
  const paid = student.plan !== "free";

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <Link href={`/partner/students/${student.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-paper-sunken text-xs font-semibold text-ink-soft"
        >
          {initials(student.name)}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-ink">{student.name}</span>
            {paid ? (
              <Chip tone="green">
                {PLANS[student.plan].label}
                {student.expiresLabel ? ` · to ${student.expiresLabel}` : ""}
              </Chip>
            ) : (
              <Chip tone="warn">Awaiting payment</Chip>
            )}
            {!student.everSignedIn && <Chip tone="muted">Never signed in</Chip>}
            {!paid && student.paymentStatus === "created" && <Chip tone="muted">Payment started</Chip>}
          </span>
          <span className="mt-0.5 block truncate text-xs text-ink-muted">{student.email}</span>
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-5 text-xs text-ink-muted sm:w-52">
        <span className="tabular-nums">
          <span className="block font-semibold text-sm text-ink">{student.attempts}</span>
          attempts
        </span>
        <span className="tabular-nums">
          <span className="block font-semibold text-sm text-ink">
            {student.avgBand === null ? "—" : student.avgBand.toFixed(1)}
          </span>
          avg band
        </span>
        <span className="tabular-nums">
          <span className="block font-semibold text-sm text-ink">{student.mocks}</span>
          mocks
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canPay ? (
          <>
            <PlanPicker
              quotes={quotes}
              value={plan}
              onChange={(p) => setPlan(p as Exclude<PlanKey, "free">)}
              disabled={busy}
              ariaLabel={`Plan for ${student.name}`}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => checkout.open(student.id, plan, DEFAULT_CURRENCY)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              {paid ? "Extend" : "Pay"}
            </button>
          </>
        ) : (
          <span className="text-xs text-ink-muted">Payments paused</span>
        )}
      </div>
    </li>
  );
}
