import type { Metadata } from "next";
import { and, desc, eq, gt, isNotNull, isNull, lte, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/dal";
import { toPlanKey } from "@/lib/plans";
import { VerifyStudents, type StudentRow } from "@/components/admin/verify-students";

export const metadata: Metadata = {
  title: "Verify students · IELTSVega",
  robots: { index: false, follow: false },
};

/**
 * Manual access control, standing in for the payment gateway.
 *
 * Two lists, split by the SAME rule `effectivePlan()` applies on every gate: a
 * paid tier whose expiry has passed is free, whatever the column still says.
 * Doing that split in SQL rather than filtering in JS keeps the row cap honest
 * — a page that fetched 500 accounts and then discarded the paid ones would
 * silently show fewer than 500 students awaiting access.
 */
const LIST_LIMIT = 500;

const columns = {
  id: users.id,
  name: users.name,
  email: users.email,
  phone: users.phone,
  plan: users.plan,
  planExpiresAt: users.planExpiresAt,
  emailVerified: users.emailVerified,
  deactivatedAt: users.deactivatedAt,
  createdAt: users.createdAt,
  lastLoginAt: users.lastLoginAt,
};

type Row = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: string;
  planExpiresAt: Date | null;
  emailVerified: boolean;
  deactivatedAt: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
};

const date = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function loadFree(now: Date) {
  // Free outright, or on a tier whose paid window has already closed.
  return db
    .select(columns)
    .from(users)
    .where(
      and(
        ne(users.role, "admin"),
        or(
          eq(users.plan, "free"),
          and(isNotNull(users.planExpiresAt), lte(users.planExpiresAt, now)),
        ),
      ),
    )
    .orderBy(desc(users.createdAt))
    .limit(LIST_LIMIT);
}

function loadVerified(now: Date) {
  // A paid tier that either never lapses (NULL expiry) or has time left.
  return db
    .select(columns)
    .from(users)
    .where(
      and(
        ne(users.role, "admin"),
        ne(users.plan, "free"),
        or(isNull(users.planExpiresAt), gt(users.planExpiresAt, now)),
      ),
    )
    .orderBy(desc(users.planExpiresAt))
    .limit(LIST_LIMIT);
}

/**
 * Dates are formatted here, not in the browser: the row list is rendered on the
 * server and hydrated on the client, and a `toLocaleDateString` that reads the
 * viewer's timezone would produce two different strings and a hydration error.
 */
function toRow(u: Row): StudentRow {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    plan: toPlanKey(u.plan),
    expiresLabel: u.planExpiresAt ? date(u.planExpiresAt) : null,
    joinedLabel: date(u.createdAt),
    lastSeenLabel: u.lastLoginAt ? date(u.lastLoginAt) : null,
    emailVerified: u.emailVerified,
    disabled: Boolean(u.deactivatedAt),
  };
}

export default async function VerifyStudentsPage() {
  await requireAdmin();

  const now = new Date();
  const [free, verified] = await Promise.all([loadFree(now), loadVerified(now)]);

  return (
    <VerifyStudents
      free={free.map(toRow)}
      verified={verified.map(toRow)}
      capped={free.length >= LIST_LIMIT || verified.length >= LIST_LIMIT}
      limit={LIST_LIMIT}
    />
  );
}
