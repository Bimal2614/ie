"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, Building2, Loader2 } from "lucide-react";

import { createPartnerAction } from "@/app/actions/admin-partners";
import { cardClass } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

/**
 * Onboarding a class: its details, and the one login we hand over with it.
 *
 * THE PASSWORD IS TYPED HERE AND NEVER SEEN AGAIN. It is bcrypt-hashed on the
 * way in, exactly like a candidate's, so the only recovery is a reset from the
 * partner's own screen. The field is plain text because whoever fills this in
 * is about to read it down a phone.
 */

const field =
  "h-10 w-full rounded-lg border border-line bg-paper-elev px-3 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-xs text-danger">{messages[0]}</p>;
}

export function CreatePartnerForm() {
  const router = useRouter();
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
      const result = await createPartnerAction({
        name: data.get("name"),
        location: data.get("location") ?? undefined,
        website: data.get("website") ?? undefined,
        loginName: data.get("loginName"),
        email: data.get("email"),
        phone: data.get("phone") ?? undefined,
        password: data.get("password"),
      });

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setError(result.error ?? null);
        return;
      }
      form.reset();
      setOpen(false);
      if (result.partnerId) router.push(`/admin/partners/${result.partnerId}`);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-hover"
      >
        <Building2 className="size-4" /> Onboard a class
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn(cardClass, "space-y-4 p-5")}>
      <h2 className="font-semibold text-ink">Onboard a class</h2>

      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="name" className="text-sm font-medium text-ink">
            Class name
          </label>
          <input id="name" name="name" required placeholder="ILDS Classes" className={cn(field, "mt-1.5")} />
          <FieldError messages={errors.name} />
        </div>
        <div>
          <label htmlFor="location" className="text-sm font-medium text-ink">
            Location
          </label>
          <input id="location" name="location" placeholder="Ahmedabad, IN" className={cn(field, "mt-1.5")} />
          <FieldError messages={errors.location} />
        </div>
        <div>
          <label htmlFor="website" className="text-sm font-medium text-ink">
            Website
          </label>
          <input id="website" name="website" placeholder="ildsclasses.com" className={cn(field, "mt-1.5")} />
          <FieldError messages={errors.website} />
        </div>
      </div>

      <div className="rounded-xl border border-line bg-paper-sunken p-4">
        <p className="mb-3 text-sm font-semibold text-ink">The login you hand over</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="loginName" className="text-sm font-medium text-ink">
              Name on the login
            </label>
            <input
              id="loginName"
              name="loginName"
              required
              placeholder="ILDS Front Desk"
              className={cn(field, "mt-1.5")}
            />
            <FieldError messages={errors.loginName} />
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
          <div>
            <label htmlFor="phone" className="text-sm font-medium text-ink">
              Phone <span className="text-ink-muted">(optional)</span>
            </label>
            <input id="phone" name="phone" placeholder="+91-9876543210" className={cn(field, "mt-1.5")} />
            <FieldError messages={errors.phone} />
          </div>
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
              className={cn(field, "mt-1.5")}
            />
            <p className="mt-1 text-xs text-ink-muted">Stored hashed — copy it before you submit.</p>
            <FieldError messages={errors.password} />
          </div>
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
