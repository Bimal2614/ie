"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { signup } from "@/app/actions/auth";
import { type AuthFormState } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { AuthField, authButton, authError } from "./auth-ui";

const MODULES = [
  { value: "academic", label: "Academic", hint: "University / professional" },
  { value: "general", label: "General Training", hint: "Migration / work" },
] as const;

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signup, null);
  const [show, setShow] = useState(false);
  const [module, setModule] = useState<"academic" | "general">("academic");

  return (
    <form action={action} className="space-y-4" noValidate>
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

      <div>
        <AuthField
          label="Password"
          id="password"
          name="password"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          placeholder="At least 10 characters"
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
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          }
        />
        {!state?.fieldErrors?.password && (
          <p className="mt-1 text-xs text-ink-muted">
            Use upper &amp; lower case, a number and a symbol.
          </p>
        )}
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-ink-soft">I&apos;m preparing for</span>
        <input type="hidden" name="targetModule" value={module} />
        <div className="grid grid-cols-2 gap-2">
          {MODULES.map((m) => (
            <button
              type="button"
              key={m.value}
              onClick={() => setModule(m.value)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                module === m.value
                  ? "border-brand bg-brand-soft"
                  : "border-line hover:bg-paper-sunken",
              )}
              aria-pressed={module === m.value}
            >
              <span className="block text-sm font-medium text-ink">{m.label}</span>
              <span className="block text-xs text-ink-muted">{m.hint}</span>
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
          href="/login"
          className="ml-1 rounded-full border border-line px-3 py-1 font-medium text-ink transition-colors hover:bg-paper-sunken"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
