"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Loader2, MailCheck, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { requestPasswordReset, resetPassword } from "@/app/actions/recovery";
import { AuthField, authButton, authError } from "./auth-ui";
import { type AuthFormState } from "@/lib/validation";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(requestPasswordReset, null);

  if (state?.ok) {
    return (
      <div className="flex gap-3 rounded-xl border border-line bg-paper-elev p-4 text-sm text-ink-soft">
        <MailCheck className="mt-0.5 size-5 shrink-0 text-green" />
        <p>If an account exists for that email, we&apos;ve sent a password-reset link. Check your inbox (and spam). The link expires in 1 hour.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state?.error && <p role="alert" className={authError}>{state.error}</p>}
      <AuthField
        label="Email address" id="email" name="email" type="email"
        autoComplete="email" required placeholder="you@example.com"
        error={state?.fieldErrors?.email?.[0]}
      />
      <button type="submit" disabled={pending} className={authButton}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Send reset link
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(resetPassword, null);
  const [show, setShow] = useState(false);

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3 rounded-xl border border-line bg-paper-elev p-4 text-sm text-ink-soft">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green" />
          <p>Your password has been reset and you&apos;ve been signed out everywhere. Log in with your new password.</p>
        </div>
        <Link href="/login" className={authButton}>Go to login</Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state?.error && <p role="alert" className={authError}>{state.error}</p>}
      <AuthField
        label="New password" id="newPassword" name="newPassword"
        type={show ? "text" : "password"} autoComplete="new-password"
        placeholder="At least 10 characters" required
        error={state?.fieldErrors?.newPassword?.[0]}
        adornment={
          <button type="button" onClick={() => setShow((s) => !s)} tabIndex={-1}
            className="text-ink-muted transition-colors hover:text-ink" aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
      />
      <p className={cn("text-xs text-ink-muted")}>Use upper &amp; lower case, a number and a symbol.</p>
      <button type="submit" disabled={pending} className={authButton}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Reset password
      </button>
    </form>
  );
}
