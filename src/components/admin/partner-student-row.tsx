"use client";

import { useState, useTransition } from "react";
import { Loader2, UserMinus } from "lucide-react";

import { removeStudentFromPartner } from "@/app/actions/admin";

/**
 * One student on an institution's roster, in the ADMIN console.
 *
 * The row exists as a client component for one reason: the Remove button. The
 * class's own panel has no equivalent and is not getting one — a partner
 * removing a student would be editing our record of who it bought a plan for.
 *
 * Labels arrive pre-formatted from the server for the same reason they do on
 * /admin/students: a date rendered here would read the viewer's timezone and
 * disagree with the server's string, which is a hydration error.
 */
export type AdminPartnerStudent = {
  id: string;
  name: string;
  email: string;
  planLabel: string;
  attempts: number;
};

export function PartnerStudentRow({ student }: { student: AdminPartnerStudent }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Detaching is reversible, but it is still someone's class membership.
  const [confirming, setConfirming] = useState(false);

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const res = await removeStudentFromPartner(student.id);
      if (!res.ok) {
        setError(res.error);
        setConfirming(false);
      }
      // On success the row leaves the roster: the action revalidates this page.
    });
  };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 text-sm">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink">{student.name}</span>
        <span className="block truncate text-xs text-ink-muted">{student.email}</span>
        {error && <span className="mt-0.5 block text-xs text-danger">{error}</span>}
      </span>
      <span className="text-xs text-ink-muted">{student.planLabel}</span>
      <span className="w-24 text-right text-xs tabular-nums text-ink-muted">
        {student.attempts} attempts
      </span>

      {confirming ? (
        <span className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-destructive px-2.5 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
          >
            {pending && <Loader2 className="size-3.5 animate-spin" />} Confirm
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="h-8 rounded-lg px-2 text-xs font-medium text-ink-soft hover:text-ink"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(true)}
          title="Detach from this class — the account and its history stay"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-sunken disabled:opacity-50"
        >
          <UserMinus className="size-3.5" /> Remove
        </button>
      )}
    </li>
  );
}
