import Link from "next/link";
import { BadgeIndianRupee, GraduationCap, LogIn, UserPlus, Users } from "lucide-react";

import { Roster, type RosterStudent } from "@/components/partner/roster";
import { StatTile } from "@/components/dashboard/ui";
import { RateCard } from "@/components/partner/plan-picker";
import { parsePageRequest, toPage } from "@/lib/pagination";
import { quotesFor } from "@/lib/partner-pricing";
import { DEFAULT_CURRENCY } from "@/lib/plans";
import {
  partnerContext,
  partnerOverview,
  partnerStudents,
  STUDENT_LIST_DEFAULTS,
  type PartnerStudent,
} from "@/lib/partners";

/**
 * The class's home: what it has bought, and what its students are doing with it.
 *
 * THE TILES AND THE TABLE ARE NOW TWO QUERIES, deliberately. The tiles count
 * the whole class; the table shows one page of it. Deriving the tiles from the
 * loaded rows — which is what this did while the roster was capped — would tell
 * a class of six hundred that it has fifty students.
 */

const date = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/**
 * Dates are formatted HERE, on the server. The table is a client component, and
 * a `toLocaleDateString` reading the viewer's timezone would render one string
 * on the server and another in the browser — a hydration error.
 */
function toRow(s: PartnerStudent): RosterStudent {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    plan: s.plan,
    expiresLabel: s.planExpiresAt ? date(s.planExpiresAt) : null,
    lastActiveLabel: s.lastActiveAt ? date(s.lastActiveAt) : null,
    everSignedIn: Boolean(s.lastLoginAt),
    attempts: s.attempts,
    avgBand: s.avgBand,
    mocks: s.mocks,
    paymentStatus: s.payment?.status ?? null,
  };
}

export default async function PartnerHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { partner, rate } = await partnerContext();
  const req = parsePageRequest(await searchParams, STUDENT_LIST_DEFAULTS);
  // Priced once, on the server, and handed to every picker on the page.
  const quotes = quotesFor(DEFAULT_CURRENCY, rate);

  const [students, overview] = await Promise.all([
    partnerStudents(partner.id, req),
    partnerOverview(partner.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-2xl text-ink">{partner.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {partner.location ? `${partner.location} · ` : ""}
            {overview.students === 0
              ? "No students yet"
              : `${overview.students} student${overview.students === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link
          href="/partner/students/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-hover"
        >
          <UserPlus className="size-4" /> Enrol a student
        </Link>
      </div>

      <RateCard quotes={quotes} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Students"
          value={overview.students}
          sub="Enrolled by your class"
          icon={<Users className="size-3.5" />}
        />
        <StatTile
          label="On a plan"
          value={overview.paid}
          sub={
            overview.expiringSoon > 0
              ? `${overview.expiringSoon} lapsing within a fortnight`
              : "None lapsing soon"
          }
          icon={<BadgeIndianRupee className="size-3.5" />}
        />
        <StatTile
          label="Awaiting payment"
          value={overview.awaitingPayment}
          sub="Enrolled, not yet paid for"
          icon={<GraduationCap className="size-3.5" />}
        />
        <StatTile
          label="Never signed in"
          value={overview.neverSignedIn}
          sub="Credentials not used yet"
          icon={<LogIn className="size-3.5" />}
        />
      </div>

      <Roster
        page={toPage(students.rows.map(toRow), students.total, req)}
        req={req}
        quotes={quotes}
        canPay={partner.status === "active"}
      />
    </div>
  );
}
