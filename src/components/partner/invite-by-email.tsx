"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";

import { inviteStudentAction } from "@/app/actions/partner-invite";

/**
 * Invite one student by email.
 *
 * THE CONFIRMATION IS THE SAME FOR EVERY ADDRESS, on purpose: the panel never
 * says whether someone already has an account (see src/lib/partner-invites.ts).
 * The student gets the right email either way and joins only by accepting it.
 */
export function InviteByEmail({ canInvite }: { canInvite: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();
    setError(null);
    setSentTo(null);

    startTransition(async () => {
      const result = await inviteStudentAction({ email });
      if (result.ok) {
        setSentTo(email);
        form.reset();
      } else {
        setError(result.fieldErrors?.email?.[0] ?? result.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-paper-elev p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Mail className="size-4 text-brand" /> Invite a student by email
      </p>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
        We&apos;ll email them a link. Students who already practise with us confirm and join your
        class; new students create their account and join straight away. The link works once and
        expires in 7 days.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="student@example.com"
          aria-label="Student's email address"
          disabled={!canInvite || pending}
          className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
        <button
          type="submit"
          disabled={!canInvite || pending}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
          {pending ? "Sending…" : "Send invite"}
        </button>
      </form>

      <div aria-live="polite">
        {sentTo && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-green-ink">
            <CheckCircle2 className="size-3.5" /> Invitation sent to {sentTo}.
          </p>
        )}
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </div>
    </section>
  );
}
