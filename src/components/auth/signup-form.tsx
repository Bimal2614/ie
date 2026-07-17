"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signup } from "@/app/actions/auth";
import { type AuthFormState } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MODULES = [
  { value: "academic", label: "Academic", hint: "University / professional registration" },
  { value: "general", label: "General Training", hint: "Migration / work experience" },
] as const;

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signup, null);
  const [show, setShow] = useState(false);
  const [module, setModule] = useState<"academic" | "general">("academic");

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error ? (
        <p
          role="alert"
          className="rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]"
        >
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" autoComplete="name" placeholder="Alex Morgan" required
          aria-invalid={Boolean(state?.fieldErrors?.name)} />
        {state?.fieldErrors?.name ? (
          <p className="text-xs text-[var(--destructive)]">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required
          aria-invalid={Boolean(state?.fieldErrors?.email)} />
        {state?.fieldErrors?.email ? (
          <p className="text-xs text-[var(--destructive)]">{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            placeholder="At least 10 characters"
            required
            className="pr-10"
            aria-invalid={Boolean(state?.fieldErrors?.password)}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--muted-foreground)]"
            aria-label={show ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {show ? <EyeOff /> : <Eye />}
          </button>
        </div>
        {state?.fieldErrors?.password ? (
          <ul className="space-y-0.5 text-xs text-[var(--destructive)]">
            {state.fieldErrors.password.map((e) => (
              <li key={e}>• {e}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[var(--muted-foreground)]">
            Use upper &amp; lower case, a number and a symbol.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>I&apos;m preparing for</Label>
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
                  ? "border-[var(--primary)] bg-[var(--accent)]"
                  : "border-[var(--border)] hover:bg-[var(--muted)]",
              )}
              aria-pressed={module === m.value}
            >
              <span className="block text-sm font-medium">{m.label}</span>
              <span className="block text-xs text-[var(--muted-foreground)]">{m.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
