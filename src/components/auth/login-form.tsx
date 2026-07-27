"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { login } from "@/app/actions/auth";
import { type AuthFormState } from "@/lib/validation";
import { AuthField, authButton, authError } from "./auth-ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(login, null);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error && (
        <p role="alert" className={authError}>
          {state.error}
        </p>
      )}

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
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-ink-soft">Password</span>
          <Link href="/forgot-password" className="text-xs text-ink-muted transition-colors hover:text-ink">
            Forgot password?
          </Link>
        </div>
        <AuthField
          hideLabel
          label="Password"
          id="password"
          name="password"
          type={show ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Enter your password"
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
      </div>

      <button type="submit" disabled={pending} className={authButton}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Signing in…" : "Sign in"}
        {!pending && <ArrowRight className="size-4" />}
      </button>

      <p className="pt-1 text-center text-sm text-ink-muted">
        New here?{" "}
        <Link
          href="/signup"
          className="ml-1 rounded-full border border-line px-3 py-1 font-medium text-ink transition-colors hover:bg-paper-sunken"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
