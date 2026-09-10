"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { enrolStudentAction } from "@/app/actions/partner";
import { PhoneField } from "@/components/auth/phone-field";
import { cardClass } from "@/components/dashboard/ui";
import { PlanPicker } from "@/components/partner/plan-picker";
import { useStudentCheckout } from "@/components/partner/use-student-checkout";
import type { Quote } from "@/lib/partner-pricing";
import { DEFAULT_CURRENCY, PARTNER_DEFAULT_PLAN, type PlanKey } from "@/lib/plans";
import { TARGET_BANDS } from "@/lib/validation";
import { cn } from "@/lib/utils";

/**
 * Enrolling a student: the signup form, filled in by the class.
 *
 * TWO STEPS, IN THIS ORDER. The account is created first, on the free tier, and
 * only then is the class asked to pay for it. Taking the money first would risk
 * a payment with no account to attach it to; this way an abandoned checkout
 * leaves a real student on the roster marked "Awaiting payment", and the class
 * can pay whenever it likes.
 *
 * THE PASSWORD IS TYPED HERE AND SPOKEN ONCE. No email is sent and nothing is
 * verified — the class hands the credentials over in the room, which is the
 * whole reason this screen exists rather than a signup link.
 */

const field =
  "h-10 w-full rounded-lg border border-line bg-paper-elev px-3 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-xs text-danger">{messages[0]}</p>;
}

export function EnrolForm({ quotes, canEnrol }: { quotes: Quote[]; canEnrol: boolean }) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);
  const [plan, setPlan] = useState<Exclude<PlanKey, "free">>(PARTNER_DEFAULT_PLAN);
  const checkout = useStudentCheckout();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setErrors({});
    setError(null);

    startTransition(async () => {
      const result = await enrolStudentAction({
        name: data.get("name"),
        email: data.get("email"),
        phone: data.get("phone"),
        password: data.get("password"),
        targetModule: data.get("targetModule") ?? "academic",
        targetBand: data.get("targetBand") ?? undefined,
      });

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setError(result.error ?? null);
        return;
      }
      setCreated({ id: result.studentId, name: String(data.get("name") ?? "The student") });
      form.reset();
    });
  }

  if (created) {
    return (
      <EnrolledPanel
        created={created}
        quotes={quotes}
        plan={plan}
        setPlan={setPlan}
        canEnrol={canEnrol}
        checkout={checkout}
        onAnother={() => {
          checkout.dismiss();
          setCreated(null);
        }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn(cardClass, "space-y-4 p-6")}>
      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-sm font-medium text-ink">
            Full name
          </label>
          <input id="name" name="name" required autoComplete="off" className={cn(field, "mt-1.5")} />
          <FieldError messages={errors.name} />
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="off"
            className={cn(field, "mt-1.5")}
          />
          <FieldError messages={errors.email} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <PhoneField error={errors.phone?.[0]} />
        <div>
          <label htmlFor="password" className="text-sm font-medium text-ink">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="text"
            required
            minLength={6}
            autoComplete="off"
            placeholder="At least 6 characters"
            className={cn(field, "mt-1.5")}
          />
          <p className="mt-1 text-xs text-ink-muted">
            Shown as you type, on purpose — you are reading it out to the student. Only a hash is
            stored, so this is the last time anyone can see it.
          </p>
          <FieldError messages={errors.password} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="targetModule" className="text-sm font-medium text-ink">
            Module
          </label>
          <select id="targetModule" name="targetModule" className={cn(field, "mt-1.5")}>
            <option value="academic">Academic</option>
            <option value="general">General Training</option>
          </select>
        </div>
        <div>
          <label htmlFor="targetBand" className="text-sm font-medium text-ink">
            Target band <span className="text-ink-muted">(optional)</span>
          </label>
          <select id="targetBand" name="targetBand" defaultValue="" className={cn(field, "mt-1.5")}>
            <option value="">Not set</option>
            {TARGET_BANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending || !canEnrol}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {canEnrol ? "Create the account" : "Enrolment paused"}
      </button>
    </form>
  );
}

/**
 * What the class sees the moment the account exists: the credentials are theirs
 * to pass on, and the plan is one press away. Kept in its own component so the
 * form above stays a form.
 */
function EnrolledPanel({
  created,
  quotes,
  plan,
  setPlan,
  canEnrol,
  checkout,
  onAnother,
}: {
  created: { id: string; name: string };
  quotes: Quote[];
  plan: Exclude<PlanKey, "free">;
  setPlan: (p: Exclude<PlanKey, "free">) => void;
  canEnrol: boolean;
  checkout: ReturnType<typeof useStudentCheckout>;
  onAnother: () => void;
}) {
  const granted = checkout.granted?.studentId === created.id;
  const busy = checkout.phase === "opening" || checkout.phase === "confirming";

  return (
    <div className={cn(cardClass, "space-y-4 p-6")}>
      <p className="flex items-start gap-2 text-sm text-green-ink">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        <span>
          <strong className="font-semibold">{created.name}</strong> now has an account. Give them the
          email and password you just typed — they can sign in straight away.
        </span>
      </p>

      {granted ? (
        <p className="rounded-lg bg-green-soft px-3 py-2.5 text-sm text-green-ink">
          Paid. They are on {checkout.granted?.plan} now.
        </p>
      ) : (
        <div className="space-y-3 rounded-lg border border-line bg-paper-sunken p-4">
          <p className="text-sm text-ink">
            They are on the free tier until a plan is paid for — Writing, Speaking and mock tests
            stay locked until then.
          </p>
          {checkout.error && (
            <p className="flex items-start gap-2 text-sm text-danger">
              <AlertCircle className="mt-0.5 size-4 shrink-0" /> {checkout.error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <PlanPicker
              quotes={quotes}
              value={plan}
              onChange={(p) => setPlan(p as Exclude<PlanKey, "free">)}
              disabled={!canEnrol || busy}
              className="w-auto"
            />
            <button
              type="button"
              disabled={!canEnrol || busy}
              onClick={() => checkout.open(created.id, plan, DEFAULT_CURRENCY)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              Pay now
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAnother}
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken"
        >
          Enrol another
        </button>
        <Link
          href={`/partner/students/${created.id}`}
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken"
        >
          Open their record
        </Link>
        <Link
          href="/partner"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          Back to students
        </Link>
      </div>
    </div>
  );
}
