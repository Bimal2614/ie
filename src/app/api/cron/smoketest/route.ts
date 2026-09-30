import { NextResponse } from "next/server";
import { adminEmails, isEmailConfigured } from "@/lib/env";
import { sendEmail } from "@/lib/email/mailer";
import { isAuthorizedCron } from "@/lib/security/cron-auth";
import { smokeTestEmail } from "@/lib/monitoring/smoketest-email";
import { runSmokeTest } from "@/lib/monitoring/smoketest";
import { alert } from "@/lib/monitoring/alert";

/**
 * The AI smoke test: does band scoring still work?
 *
 * WHY THIS EXISTS. Everything downstream of a submitted answer is deliberately
 * non-throwing — a provider outage leaves a null band and a console line, and
 * the candidate is shown "not scored yet". That is the right behaviour for one
 * answer and a terrible property for a business: a rotated key or a retired
 * model can take Speaking or Writing out for a day and produce no alert at all,
 * only a slow trickle of support mail. This is the thing that notices.
 *
 * It re-submits real past answers (see smoketest-fixtures.ts) through the same
 * clients scoring uses, and asserts three things per check: the provider
 * answered 200, it came back with an overall band above the floor, and how long
 * it took. Then it mails the report to ADMIN_EMAILS. Nothing is written to the
 * database — not the run, not the result. The mail is the record.
 *
 * ONCE A DAY, OVER EVERY FIXTURE. Each check is a paid provider call, so the
 * schedule in vercel.json is what decides the bill: eleven answers a day is
 * roughly 330 calls a month, and the run is the same run every time, which is
 * what makes two mornings' reports worth comparing. The trade is that an outage
 * starting just after a run has a day to go unnoticed — if that ever costs more
 * than the calls would, tighten the schedule, not the catalogue.
 *
 * Query parameters, for running it by hand:
 *   ?email=failures     mail only when something failed
 *   ?email=never        mail nothing; read the JSON response instead
 *   ?expect=<sha>       run only if this deployment was built from that commit;
 *                       409 otherwise (see .github/workflows/post-deploy-smoketest.yml)
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/**
 * Room for the slowest honest run: eleven checks three-at-a-time, where the Part
 * 2 long turn alone can take the better part of a minute and the speaking client
 * waits up to 120s before giving up on a hung connection. A healthy run is about
 * a minute; this is the ceiling for a bad day, not the expectation.
 */
export const maxDuration = 300;

type EmailMode = "always" | "failures" | "never";

function emailMode(url: URL): EmailMode {
  const raw = url.searchParams.get("email");
  return raw === "failures" || raw === "never" ? raw : "always";
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    // 404 for the same reason the other scheduled routes answer 404: an
    // unauthenticated caller learns nothing about what is here.
    return new NextResponse(null, { status: 404 });
  }

  const url = new URL(request.url);

  // ?expect=<sha>: the post-deploy workflow asking "are you the build I just
  // pushed?". Answered before any paid check runs, so a caller that arrives
  // while the domain still points at the previous deployment pays nothing and
  // simply asks again.
  const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? null;
  const expected = url.searchParams.get("expect");
  if (expected && expected !== commit) {
    return NextResponse.json(
      { stale: true, commit, expected },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }

  const report = await runSmokeTest();
  const mail = smokeTestEmail(report);

  // One line per run, always — unlike the scoring sweep, which is silent when
  // idle. There is no such thing as an uneventful run here: the whole point is
  // to have a record that the check happened and what it saw.
  const summary = {
    ok: report.ok,
    passed: report.passed,
    failed: report.failed,
    tookMs: report.tookMs,
    checks: report.checks.map((c) => ({
      id: c.id,
      status: c.status,
      band: c.band,
      ms: c.ms,
      failure: c.failure?.kind ?? null,
    })),
  };
  if (report.ok) console.info("[cron/smoketest] passed", summary);
  else {
    console.error("[cron/smoketest] FAILED", summary);
    // Slack as well as mail: the mail is the full report, this is the page.
    const failures = report.checks.filter((c) => c.failure);
    await alert({
      source: "smoketest",
      title: `AI smoke test FAILED — ${report.failed} of ${report.checks.length} checks`,
      detail: failures
        .map((c) => `${c.id}  [${c.failure!.kind}]  HTTP ${c.status ?? "-"}  ${c.failure!.detail}`)
        .join("\n"),
      hint: "Real answers re-scored through the live clients did not come back with a band. Full report is in the admin email.",
    });
  }

  const mode = emailMode(url);
  const shouldEmail = mode === "always" || (mode === "failures" && !report.ok);
  const recipients = adminEmails();
  let emailed: { sent: boolean; reason?: string } = { sent: false, reason: "not requested" };

  if (shouldEmail) {
    if (recipients.length === 0) {
      // Not a failure of the run: the checks still happened and the result is in
      // the log and in this response. But it is worth being loud about, because
      // a probe nobody hears from is indistinguishable from one that never ran.
      console.error("[cron/smoketest] no ADMIN_EMAILS configured — report not sent");
      emailed = { sent: false, reason: "ADMIN_EMAILS is empty" };
    } else if (!isEmailConfigured()) {
      console.error("[cron/smoketest] SMTP not configured — report not sent");
      emailed = { sent: false, reason: "SMTP is not configured" };
    } else {
      // One message to all of them. They are a fixed operational list, not
      // customers, so a shared To: header is what you want — a reply reaches
      // everyone who was alerted.
      const res = await sendEmail({ to: recipients.join(", "), ...mail });
      emailed = res.ok ? { sent: true } : { sent: false, reason: res.error ?? "send failed" };
      if (!res.ok) console.error("[cron/smoketest] report email failed", res.error);
    }
  }

  // 200 even when checks failed. The status of THIS route is "did the probe
  // run", and a scheduler that retries a non-2xx would re-run every paid check
  // on the very day the providers are already struggling. The verdict is in the
  // body, and in the mail. `mail` carries the report exactly as it was mailed,
  // so the post-deploy workflow can put the same report in Slack.
  return NextResponse.json(
    {
      ...report,
      commit,
      emailed,
      recipients: recipients.length,
      mail: { subject: mail.subject, text: mail.text },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Same job, for schedulers that POST. */
export const POST = GET;
