import "server-only";

import { escapeHtml } from "@/lib/email/templates";
import type { SmokeCheck, SmokeReport } from "./smoketest";

/**
 * The smoke-test report, as an email — which is the only place it is kept.
 *
 * NOTHING IS STORED. There is no runs table and no dashboard: a probe that
 * writes its own history needs that history read, and an operational check
 * nobody opens is a check nobody has. The mail IS the record, so it has to carry
 * everything an operator needs to act without going and looking something up —
 * per-check status code, band, timing, and the exact provider complaint.
 *
 * WRITTEN TO BE READ ON A PHONE, from the subject line down: the subject says
 * pass or fail and where, the first line says which checks failed, and the
 * detail is underneath for whoever opens it. Inline styles only and a plain
 * table — this lands in mail clients, not a browser.
 *
 * Every interpolated value is escaped. Most of the text is ours, but the failure
 * details are provider error bodies, which are arbitrary strings.
 */

/**
 * Round a duration for display without pretending to sub-millisecond precision.
 *
 * Kept here rather than imported from the probe: this module renders a report,
 * and it should not have to load the provider clients and the whole validated
 * environment to do it. The only thing it takes from smoketest.ts is types.
 */
function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

const BRAND = "#104094";
const GREEN = "#16a34a";
const RED = "#dc2626";
const AMBER = "#b45309";
const MUTED = "#64748b";
const LINE = "#e2e8f0";

/** The bit of `origin` worth reading in a subject line. */
function shortOrigin(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
}

function statusCell(check: SmokeCheck): string {
  if (check.status === null) return "—";
  return String(check.status);
}

function bandCell(check: SmokeCheck): string {
  return check.band === null ? "—" : check.band.toFixed(1);
}

function verdict(check: SmokeCheck): { text: string; colour: string } {
  if (!check.ok) return { text: "FAIL", colour: RED };
  if (check.slow) return { text: "PASS (slow)", colour: AMBER };
  return { text: "PASS", colour: GREEN };
}

function row(check: SmokeCheck): string {
  const v = verdict(check);
  const detail = check.failure
    ? `<div style="font-size:12px;color:${RED};margin-top:4px">${escapeHtml(check.failure.kind)}: ${escapeHtml(check.failure.detail)}</div>`
    : "";
  return `<tr>
  <td style="padding:10px 8px;border-top:1px solid ${LINE};font-size:13px;color:#0f172a">
    ${escapeHtml(check.label)}${detail}
  </td>
  <td style="padding:10px 8px;border-top:1px solid ${LINE};font-size:13px;text-align:center;color:${MUTED}">${escapeHtml(statusCell(check))}</td>
  <td style="padding:10px 8px;border-top:1px solid ${LINE};font-size:13px;text-align:center;font-weight:600;color:#0f172a">${escapeHtml(bandCell(check))}</td>
  <td style="padding:10px 8px;border-top:1px solid ${LINE};font-size:13px;text-align:right;color:${check.slow ? AMBER : MUTED}">${escapeHtml(formatSeconds(check.ms))}</td>
  <td style="padding:10px 8px;border-top:1px solid ${LINE};font-size:12px;text-align:right;font-weight:700;color:${v.colour}">${escapeHtml(v.text)}</td>
</tr>`;
}

/** "3 configured · S3 configured · SMTP configured", or what is missing. */
function configLine(report: SmokeReport): string {
  const c = report.config;
  const bits = [
    `Speaking API ${c.speaking ? "configured" : "NOT configured"}`,
    `OpenAI ${c.writing ? "configured" : "NOT configured"}`,
    `S3 ${c.s3 ? "configured" : "NOT configured"}`,
    `${c.recipients} alert recipient${c.recipients === 1 ? "" : "s"}`,
  ];
  return bits.join(" · ");
}

export function smokeTestEmail(report: SmokeReport): {
  subject: string;
  html: string;
  text: string;
} {
  const host = shortOrigin(report.origin);
  const total = report.checks.length;
  const headline = report.ok
    ? `All ${total} checks passed`
    : `${report.failed} of ${total} checks FAILED`;
  // The status goes first so it survives a truncated notification, and the host
  // is in there so a staging alert is never mistaken for a production one.
  const subject = report.ok
    ? `✅ AI smoke test passed (${report.passed}/${total}) · ${host}`
    : `🚨 AI smoke test FAILED (${report.failed}/${total}) · ${host}`;

  const failed = report.checks.filter((c) => !c.ok);
  const slow = report.checks.filter((c) => c.ok && c.slow);

  const banner = report.ok
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;border-radius:10px;padding:12px 14px;font-size:14px">
        Speaking and Writing scoring both answered, and every band was above ${report.minBand}.
       </div>`
    : `<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:10px;padding:12px 14px;font-size:14px">
        <strong>${escapeHtml(headline)}.</strong><br>${failed
          .map((c) => escapeHtml(`${c.label} — ${c.failure?.kind ?? "failed"}`))
          .join("<br>")}
       </div>`;

  const slowNote = slow.length
    ? `<p style="font-size:13px;color:${AMBER};margin:14px 0 0">${slow.length} check${slow.length === 1 ? " was" : "s were"} slower than expected but still scored — worth watching if it repeats.</p>`
    : "";

  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f4;padding:24px;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid ${LINE};border-radius:16px;overflow:hidden">
      <tr><td style="padding:24px 28px 4px">
        <div style="font-size:18px;font-weight:700;color:${BRAND}">IELTSVega · AI smoke test</div>
        <div style="font-size:13px;color:${MUTED};margin-top:4px">${escapeHtml(host)} · ${escapeHtml(new Date(report.startedAt).toUTCString())} · run took ${escapeHtml(formatSeconds(report.tookMs))}</div>
      </td></tr>
      <tr><td style="padding:16px 28px 0">${banner}${slowNote}</td></tr>
      <tr><td style="padding:18px 28px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
          <tr>
            <th align="left" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:${MUTED};padding:0 8px 6px">Check</th>
            <th align="center" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:${MUTED};padding:0 8px 6px">HTTP</th>
            <th align="center" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:${MUTED};padding:0 8px 6px">Band</th>
            <th align="right" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:${MUTED};padding:0 8px 6px">Time</th>
            <th align="right" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:${MUTED};padding:0 8px 6px">Result</th>
          </tr>
          ${report.checks.map(row).join("")}
        </table>
      </td></tr>
      <tr><td style="padding:20px 28px 26px">
        <hr style="border:none;border-top:1px solid ${LINE};margin:0 0 14px">
        <p style="font-size:12px;color:${MUTED};margin:0 0 6px">
          Pass = HTTP 200 from the provider and an overall band above ${report.minBand}.
          Real past answers are re-submitted through the same clients scoring uses; nothing is saved and no candidate's quota is spent.
        </p>
        <p style="font-size:12px;color:${MUTED};margin:0">${escapeHtml(configLine(report))}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const lines = [
    `IELTSVega · AI smoke test — ${headline}`,
    `${host} · ${new Date(report.startedAt).toUTCString()} · run took ${formatSeconds(report.tookMs)}`,
    "",
    ...report.checks.map((c) => {
      const v = verdict(c);
      const tail = c.failure ? `  [${c.failure.kind}: ${c.failure.detail}]` : "";
      return `${v.text.padEnd(11)} ${c.label} — HTTP ${statusCell(c)}, band ${bandCell(c)}, ${formatSeconds(c.ms)}${tail}`;
    }),
    "",
    `Pass = HTTP 200 and an overall band above ${report.minBand}.`,
    configLine(report),
  ];

  return { subject, html, text: lines.join("\n") };
}
