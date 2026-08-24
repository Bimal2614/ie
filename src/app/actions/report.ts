"use server";

import { requireUser } from "@/lib/dal";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { getRequestContext } from "@/lib/session";
import { rateLimit } from "@/lib/security/rate-limit";

/**
 * Report a problem with a question (wrong key, typo, media issue). Recorded to
 * the audit log — queryable for triage, no dedicated table needed for v1.
 */
const REASONS = ["wrong_answer", "typo_unclear", "media_problem", "other"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function reportQuestion(input: {
  questionId: string;
  reason: string;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();

  const questionId = String(input.questionId ?? "");
  if (!UUID.test(questionId)) return { ok: false, error: "Invalid question." };

  const reason = (REASONS as readonly string[]).includes(input.reason) ? input.reason : "other";
  const note = String(input.note ?? "").trim().slice(0, 1000);

  const limit = await rateLimit(`report:${user.id}`, 20, 60 * 60);
  if (!limit.allowed) return { ok: false, error: "You've reported a lot recently: please try again later." };

  const { ip, userAgent } = await getRequestContext();
  await db.insert(auditLog).values({
    userId: user.id,
    event: "question.reported",
    ipAddress: ip,
    userAgent,
    metadata: { questionId, reason, note },
  });

  return { ok: true };
}
