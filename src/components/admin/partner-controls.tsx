"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, Pause, Play, Save, Ticket } from "lucide-react";

import {
  assignCouponAction,
  resetPartnerLoginPassword,
  setPartnerStatusAction,
  updatePartnerAction,
} from "@/app/actions/admin-partners";
import { cn } from "@/lib/utils";

/**
 * The three admin levers on one partner: edit its details, rotate the password
 * we handed over, and suspend or restore it.
 *
 * SUSPENDING IS NOT A DELETE and the copy says so — the students keep every day
 * of access that was paid for, and only the class's ability to enrol and pay
 * stops. Nothing here deletes anything; a partner with payment history cannot
 * be deleted at all (the foreign key refuses it).
 */

const field =
  "h-9 w-full rounded-lg border border-line bg-paper-elev px-3 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-50";

type Feedback = { ok: boolean; message: string } | null;

export function PartnerControls({
  partnerId,
  status,
  details,
  logins,
  couponId,
  coupons,
}: {
  partnerId: string;
  status: "active" | "suspended";
  details: { name: string; location: string | null; website: string | null };
  logins: Array<{ id: string; name: string; email: string }>;
  /** The rate this class is on now, or null for list price. */
  couponId: string | null;
  coupons: Array<{ id: string; code: string; percent: number; status: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [name, setName] = useState(details.name);
  const [location, setLocation] = useState(details.location ?? "");
  const [website, setWebsite] = useState(details.website ?? "");

  const [loginId, setLoginId] = useState(logins[0]?.id ?? "");
  const [password, setPassword] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await fn();
      setFeedback(
        result.ok
          ? { ok: true, message: success }
          : { ok: false, message: result.error ?? "That didn't work. Try again." },
      );
      if (result.ok) setPassword("");
    });
  };

  return (
    <div className="space-y-5">
      {feedback && (
        <p className={cn("text-sm", feedback.ok ? "text-green-ink" : "text-danger")}>
          {feedback.message}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Class name
          <input value={name} onChange={(e) => setName(e.target.value)} className={cn(field, "mt-1.5")} />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Location
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={cn(field, "mt-1.5")}
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Website
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className={cn(field, "mt-1.5")}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => updatePartnerAction(partnerId, { name, location, website }),
              "Details saved.",
            )
          }
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-4 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save details
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => setPartnerStatusAction(partnerId, status === "active" ? "suspended" : "active"),
              status === "active"
                ? "Suspended. Their students keep the access already paid for."
                : "Restored. They can enrol and pay again.",
            )
          }
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-50",
            status === "active"
              ? "border border-line text-danger hover:bg-danger-soft"
              : "bg-primary text-primary-foreground hover:bg-brand-hover",
          )}
        >
          {status === "active" ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          {status === "active" ? "Suspend" : "Restore"}
        </button>
      </div>

      <div className="rounded-xl border border-line bg-paper-sunken p-4">
        <p className="text-sm font-semibold text-ink">Rate</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          The discount this class buys at. Changing it applies to their NEXT order —
          seats already paid for keep the price they were bought at.
        </p>
        {/*
         * A form with an UNCONTROLLED select, not React state.
         *
         * The value is read from the DOM at submit, so there is no second copy
         * of it to fall out of step with what the admin can see — and no
         * "nothing to apply" disabled state that can be wrong.
         */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const chosen = String(new FormData(e.currentTarget).get("couponId") ?? "");
            run(
              () => assignCouponAction(partnerId, chosen || null),
              chosen ? "Rate applied to their next order." : "Back on list price.",
            );
          }}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <select
            name="couponId"
            defaultValue={couponId ?? ""}
            aria-label="Coupon"
            className={cn(field, "w-auto")}
          >
            <option value="">List price — no discount</option>
            {coupons.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.percent}% {c.status === "inactive" ? "(inactive)" : ""}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-paper-elev px-4 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Ticket className="size-3.5" />}
            Apply
          </button>
        </form>
      </div>

      {logins.length > 0 && (
        <div className="rounded-xl border border-line bg-paper-sunken p-4">
          <p className="text-sm font-semibold text-ink">Reset the login password</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Signs that login out everywhere. Copy the new password before you press it.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {logins.length > 1 && (
              <select
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className={cn(field, "w-auto")}
              >
                {logins.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.email}
                  </option>
                ))}
              </select>
            )}
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="text"
              minLength={6}
              autoComplete="off"
              placeholder="New password"
              className={cn(field, "w-52")}
            />
            <button
              type="button"
              disabled={pending || password.length < 6 || !loginId}
              onClick={() =>
                run(
                  () => resetPartnerLoginPassword({ loginUserId: loginId, password }),
                  "Password changed. Read it out before you leave this page.",
                )
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-paper-elev px-4 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken disabled:opacity-50"
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
              Set
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
