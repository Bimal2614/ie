"use client";

import { useState, useTransition } from "react";
import { Ban, BadgeCheck, Loader2, ShieldCheck, Undo2 } from "lucide-react";

import {
  deactivateAccount,
  reactivateAccount,
  unverifyStudent,
  verifyStudent,
} from "@/app/actions/admin";
import { DEFAULT_OFFERED_PLAN, type PlanKey } from "@/lib/plans";
import { cn } from "@/lib/utils";

/**
 * What an admin can DO to one candidate: put them on a plan, take it away,
 * lock the account, unlock it.
 *
 * ONE COPY, rendered both as the trailing cluster of a row on /admin/students
 * and as a panel on that student's own page. It was the row's before the detail
 * page existed, and duplicating it there would have meant two answers to
 * questions that have to stay the same — how long a grant runs for, and whether
 * taking access away asks first.
 *
 * Every button is a Server Action; `verifyStudent` re-validates its own input
 * because an action is a public endpoint, so the <select> here is UX and not
 * the gate.
 */

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

export function StudentControls({
  studentId,
  name,
  plan,
  disabled,
  className,
}: {
  studentId: string;
  /** Only for the accessible label on the duration select. */
  name: string;
  /** The EFFECTIVE plan — a lapsed student is offered a grant, not a removal. */
  plan: PlanKey;
  /** Whether the account is locked out (`users.deactivated_at`). */
  disabled: boolean;
  className?: string;
}) {
  const [months, setMonths] = useState<number>(3);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Taking access away from someone mid-course asks once first.
  const [confirming, setConfirming] = useState(false);
  // Locking an account out is its own question, asked on its own button.
  const [confirmingDisable, setConfirmingDisable] = useState(false);
  const paid = plan !== "free";

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
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {paid ? (
          confirming ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => unverifyStudent(studentId))}
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
              aria-label={`Duration for ${name}`}
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
                run(() => verifyStudent({ userId: studentId, plan: DEFAULT_OFFERED_PLAN, months }))
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

        {disabled ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => reactivateAccount(studentId))}
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
              onClick={() => run(() => deactivateAccount(studentId))}
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

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
