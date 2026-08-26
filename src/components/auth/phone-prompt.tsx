"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Phone } from "lucide-react";
import { savePhone } from "@/app/actions/settings";
import { authButton, authError } from "@/components/auth/auth-ui";
import { PhoneField } from "@/components/auth/phone-field";
import { type AuthFormState } from "@/lib/validation";

/**
 * Blocking prompt for accounts with no phone number on file.
 *
 * Email signup collects the number in the form, so in practice this is the
 * Google path: Google's phone scope is sensitive and not requested, so those
 * accounts are created without one. There is no dismiss and no backdrop click
 * — the number is required — but the page underneath still renders, so the
 * user can read where they landed while filling it in.
 */
export function PhonePrompt() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(savePhone, null);
  const router = useRouter();

  // The server revalidates the layout; refresh so this component's `needsPhone`
  // prop comes back false and the dialog unmounts.
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-prompt-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-line bg-paper-elev p-6 shadow-xl">
        <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Phone className="size-5" />
        </span>

        <h2 id="phone-prompt-title" className="mt-4 text-lg font-semibold text-ink">
          Add your phone number
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          We need your phone number to give you personalized plan and templates recommendations, you will not be able to change this once you submit it.
        </p>

        <form action={action} className="mt-5 space-y-4">
          {state?.error && (
            <p role="alert" className={authError}>
              {state.error}
            </p>
          )}

          <PhoneField id="prompt-phone" autoFocus error={state?.fieldErrors?.phone?.[0]} />

          <button type="submit" disabled={pending} className={authButton}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {pending ? "Saving…" : "Save and continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
