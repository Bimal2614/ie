"use client";

import { useMemo, useState, useTransition } from "react";
import {
  BadgeCheck,
  Loader2,
  Search,
  ShieldAlert,
  ShieldOff,
  Undo2,
  UserRound,
} from "lucide-react";
import { verifyStudent, unverifyStudent } from "@/app/actions/admin";
import { PLANS, DEFAULT_OFFERED_PLAN, formatPrice, type PlanKey } from "@/lib/plans";
import { cardClass } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

/**
 * The manual replacement for a checkout page.
 *
 * There is ONE TIER TO GRANT — Premium — so there is no plan to choose here;
 * the action defaults to whatever `OFFERED_PLANS` says is on sale, and putting
 * a picker in front of it would only offer a tier the business withdrew. The
 * duration <select> is UX only: `verifyStudent` re-validates it, because a
 * Server Action is a public endpoint and a crafted POST would otherwise get to
 * pick its own.
 */
const GRANTED = PLANS[DEFAULT_OFFERED_PLAN];

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: PlanKey;
  /** Formatted on the server; null on free and on grants that never lapse. */
  expiresLabel: string | null;
  joinedLabel: string;
  lastSeenLabel: string | null;
  emailVerified: boolean;
  disabled: boolean;
};

type Tab = "free" | "verified";

/** 0 = never lapses. Kept in step with the `months` bound in the action. */
const DURATIONS = [
  { months: 1, label: "1 month" },
  { months: 3, label: "3 months" },
  { months: 6, label: "6 months" },
  { months: 12, label: "12 months" },
  { months: 0, label: "No expiry" },
] as const;

/** What a class enrolment runs for, so the common case is one click. */
const DEFAULT_MONTHS = 3;

const control =
  "h-9 rounded-lg border border-line bg-paper-elev px-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-50";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function Chip({
  tone,
  children,
}: {
  tone: "green" | "warn" | "danger";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "green" && "bg-green-soft text-green-ink",
        tone === "warn" && "bg-warning-soft text-ink",
        tone === "danger" && "bg-danger-soft text-danger",
      )}
    >
      {children}
    </span>
  );
}

function Row({ student, tab }: { student: StudentRow; tab: Tab }) {
  const [months, setMonths] = useState<number>(DEFAULT_MONTHS);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Removing access takes something away from a student who is probably mid
  // course, so the button asks once before it does.
  const [confirming, setConfirming] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    setConfirming(false);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "That didn't work. Try again.");
    });
  };

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-paper-sunken text-xs font-semibold text-ink-soft"
        >
          {initials(student.name)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-ink">{student.name}</span>
            {student.disabled && (
              <Chip tone="danger">
                <ShieldOff className="size-3" /> Disabled
              </Chip>
            )}
            {!student.emailVerified && (
              <Chip tone="warn">
                <ShieldAlert className="size-3" /> Email unverified
              </Chip>
            )}
            {tab === "verified" && (
              <Chip tone="green">
                <BadgeCheck className="size-3" /> {PLANS[student.plan].label}
              </Chip>
            )}
          </div>
          <p className="truncate text-xs text-ink-soft">
            {student.email}
            {student.phone ? ` · ${student.phone}` : ""}
          </p>
          <p className="truncate text-[11px] text-ink-muted">
            Joined {student.joinedLabel}
            {student.lastSeenLabel ? ` · last seen ${student.lastSeenLabel}` : " · never signed in"}
            {tab === "verified" &&
              (student.expiresLabel ? ` · until ${student.expiresLabel}` : " · no expiry")}
          </p>
          {error && (
            <p role="alert" className="mt-1 text-xs font-medium text-danger">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <select
          aria-label={`Access length for ${student.name}`}
          className={control}
          value={months}
          disabled={pending}
          onChange={(e) => setMonths(Number(e.target.value))}
        >
          {DURATIONS.map((d) => (
            <option key={d.months} value={d.months}>
              {d.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => verifyStudent({ userId: student.id, months }))}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
          {tab === "free" ? `Verify · ${GRANTED.label}` : "Extend"}
        </button>

        {tab === "verified" &&
          (confirming ? (
            <span className="flex items-center gap-1">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => unverifyStudent(student.id))}
                className="inline-flex h-9 items-center rounded-lg bg-danger px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                aria-label="Keep access"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-ink-soft transition-colors hover:bg-paper-sunken"
              >
                <Undo2 className="size-4" />
              </button>
            </span>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(true)}
              className="inline-flex h-9 items-center rounded-lg border border-line px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper-sunken disabled:opacity-60"
            >
              Remove
            </button>
          ))}
      </div>
    </li>
  );
}

export function VerifyStudents({
  free,
  verified,
  capped,
  limit,
}: {
  free: StudentRow[];
  verified: StudentRow[];
  capped: boolean;
  limit: number;
}) {
  const [tab, setTab] = useState<Tab>("free");
  const [query, setQuery] = useState("");

  const rows = tab === "free" ? free : verified;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((s) =>
      [s.name, s.email, s.phone ?? ""].some((v) => v.toLowerCase().includes(q)),
    );
  }, [rows, query]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header>
        <h1 className="font-serif text-2xl tracking-tight text-ink">Verify students</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          There is no payment gateway yet, so paid access is granted by hand here. Verifying a
          student puts their account on{" "}
          <strong className="font-semibold text-ink">
            {GRANTED.label} ({formatPrice(GRANTED.priceCents)}/month)
          </strong>{" "}
          straight away — the same entitlement a checkout would buy — and every grant is recorded
          in the billing ledger against your account.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Students"
          className="inline-flex rounded-xl bg-paper-sunken p-1"
        >
          {(
            [
              ["free", "Awaiting access", free.length],
              ["verified", "Verified", verified.length],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors",
                tab === key ? "bg-paper-elev text-ink shadow-sm" : "text-ink-soft hover:text-ink",
              )}
            >
              {label}
              <span className="ml-1.5 text-xs font-medium text-ink-muted">{count}</span>
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email or phone"
            aria-label="Search students"
            className="h-10 w-full rounded-lg border border-line bg-paper-elev pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </div>
      </div>

      <section className={cn(cardClass, "overflow-hidden")}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <UserRound className="size-8 text-ink-muted" />
            <p className="mt-3 text-sm font-semibold text-ink">
              {query
                ? "No student matches that search."
                : tab === "free"
                  ? "Every student has access."
                  : "No student has been verified yet."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((s) => (
              <Row key={s.id} student={s} tab={tab} />
            ))}
          </ul>
        )}
      </section>

      {capped && (
        <p className="text-xs text-ink-muted">
          Showing the {limit} most recent accounts per tab. Search only filters what is listed here.
        </p>
      )}
    </div>
  );
}
