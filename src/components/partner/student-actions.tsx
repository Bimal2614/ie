"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";

import { resetStudentPassword } from "@/app/actions/partner";
import { PlanPicker } from "@/components/partner/plan-picker";
import { useStudentCheckout } from "@/components/partner/use-student-checkout";
import type { Quote } from "@/lib/partner-pricing";
import { DEFAULT_CURRENCY, DEFAULT_OFFERED_PLAN, type PlanKey } from "@/lib/plans";
import { cn } from "@/lib/utils";

/**
 * The two things a class does to a student it has already enrolled: pay for
 * their next term, and give them a new password when they forget theirs.
 *
 * Both are refused server-side while the partner is suspended; the buttons are
 * disabled here too so it is not a surprise.
 */

const field =
  "h-9 rounded-lg border border-line bg-paper-elev px-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-50";

export function StudentActions({
  studentId,
  quotes,
  onPaidPlan,
  canAct,
}: {
  studentId: string;
  quotes: Quote[];
  /** Their current tier, so the button reads "Extend" rather than "Pay". */
  onPaidPlan: boolean;
  canAct: boolean;
}) {
  const checkout = useStudentCheckout();
  const [plan, setPlan] = useState<Exclude<PlanKey, "free">>(DEFAULT_OFFERED_PLAN);
  const busy = checkout.phase === "opening" || checkout.phase === "confirming";

  const [password, setPassword] = useState("");
  const [resetting, startReset] = useTransition();
  const [resetState, setResetState] = useState<{ ok: boolean; message: string } | null>(null);

  function reset() {
    setResetState(null);
    startReset(async () => {
      const result = await resetStudentPassword({ studentId, password });
      setResetState(
        result.ok
          ? { ok: true, message: "Done. Their old sessions are signed out — give them the new one." }
          : { ok: false, message: result.error },
      );
      if (result.ok) setPassword("");
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-ink">
          {onPaidPlan ? "Extend their plan" : "Pay for a plan"}
        </h2>
        <p className="text-xs text-ink-muted">
          One payment, one term. Nothing recurs — you buy the next term when you want it.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <PlanPicker
            quotes={quotes}
            value={plan}
            onChange={(p) => setPlan(p as Exclude<PlanKey, "free">)}
            disabled={!canAct || busy}
          />
          <button
            type="button"
            disabled={!canAct || busy}
            onClick={() => checkout.open(studentId, plan, DEFAULT_CURRENCY)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            {onPaidPlan ? "Extend" : "Pay"}
          </button>
        </div>
        {checkout.error && (
          <p className="flex items-start gap-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> {checkout.error}
          </p>
        )}
        {checkout.granted && (
          <p className="flex items-start gap-2 text-sm text-green-ink">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> Paid — they are on{" "}
            {checkout.granted.plan} now.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-ink">Reset their password</h2>
        <p className="text-xs text-ink-muted">
          For a student who has lost theirs. It signs them out everywhere, so read the new one out
          before you leave the page.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="text"
            minLength={6}
            autoComplete="off"
            placeholder="New password"
            disabled={!canAct || resetting}
            className={cn(field, "w-48")}
          />
          <button
            type="button"
            disabled={!canAct || resetting || password.length < 6}
            onClick={reset}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-4 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken disabled:opacity-50"
          >
            {resetting ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
            Set
          </button>
        </div>
        {resetState && (
          <p className={cn("text-sm", resetState.ok ? "text-green-ink" : "text-danger")}>
            {resetState.message}
          </p>
        )}
      </div>
    </div>
  );
}
