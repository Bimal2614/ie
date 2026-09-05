import { NextResponse } from "next/server";
import { adminEmails, isEmailConfigured } from "@/lib/env";
import { sendEmail } from "@/lib/email/mailer";
import { isAuthorizedCron } from "@/lib/security/cron-auth";
import { buildDailyReport, istDay } from "@/lib/monitoring/daily-report";
import { dailyReportEmail } from "@/lib/monitoring/daily-report-email";

/**
 * The morning business report, mailed to ADMIN_EMAILS.
 *
 * WHY THIS EXISTS. Signups land in `users`, money lands in `subscription_logs`,
 * and what is still being paid for lives in `subscriptions` — three tables, no
 * admin analytics page, and no reason for anyone to open psql before coffee.
 * So the numbers went unlooked-at, which is a bad property for a business and a
 * worse one for a business that has just started charging: a checkout that
 * quietly stopped converting looks exactly like a slow week until someone adds
 * the rows up.
 *
 * WHAT IT SENDS. Yesterday's signups and purchases (with the name, email, plan
 * and amount for each buyer), then where the book stands: total users by tier,
 * every subscription by status, and what the live subscriptions bill per month.
 * See `buildDailyReport` for how each number is defined.
 *
 * EARLY MORNING IST, ON A COMPLETE DAY. The schedule in vercel.json is
 * `30 0 * * *` — 00:30 UTC, which is 06:00 IST — and the report covers the IST
 * calendar day that has just finished. Reporting a partial day would make every
 * morning look like a collapse, and a UTC day would put the evening's sales in
 * tomorrow's mail.
 *
 * READ-ONLY. Every query is a SELECT and nothing is written, not even a record
 * that the run happened: the mail is the record. A missed morning therefore
 * costs one mail and no correctness — re-send it with `?date=`.
 *
 * Query parameters, for running it by hand:
 *   ?date=2026-09-04   report on that IST day instead of yesterday
 *   ?email=never       mail nothing; read the JSON response instead
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/**
 * Seven grouped reads over small tables, issued together. A healthy run is well
 * under a second; this is room for a cold database that has to wake up first,
 * not an expectation.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    // 404 for the same reason the other scheduled routes answer 404: an
    // unauthenticated caller learns nothing about what is here. It matters more
    // here than elsewhere — this route's body is a list of customer names and
    // email addresses.
    return new NextResponse(null, { status: 404 });
  }

  const url = new URL(request.url);
  const day = istDay({ date: url.searchParams.get("date") });
  const report = await buildDailyReport(day);

  // One line per run, always. Unlike the scoring sweep there is no such thing
  // as an uneventful run: a day with no signups and no sales is exactly the day
  // worth having a record of.
  console.info("[cron/daily-report]", {
    date: day.date,
    signups: report.signups.total,
    purchases: report.purchases.list.length,
    revenue: report.purchases.revenue,
    users: report.totals.users,
    liveSubscriptions: report.liveTotal,
    tookMs: report.tookMs,
  });

  const recipients = adminEmails();
  let emailed: { sent: boolean; reason?: string } = { sent: false, reason: "not requested" };

  if (url.searchParams.get("email") !== "never") {
    if (recipients.length === 0) {
      // Not a failure of the run: the numbers were gathered and are in the log
      // and in this response. Worth being loud about all the same — a report
      // nobody receives is indistinguishable from one that never ran.
      console.error("[cron/daily-report] no ADMIN_EMAILS configured — report not sent");
      emailed = { sent: false, reason: "ADMIN_EMAILS is empty" };
    } else if (!isEmailConfigured()) {
      console.error("[cron/daily-report] SMTP not configured — report not sent");
      emailed = { sent: false, reason: "SMTP is not configured" };
    } else {
      const mail = dailyReportEmail(report);
      // One message to all of them. They are a fixed operational list, not
      // customers, so a shared To: header is what you want — a reply reaches
      // everyone who got the morning's numbers.
      const res = await sendEmail({ to: recipients.join(", "), ...mail });
      emailed = res.ok ? { sent: true } : { sent: false, reason: res.error ?? "send failed" };
      if (!res.ok) console.error("[cron/daily-report] report email failed", res.error);
    }
  }

  return NextResponse.json(
    { ...report, emailed, recipients: recipients.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Same job, for schedulers that POST. */
export const POST = GET;
