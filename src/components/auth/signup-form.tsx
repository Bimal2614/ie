"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { signup } from "@/app/actions/auth";
import { clearAuthCache } from "@/lib/auth-cache";
import { type AuthFormState } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { AuthField, authButton, authError } from "./auth-ui";
import { PhoneField } from "./phone-field";

const MODULES = [
  { value: "academic", label: "Academic", hint: "University / professional" },
  { value: "general", label: "General Training", hint: "Migration / work" },
] as const;

export function SignupForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    signup,
    null,
  );
  const [show, setShow] = useState(false);
  const [module, setModule] = useState<"academic" | "general">("academic");

  return (
    // Same reason as LoginForm: drop whoever was cached before the session is
    // swapped, so the new account is never painted with the old one's tier.
    <form action={action} onSubmit={() => clearAuthCache()} className="space-y-3" noValidate>
      {/* See LoginForm: a hint for where to land, revalidated by `safeNext`. */}
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && (
        <p role="alert" className={authError}>
          {state.error}
        </p>
      )}

      <AuthField
        label="Full name"
        id="name"
        name="name"
        autoComplete="name"
        placeholder="Alex Morgan"
        required
        error={state?.fieldErrors?.name?.[0]}
      />

      <AuthField
        label="Email address"
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
        error={state?.fieldErrors?.email?.[0]}
      />

      <PhoneField error={state?.fieldErrors?.phone?.[0]} />

      <div>
        <AuthField
          label="Password"
          id="password"
          name="password"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          placeholder="At least 6 characters"
          required
          error={state?.fieldErrors?.password?.[0]}
          adornment={
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="text-ink-muted transition-colors hover:text-ink"
              aria-label={show ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {show ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          }
        />
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-ink-soft">
          I&apos;m preparing for
        </span>
        <input type="hidden" name="targetModule" value={module} />
        <div className="grid grid-cols-2 gap-2">
          {MODULES.map((m) => (
            <button
              type="button"
              key={m.value}
              onClick={() => setModule(m.value)}
              className={cn(
                "rounded-lg border p-2.5 text-left transition-colors",
                module === m.value
                  ? "border-brand bg-brand-soft"
                  : "border-line hover:bg-paper-sunken",
              )}
              aria-pressed={module === m.value}
            >
              <span className="block text-sm font-medium text-ink">
                {m.label}
              </span>
              {/* <span className="block text-xs text-ink-muted">{m.hint}</span> */}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" disabled={pending} className={authButton}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Creating account…" : "Create account"}
        {!pending && <ArrowRight className="size-4" />}
      </button>

      <p className="pt-1 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="ml-1 rounded-full border border-line px-3 py-1 font-medium text-ink transition-colors hover:bg-paper-sunken"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
