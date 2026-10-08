"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

import { acceptPartnerInviteAction } from "@/app/actions/partner-invite";
import { authButton, authError } from "./auth-ui";

/**
 * The one button that adds an existing account to a class. Sends nothing but
 * the click — the token rides in its httpOnly cookie, the account in the
 * session.
 */
export function AcceptInvite({ partnerName }: { partnerName: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  if (joined) {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 rounded-lg border border-green/30 bg-green-soft px-3 py-2 text-sm text-green-ink">
          <CheckCircle2 className="size-4 shrink-0" /> You&apos;ve joined {partnerName}.
        </p>
        <Link href="/dashboard" className={authButton}>
          Go to my dashboard <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className={authError}>
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={pending}
        className={authButton}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await acceptPartnerInviteAction();
            if (result.ok) setJoined(true);
            else setError(result.error);
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Joining…" : `Join ${partnerName}`}
      </button>
    </div>
  );
}
