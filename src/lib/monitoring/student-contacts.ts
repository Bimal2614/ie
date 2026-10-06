import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { escapeHtml } from "@/lib/email/templates";
import type { IstDay } from "./daily-report";

/**
 * The daily student contact list, mailed to the team inbox.
 *
 * DIRECT STUDENTS ONLY. A student a partner class enrolled is that class's
 * candidate, not a lead of ours, so every row carrying `partner_id` is left out
 * — and so is the class's own login, which is role `partner`, and every admin.
 * What is left is `role = 'user' AND partner_id IS NULL`: the people who found
 * us and signed up on their own.
 *
 * The body lists yesterday's new direct students (the ones worth a call
 * today), with the running total of direct students in the subject. No
 * attachment: the full list is not mailed out.
 *
 * READ-ONLY, like the business report next door: the mail is the record.
 */

/** Who gets it. Named people, not ADMIN_EMAILS — this is a sales list. */
export const STUDENT_CONTACTS_TO = [
  "hello@ieltsvega.com",
  "gautam.orphic@gmail.com",
  "rakeshsuhagiya1994@gmail.com",
  "hiren_kuvadiya@yahoo.com",
].join(", ");

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export type StudentContact = {
  name: string;
  email: string;
  phone: string | null;
  createdAt: Date;
};

export type StudentContacts = {
  date: string;
  /** Direct students who signed up on `date` (IST), oldest first. */
  newStudents: StudentContact[];
  /** Every direct student, newest first. */
  all: StudentContact[];
};

export async function buildStudentContacts(day: IstDay): Promise<StudentContacts> {
  const rows = (await db.execute(sql`
    SELECT name, email, phone, created_at
    FROM users
    WHERE role = 'user' AND partner_id IS NULL
    ORDER BY created_at DESC
  `)) as unknown as Array<{ name: string; email: string; phone: string | null; created_at: Date | string }>;

  const all = rows.map((r) => ({
    name: r.name,
    email: r.email,
    phone: r.phone,
    createdAt: new Date(r.created_at),
  }));
  const newStudents = all
    .filter((s) => s.createdAt >= day.from && s.createdAt < day.to)
    .reverse();

  return { date: day.date, newStudents, all };
}

/** "2026-09-04 14:35" in IST. */
function istStamp(at: Date): string {
  return new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16).replace("T", " ");
}

export function studentContactsEmail(r: StudentContacts): { subject: string; html: string; text: string } {
  const n = r.newStudents.length;
  const subject = `Student contacts ${r.date}: ${n} new, ${r.all.length} total`;

  const cell = "padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a";
  const head = "padding:6px 10px;border-bottom:2px solid #104094;font-size:12px;color:#64748b;text-align:left";
  const table =
    n === 0
      ? `<p style="color:#64748b;font-size:14px">No new direct students signed up on ${escapeHtml(r.date)}.</p>`
      : `<table style="border-collapse:collapse;width:100%">
          <tr><th style="${head}">Name</th><th style="${head}">Phone</th><th style="${head}">Email</th><th style="${head}">Signed up</th></tr>
          ${r.newStudents
            .map(
              (s) =>
                `<tr><td style="${cell}">${escapeHtml(s.name)}</td><td style="${cell}">${escapeHtml(s.phone ?? "—")}</td>` +
                `<td style="${cell}">${escapeHtml(s.email)}</td><td style="${cell}">${istStamp(s.createdAt).slice(11)}</td></tr>`,
            )
            .join("")}
        </table>`;

  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:680px">
    <h2 style="color:#104094;margin:0 0 4px">Student contacts — ${escapeHtml(r.date)}</h2>
    <p style="color:#64748b;font-size:13px;margin:0 0 16px">Direct sign-ups only; students enrolled by partner classes are excluded.</p>
    <h3 style="font-size:15px;margin:0 0 8px">${n} new yesterday</h3>
    ${table}
    <p style="color:#64748b;font-size:13px;margin-top:16px">${r.all.length} direct students in total.</p>
  </div>`;

  const text = [
    `Student contacts — ${r.date}`,
    "Direct sign-ups only; students enrolled by partner classes are excluded.",
    "",
    `${n} new yesterday:`,
    ...(n === 0
      ? ["(none)"]
      : r.newStudents.map((s) => `- ${s.name} | ${s.phone ?? "no phone"} | ${s.email} | ${istStamp(s.createdAt)}`)),
    "",
    `${r.all.length} direct students in total.`,
  ].join("\n");

  return { subject, html, text };
}
