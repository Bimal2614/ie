import "server-only";

import { escapeHtml } from "@/lib/email/templates";
import { PLANS, formatPrice, type PlanKey } from "@/lib/plans";
import type { DailyReport, Money, Purchase, Signup } from "./daily-report";

/**
 * The daily business report, as an email — which is the only place it is kept.
 *
 * NOTHING IS STORED, exactly as with the smoke-test report: there is no runs
 * table and no dashboard, because a report that needs opening is a report that
 * does not get read. The mail IS the record, so it carries everything needed to
 * act on the morning without going and looking anything up — who paid, what
 * they paid, and what the book looks like afterwards.
 *
 * WRITTEN TO BE READ ON A PHONE, from the subject line down: the subject gives
 * the three numbers that matter, the tiles under the header repeat them, and
 * the detail is below for whoever opens it. Inline styles and plain tables —
 * this lands in mail clients, not a browser.
 *
 * Every interpolated value is escaped. Most of the text is ours, but names and
 * email addresses are candidate-supplied and go into HTML.
 */

/**
 * IST as a fixed offset, and the clock formatter that uses it.
 *
 * DUPLICATED FROM daily-report.ts on purpose, for the same reason the smoke-test
 * renderer keeps its own `formatSeconds`: this module renders a report and
 * should not have to pull in the database pool and the validated environment to
 * print a time. The only thing it takes from the gatherer is types.
 */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** "14:35" — the IST wall clock of a UTC instant. */
function istTime(at: Date): string {
  return new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(11, 16);
}

/** "Friday, 4 September 2026" for an IST date label, spelled out for the header. */
function longDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00.000Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const BRAND = "#104094";
const GREEN = "#16a34a";
const AMBER = "#b45309";
const MUTED = "#64748b";
const INK = "#0f172a";
const LINE = "#e2e8f0";

/** The bit of `origin` worth reading in a subject line. */
function shortOrigin(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
}

/** "₹7,497" / "₹7,497 + $60" / "—" when nothing came in. */
function money(amounts: Money[]): string {
  if (amounts.length === 0) return "—";
  return amounts.map((m) => formatPrice(m.cents, m.currency)).join(" + ");
}

function planLabel(plan: PlanKey): string {
  return PLANS[plan].label;
}

const KIND_LABELS: Record<Purchase["kind"], string> = {
  new: "New",
  upgrade: "Upgrade",
  downgrade: "Downgrade",
  renewal: "Renewal",
  reactivation: "Reactivated",
  payment: "Payment",
};

/** "Pro" for a first purchase, "Free → Pro" when the ledger recorded a move. */
function planMove(p: Purchase): string {
  if (!p.fromPlan || p.fromPlan === p.plan) return planLabel(p.plan);
  return `${planLabel(p.fromPlan)} → ${planLabel(p.plan)}`;
}

/** "1 renewal" / "2 renewals" — the plain-text summary lines read as prose. */
function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/** "cancel_requested" → "Cancel requested". */
function humanEvent(event: string): string {
  const spaced = event.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/* ------------------------------------------------------------------ *
 * HTML pieces
 * ------------------------------------------------------------------ */

const CELL = `padding:9px 8px;border-top:1px solid ${LINE};font-size:13px`;
const HEAD = `font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:${MUTED};padding:0 8px 6px`;

function sectionTitle(text: string): string {
  return `<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${MUTED};margin:26px 0 10px">${escapeHtml(text)}</div>`;
}

/** One of the four numbers across the top. */
function tile(label: string, value: string, colour = INK): string {
  return `<td width="25%" style="padding:0 6px" valign="top">
  <div style="background:#f8fafc;border:1px solid ${LINE};border-radius:10px;padding:12px 10px;text-align:center">
    <div style="font-size:20px;font-weight:700;color:${colour};line-height:1.2">${escapeHtml(value)}</div>
    <div style="font-size:11px;color:${MUTED};margin-top:4px;text-transform:uppercase;letter-spacing:.04em">${escapeHtml(label)}</div>
  </div>
</td>`;
}

function purchaseRow(p: Purchase): string {
  const amount = p.amountCents === null ? "—" : formatPrice(p.amountCents, p.currency);
  const tags = [
    KIND_LABELS[p.kind],
    p.provider === "manual" ? "manual" : null,
    p.comped ? "comped" : null,
  ].filter(Boolean) as string[];
  return `<tr>
  <td style="${CELL};color:${INK}">
    <strong>${escapeHtml(p.name)}</strong>
    <div style="font-size:12px;color:${MUTED};margin-top:2px">${escapeHtml(p.email)}</div>
  </td>
  <td style="${CELL};color:${INK}">
    ${escapeHtml(planMove(p))}
    <div style="font-size:11px;color:${p.comped ? AMBER : MUTED};margin-top:2px">${escapeHtml(tags.join(" · "))}</div>
  </td>
  <td style="${CELL};text-align:right;font-weight:600;color:${p.comped ? AMBER : GREEN};white-space:nowrap">${escapeHtml(amount)}</td>
  <td style="${CELL};text-align:right;color:${MUTED};white-space:nowrap">${escapeHtml(istTime(p.at))}</td>
</tr>`;
}

function signupRow(s: Signup): string {
  return `<tr>
  <td style="${CELL};color:${INK}">
    ${escapeHtml(s.name)}
    <div style="font-size:12px;color:${MUTED};margin-top:2px">${escapeHtml(s.email)}</div>
  </td>
  <td style="${CELL};text-align:right;color:${MUTED};white-space:nowrap">${escapeHtml(s.via === "google" ? "Google" : "Email")}${s.verified ? "" : " · unverified"}</td>
  <td style="${CELL};text-align:right;color:${MUTED};white-space:nowrap">${escapeHtml(istTime(s.at))}</td>
</tr>`;
}

/** A two-column "label / number" table — the standings blocks. */
function statTable(rows: { label: string; value: string; muted?: boolean }[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
  ${rows
    .map(
      (r) => `<tr>
    <td style="${CELL};color:${r.muted ? MUTED : INK}">${escapeHtml(r.label)}</td>
    <td style="${CELL};text-align:right;font-weight:600;color:${r.muted ? MUTED : INK};white-space:nowrap">${escapeHtml(r.value)}</td>
  </tr>`,
    )
    .join("")}
</table>`;
}

/* ------------------------------------------------------------------ *
 * The mail
 * ------------------------------------------------------------------ */

export function dailyReportEmail(report: DailyReport): {
  subject: string;
  html: string;
  text: string;
} {
  const host = shortOrigin(report.origin);
  const { signups, purchases, totals, day } = report;
  const paidCount = purchases.list.length - purchases.compedCount;

  // The three numbers that decide whether the mail needs opening, in the order
  // a phone notification truncates them: money last so it survives longest when
  // there is any.
  const subject =
    `Daily report ${day.date} · ${signups.total} signup${signups.total === 1 ? "" : "s"}` +
    `, ${paidCount} purchase${paidCount === 1 ? "" : "s"}` +
    (purchases.revenue.length ? ` (${money(purchases.revenue)})` : "") +
    ` · ${host}`;

  const tiles = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0"><tr>
    ${tile("Signups", String(signups.total), signups.total > 0 ? GREEN : INK)}
    ${tile("Purchases", String(paidCount), paidCount > 0 ? GREEN : INK)}
    ${tile("Revenue", money(purchases.revenue), purchases.revenue.length ? GREEN : INK)}
    ${tile("Total users", totals.users.toLocaleString("en-IN"))}
  </tr></table>`;

  const purchasesBlock = purchases.list.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <tr>
        <th align="left" style="${HEAD}">Customer</th>
        <th align="left" style="${HEAD}">Plan</th>
        <th align="right" style="${HEAD}">Amount</th>
        <th align="right" style="${HEAD}">IST</th>
      </tr>
      ${purchases.list.map(purchaseRow).join("")}
    </table>
    <p style="font-size:12px;color:${MUTED};margin:10px 0 0">
      ${purchases.newCount} new · ${plural(purchases.renewalCount, "renewal")} · ${plural(purchases.changeCount, "plan change")}${purchases.compedCount ? ` · ${plural(purchases.compedCount, "admin grant")} (not counted as revenue)` : ""}
    </p>`
    : `<p style="font-size:13px;color:${MUTED};margin:0">No purchases, renewals or plan changes on this day.</p>`;

  const hiddenSignups = signups.total - signups.list.length;
  const signupsBlock = signups.list.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <tr>
        <th align="left" style="${HEAD}">New account</th>
        <th align="right" style="${HEAD}">Via</th>
        <th align="right" style="${HEAD}">IST</th>
      </tr>
      ${signups.list.map(signupRow).join("")}
    </table>
    <p style="font-size:12px;color:${MUTED};margin:10px 0 0">
      ${signups.verified} of ${signups.total} verified their email · ${signups.viaGoogle} via Google${hiddenSignups > 0 ? ` · ${hiddenSignups} more not listed` : ""}
    </p>`
    : `<p style="font-size:13px;color:${MUTED};margin:0">No new accounts on this day.</p>`;

  const usersBlock = statTable([
    ...report.usersByPlan.map((p) => ({
      label: `${planLabel(p.plan)} users`,
      value: p.users.toLocaleString("en-IN"),
    })),
    { label: "Verified email", value: totals.verifiedUsers.toLocaleString("en-IN"), muted: true },
    { label: "Deactivated", value: totals.deactivatedUsers.toLocaleString("en-IN"), muted: true },
    { label: "Signups, last 7 days", value: totals.signups7d.toLocaleString("en-IN"), muted: true },
    {
      label: "Signups, last 30 days",
      value: totals.signups30d.toLocaleString("en-IN"),
      muted: true,
    },
  ]);

  const subsBlock = statTable([
    ...report.liveByPlan.map((p) => ({
      label: `${planLabel(p.plan)} — live`,
      value: String(p.count),
    })),
    { label: "Live subscriptions, total", value: String(report.liveTotal) },
    { label: "Monthly run rate", value: money(report.monthlyRunRate) },
    ...report.subscriptionsByStatus.map((s) => ({
      label: `${humanEvent(s.status)} · ${planLabel(s.plan)}`,
      value: String(s.count),
      muted: true,
    })),
  ]);

  const eventsBlock = report.otherEvents.length
    ? sectionTitle("Other billing activity") +
      statTable(
        report.otherEvents.map((e) => ({
          label: humanEvent(e.event),
          value: String(e.count),
          muted: e.event !== "payment_failed",
        })),
      )
    : "";

  const failed = report.otherEvents.find((e) => e.event === "payment_failed");
  const alert = failed
    ? `<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:10px;padding:12px 14px;font-size:14px;margin-bottom:18px">
        <strong>${failed.count} payment${failed.count === 1 ? "" : "s"} failed</strong> on this day — those accounts are in their grace window and will lapse if the retry does not land.
       </div>`
    : "";

  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f4;padding:24px;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:${INK}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid ${LINE};border-radius:16px;overflow:hidden">
      <tr><td style="padding:24px 28px 4px">
        <div style="font-size:18px;font-weight:700;color:${BRAND}">IELTSVega · Daily report</div>
        <div style="font-size:13px;color:${MUTED};margin-top:4px">${escapeHtml(longDate(day.date))} (IST) · ${escapeHtml(host)}</div>
      </td></tr>
      <tr><td style="padding:18px 22px 0">${tiles}</td></tr>
      <tr><td style="padding:6px 28px 0">
        ${sectionTitle("Purchases")}${alert}${purchasesBlock}
        ${sectionTitle("New signups")}${signupsBlock}
        ${sectionTitle("Users")}${usersBlock}
        ${sectionTitle("Subscriptions")}${subsBlock}
        ${eventsBlock}
      </td></tr>
      <tr><td style="padding:24px 28px 26px">
        <hr style="border:none;border-top:1px solid ${LINE};margin:0 0 14px">
        <p style="font-size:12px;color:${MUTED};margin:0 0 6px">
          The day runs midnight to midnight IST. Revenue counts what was actually charged and excludes admin grants.
          User tiers are the tier each account can use right now, so a lapsed subscription reads as Free.
          Monthly run rate divides each live subscription by the months it bills for, so Premium's quarterly price is not counted three times.
        </p>
        <p style="font-size:12px;color:${MUTED};margin:0">Generated ${escapeHtml(new Date(report.generatedAt).toUTCString())} in ${escapeHtml(String(report.tookMs))}ms.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  /* --- The same report, for a client that will not render HTML --- */

  const lines: string[] = [
    `IELTSVega · Daily report — ${longDate(day.date)} (IST)`,
    host,
    "",
    `Signups        ${signups.total}`,
    `Purchases      ${paidCount}`,
    `Revenue        ${money(purchases.revenue)}`,
    `Total users    ${totals.users}`,
    "",
    "PURCHASES",
  ];

  if (purchases.list.length) {
    for (const p of purchases.list) {
      const amount = p.amountCents === null ? "—" : formatPrice(p.amountCents, p.currency);
      const tags = [KIND_LABELS[p.kind], p.provider === "manual" ? "manual" : null, p.comped ? "comped" : null]
        .filter(Boolean)
        .join(" · ");
      lines.push(`  ${istTime(p.at)}  ${p.name} <${p.email}> — ${planMove(p)}, ${amount} [${tags}]`);
    }
    lines.push(
      "  " +
        [
          `${purchases.newCount} new`,
          plural(purchases.renewalCount, "renewal"),
          plural(purchases.changeCount, "plan change"),
          plural(purchases.compedCount, "admin grant"),
        ].join(", "),
    );
  } else {
    lines.push("  none");
  }

  lines.push("", "NEW SIGNUPS");
  if (signups.list.length) {
    for (const s of signups.list) {
      lines.push(
        `  ${istTime(s.at)}  ${s.name} <${s.email}> — ${s.via === "google" ? "Google" : "Email"}${s.verified ? "" : ", unverified"}`,
      );
    }
    lines.push(
      `  ${signups.verified}/${signups.total} verified, ${signups.viaGoogle} via Google${hiddenSignups > 0 ? `, ${hiddenSignups} more not listed` : ""}`,
    );
  } else {
    lines.push("  none");
  }

  lines.push("", "USERS");
  for (const p of report.usersByPlan) lines.push(`  ${planLabel(p.plan).padEnd(9)} ${p.users}`);
  lines.push(`  verified  ${totals.verifiedUsers}`);
  lines.push(`  deactivated ${totals.deactivatedUsers}`);
  lines.push(`  signups 7d/30d: ${totals.signups7d} / ${totals.signups30d}`);

  lines.push("", "SUBSCRIPTIONS");
  for (const p of report.liveByPlan) lines.push(`  live ${planLabel(p.plan).padEnd(9)} ${p.count}`);
  lines.push(`  live total ${report.liveTotal}`);
  lines.push(`  monthly run rate ${money(report.monthlyRunRate)}`);
  for (const s of report.subscriptionsByStatus) {
    lines.push(`  ${s.status.padEnd(11)} ${planLabel(s.plan).padEnd(9)} ${s.count}`);
  }

  if (report.otherEvents.length) {
    lines.push("", "OTHER BILLING ACTIVITY");
    for (const e of report.otherEvents) lines.push(`  ${humanEvent(e.event).padEnd(18)} ${e.count}`);
  }

  lines.push(
    "",
    "The day runs midnight to midnight IST. Revenue excludes admin grants.",
    "User tiers are what each account can use right now, so a lapsed subscription reads as Free.",
  );

  return { subject, html, text: lines.join("\n") };
}
