import { NextResponse } from "next/server";
import { isEmailConfigured } from "@/lib/env";
import { sendEmail } from "@/lib/email/mailer";
import { isAuthorizedCron } from "@/lib/security/cron-auth";
import { istDay } from "@/lib/monitoring/daily-report";
import {
  STUDENT_CONTACTS_TO,
  buildStudentContacts,
  studentContactsCsv,
  studentContactsEmail,
} from "@/lib/monitoring/student-contacts";

/**
 * The daily student contact list — name, phone and email of every student who
 * signed up directly (partner-class students excluded) — mailed to
 * hello@ieltsvega.com. See `student-contacts.ts` for who counts.
 *
 * `45 0 * * *` in vercel.json: 06:15 IST, just after the business report, on
 * the IST day that has just finished.
 *
 * Query parameters, for running it by hand:
 *   ?date=2026-09-04   list that IST day's new students instead of yesterday's
 *   ?email=never       mail nothing; returns counts only
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  // 404, like every scheduled route — and this one's mail is a list of PII.
  if (!isAuthorizedCron(request)) return new NextResponse(null, { status: 404 });

  const url = new URL(request.url);
  const day = istDay({ date: url.searchParams.get("date") });
  const report = await buildStudentContacts(day);

  console.info("[cron/student-contacts]", { date: day.date, new: report.newStudents.length, total: report.all.length });

  let emailed: { sent: boolean; reason?: string } = { sent: false, reason: "not requested" };
  if (url.searchParams.get("email") !== "never") {
    if (!isEmailConfigured()) {
      console.error("[cron/student-contacts] SMTP not configured — list not sent");
      emailed = { sent: false, reason: "SMTP is not configured" };
    } else {
      const res = await sendEmail({
        to: STUDENT_CONTACTS_TO,
        ...studentContactsEmail(report),
        attachments: [
          {
            filename: `ieltsvega-students-${day.date}.csv`,
            content: studentContactsCsv(report.all),
            contentType: "text/csv; charset=utf-8",
          },
        ],
      });
      emailed = res.ok ? { sent: true } : { sent: false, reason: res.error ?? "send failed" };
    }
  }

  // Counts only — never the contacts themselves in a response body.
  return NextResponse.json(
    { date: day.date, newStudents: report.newStudents.length, total: report.all.length, emailed },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Same job, for schedulers that POST. */
export const POST = GET;
