import { StudentsTable, type AdminStudentDisplay } from "@/components/admin/students-table";
import { cardClass } from "@/components/dashboard/ui";
import { ADMIN_STUDENT_DEFAULTS, adminStudents, type AdminStudentRow } from "@/lib/admin";
import { requireAdmin } from "@/lib/dal";
import { parsePageRequest, toPage } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const date = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/**
 * Dates are formatted on the server: the table is a client component, and a
 * `toLocaleDateString` reading the viewer's timezone would render one string
 * here and another there — a hydration error.
 */
function toRow(u: AdminStudentRow): AdminStudentDisplay {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    plan: u.plan,
    expiresLabel: u.planExpiresAt ? date(u.planExpiresAt) : null,
    joinedLabel: date(u.createdAt),
    lastSeenLabel: u.lastLoginAt ? date(u.lastLoginAt) : null,
    partnerName: u.partnerName,
    disabled: Boolean(u.deactivatedAt),
  };
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const req = parsePageRequest(await searchParams, ADMIN_STUDENT_DEFAULTS);
  const page = await adminStudents(req);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-2xl text-ink">Students</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every candidate. Granting a plan here is the manual path — a payment made off-platform, a
          support credit, a class we invoiced directly.
        </p>
      </div>

      <section className={cn(cardClass, "overflow-hidden")}>
        <StudentsTable page={toPage(page.rows.map(toRow), page.total, req)} req={req} />
      </section>
    </div>
  );
}
