"use client";

import { useState, useTransition } from "react";
import { Ban, BadgeCheck, Loader2, ShieldCheck, Undo2 } from "lucide-react";

import {
  deactivateAccount,
  reactivateAccount,
  unverifyStudent,
  verifyStudent,
} from "@/app/actions/admin";
import { ListControls, Pager } from "@/components/ui/list-controls";
import type { AdminStudentFilter, AdminStudentRequest, AdminStudentSort } from "@/lib/admin";
import type { Page } from "@/lib/pagination";
import { DEFAULT_OFFERED_PLAN, PLANS, type PlanKey } from "@/lib/plans";

/**
 * Every candidate, and the manual grant that stands in for a checkout.
 *
 * This is /verify-students, moved into the console and paged. The two screens
 * it replaces loaded five hundred rows each and filtered them in the browser;
 * the tabs here are a SQL predicate, so "free" and "on a plan" stay accurate at
 * any size and a search finds a student who is not on the current page.
 */

export type AdminStudentDisplay = {
  id: string;
  name: string;
  email: string;
  plan: PlanKey;
  expiresLabel: string | null;
  joinedLabel: string;
  lastSeenLabel: string | null;
  partnerName: string | null;
  disabled: boolean;
};

const FILTERS: ReadonlyArray<{ key: AdminStudentFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "free", label: "Free" },
  { key: "paid", label: "On a plan" },
  { key: "partner", label: "Partner students" },
];

const SORTS: ReadonlyArray<{ key: AdminStudentSort; label: string }> = [
  { key: "joined", label: "Joined" },
  { key: "name", label: "Name" },
  { key: "lastSeen", label: "Last sign-in" },
  { key: "expires", label: "Plan ends" },
];

/** 0 means "never lapses". Kept in step with the bound in the action. */
const DURATIONS = [
  { months: 1, label: "1 month" },
  { months: 3, label: "3 months" },
  { months: 6, label: "6 months" },
  { months: 12, label: "12 months" },
  { months: 0, label: "No expiry" },
] as const;

const CONTROL =
  "h-9 rounded-lg border border-line bg-paper-elev px-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-50";

export function StudentsTable({
  page,
  req,
}: {
  page: Page<AdminStudentDisplay>;
  req: AdminStudentRequest;
}) {
  return (
    <>
      <ListControls
        basePath="/admin/students"
        req={req}
        filters={FILTERS}
        sorts={SORTS}
        placeholder="Search by name or email"
      />

      {page.rows.length === 0 ? (
        <p className="p-10 text-center text-sm text-ink-muted">No students match that.</p>
      ) : (
        <ul className="divide-y divide-line">
          {page.rows.map((s) => (
            <Row key={s.id} student={s} />
          ))}
        </ul>
      )}

      <Pager basePath="/admin/students" req={req} page={page} noun="student" />
    </>
  );
}

function Row({ student }: { student: AdminStudentDisplay }) {
  const [months, setMonths] = useState<number>(3);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Taking access away from someone mid-course asks once first.
  const [confirming, setConfirming] = useState(false);
  // Locking an account out is its own question, asked on its own button.
  const [confirmingDisable, setConfirmingDisable] = useState(false);
  const paid = student.plan !== "free";

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    setConfirming(false);
    setConfirmingDisable(false);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "That didn't work. Try again.");
    });
  };

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-ink">{student.name}</span>
          {paid ? (
            <span className="rounded-full bg-green-soft px-2 py-0.5 text-[11px] font-semibold text-green-ink">
              {PLANS[student.plan].label}
              {student.expiresLabel ? ` · to ${student.expiresLabel}` : ""}
            </span>
          ) : (
            <span className="rounded-full bg-paper-sunken px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
              Free
            </span>
          )}
          {student.partnerName && (
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
              {student.partnerName}
            </span>
          )}
          {student.disabled && (
            <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
              Disabled
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {student.email} · joined {student.joinedLabel}
          {student.lastSeenLabel ? ` · last seen ${student.lastSeenLabel}` : " · never signed in"}
        </p>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {paid ? (
          confirming ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => unverifyStudent(student.id))}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-destructive px-3 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
              >
                {pending && <Loader2 className="size-3.5 animate-spin" />} Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="h-9 rounded-lg px-3 text-sm font-medium text-ink-soft hover:text-ink"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken"
            >
              <Undo2 className="size-3.5" /> Remove access
            </button>
          )
        ) : (
          <>
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              disabled={pending}
              aria-label={`Duration for ${student.name}`}
              className={CONTROL}
            >
              {DURATIONS.map((d) => (
                <option key={d.months} value={d.months}>
                  {d.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => verifyStudent({ userId: student.id, plan: DEFAULT_OFFERED_PLAN, months }))
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <BadgeCheck className="size-3.5" />}
              Grant
            </button>
          </>
        )}

        {/* Lock-out, kept apart from the plan controls: a disabled account
            keeps whatever it paid for — the two are not the same decision. */}
        <span aria-hidden className="h-6 w-px bg-line" />

        {student.disabled ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => reactivateAccount(student.id))}
            title={"Let this account sign in again"}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
            Enable
          </button>
        ) : confirmingDisable ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deactivateAccount(student.id))}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-destructive px-3 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
            >
              {pending && <Loader2 className="size-3.5 animate-spin" />} Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDisable(false)}
              className="h-9 rounded-lg px-3 text-sm font-medium text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmingDisable(true)}
            title={"Sign this account out everywhere and block sign-in"}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft disabled:opacity-50"
          >
            <Ban className="size-3.5" /> Disable
          </button>
        )}
      </div>
    </li>
  );
}
