"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2, Pause, Play, Ticket } from "lucide-react";

import { createCouponAction, setCouponStatusAction } from "@/app/actions/admin-partners";
import { cardClass } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

/**
 * Creating a rate, and turning one on or off.
 *
 * There is no "edit the percentage" here on purpose. Changing the rate of a
 * coupon several classes are already on is not one decision, it is one per
 * class — so a new rate is a new coupon, and the old one gets deactivated. What
 * was already sold is unaffected either way; `partner_payments` froze it.
 */

const field =
  "h-9 w-full rounded-lg border border-line bg-paper-elev px-3 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15";

export function CreateCouponForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setErrors({});
    setError(null);

    startTransition(async () => {
      const result = await createCouponAction({
        code: data.get("code"),
        percent: data.get("percent"),
        endsAt: data.get("endsAt") ?? undefined,
        note: data.get("note") ?? undefined,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setError(result.error ?? null);
        return;
      }
      form.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-hover"
      >
        <Ticket className="size-4" /> New coupon
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn(cardClass, "w-full space-y-4 p-5")}>
      <h2 className="font-semibold text-ink">New coupon</h2>

      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label htmlFor="code" className="text-sm font-medium text-ink">
            Code
          </label>
          <input id="code" name="code" required placeholder="ILDS25" className={cn(field, "mt-1.5 uppercase")} />
          {errors.code?.[0] && <p className="mt-1 text-xs text-danger">{errors.code[0]}</p>}
        </div>
        <div>
          <label htmlFor="percent" className="text-sm font-medium text-ink">
            Percent off
          </label>
          <input
            id="percent"
            name="percent"
            type="number"
            min={1}
            max={90}
            required
            defaultValue={20}
            className={cn(field, "mt-1.5")}
          />
          {errors.percent?.[0] && <p className="mt-1 text-xs text-danger">{errors.percent[0]}</p>}
        </div>
        <div>
          <label htmlFor="endsAt" className="text-sm font-medium text-ink">
            Ends <span className="text-ink-muted">(optional)</span>
          </label>
          <input id="endsAt" name="endsAt" type="date" className={cn(field, "mt-1.5")} />
        </div>
        <div>
          <label htmlFor="note" className="text-sm font-medium text-ink">
            Note <span className="text-ink-muted">(optional)</span>
          </label>
          <input id="note" name="note" placeholder="Launch deal" className={cn(field, "mt-1.5")} />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          {pending && <Loader2 className="size-4 animate-spin" />} Create
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper-sunken"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function CouponToggle({ couponId, status }: { couponId: string; status: "active" | "inactive" }) {
  const [pending, startTransition] = useTransition();
  const next = status === "active" ? "inactive" : "active";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => void (await setCouponStatusAction(couponId, next)))}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold transition-colors disabled:opacity-50",
        status === "active" ? "text-danger hover:bg-danger-soft" : "text-ink hover:bg-paper-sunken",
      )}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : status === "active" ? (
        <Pause className="size-3.5" />
      ) : (
        <Play className="size-3.5" />
      )}
      {status === "active" ? "Deactivate" : "Activate"}
    </button>
  );
}
