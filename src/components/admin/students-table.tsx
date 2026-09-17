"use client";

import Link from "next/link";

import { StudentControls } from "@/components/admin/student-controls";
import { ListControls, Pager } from "@/components/ui/list-controls";
import type { AdminStudentFilter, AdminStudentRequest, AdminStudentSort } from "@/lib/admin";
import type { Page } from "@/lib/pagination";
import { PLANS, type PlanKey } from "@/lib/plans";

/**
 * Every candidate, and the manual grant that stands in for a checkout.
 *
 * This is /verify-students, moved into the console and paged. The two screens
 * it replaces loaded five hundred rows each and filtered them in the browser;
 * the tabs here are a SQL predicate, so "free" and "on a plan" stay accurate at
 * any size and a search finds a student who is not on the current page.
 */

export type AdminStudentDisplay = {
  id: string;
  name: string;
  email: string;
  plan: PlanKey;
  expiresLabel: string | null;
  joinedLabel: string;
  lastSeenLabel: string | null;
  partnerName: string | null;
  disabled: boolean;
};

const FILTERS: ReadonlyArray<{ key: AdminStudentFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "free", label: "Free" },
  { key: "paid", label: "On a plan" },
  { key: "partner", label: "Partner students" },
];

const SORTS: ReadonlyArray<{ key: AdminStudentSort; label: string }> = [
  { key: "joined", label: "Joined" },
  { key: "name", label: "Name" },
  { key: "lastSeen", label: "Last sign-in" },
  { key: "expires", label: "Plan ends" },
];

export function StudentsTable({
  page,
  req,
}: {
  page: Page<AdminStudentDisplay>;
  req: AdminStudentRequest;
}) {
  return (
    <>
      <ListControls
        basePath="/admin/students"
        req={req}
        filters={FILTERS}
        sorts={SORTS}
        placeholder="Search by name or email"
      />

      {page.rows.length === 0 ? (
        <p className="p-10 text-center text-sm text-ink-muted">No students match that.</p>
      ) : (
        <ul className="divide-y divide-line">
          {page.rows.map((s) => (
            <Row key={s.id} student={s} />
          ))}
        </ul>
      )}

      <Pager basePath="/admin/students" req={req} page={page} noun="student" />
    </>
  );
}

function Row({ student }: { student: AdminStudentDisplay }) {
  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* The whole record — progress, sittings, what they were charged. */}
          <Link
            href={`/admin/students/${student.id}`}
            className="truncate font-medium text-ink hover:text-brand hover:underline"
          >
            {student.name}
          </Link>
          {student.plan !== "free" ? (
            <span className="rounded-full bg-green-soft px-2 py-0.5 text-[11px] font-semibold text-green-ink">
              {PLANS[student.plan].label}
              {student.expiresLabel ? ` · to ${student.expiresLabel}` : ""}
            </span>
          ) : (
            <span className="rounded-full bg-paper-sunken px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
              Free
            </span>
          )}
          {student.partnerName && (
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
              {student.partnerName}
            </span>
          )}
          {student.disabled && (
            <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
              Disabled
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {student.email} · joined {student.joinedLabel}
          {student.lastSeenLabel ? ` · last seen ${student.lastSeenLabel}` : " · never signed in"}
        </p>
      </div>

      <StudentControls
        studentId={student.id}
        name={student.name}
        plan={student.plan}
        disabled={student.disabled}
        className="shrink-0 sm:items-end"
      />
    </li>
  );
}
