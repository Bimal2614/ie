import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { practiceSections } from "@/db/schema";
import { apiUser } from "@/lib/api/auth";
import { serveProtectedAudio } from "@/lib/protected-media";
import type { SectionQuestions } from "@/lib/question-content";

/**
 * The same examiner clip as /api/media/prompt/[questionId], for a
 * `practice_sections` row — what section practice and the mock read from.
 *
 * Addressed by exam number because a section holds its items inside one jsonb
 * document, so there is no question uuid to point at. `user_responses` falls
 * back to (set_id, n) for this content for the same reason.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Backstop against a stalled client; each response is capped at one chunk. */
export const maxDuration = 60;

/**
 * Authenticated by SESSION COOKIE OR BEARER TOKEN.
 *
 * `apiUser` tries the `Authorization: Bearer` header first and falls back to the
 * cookie, so the website's `<audio src="...">` and the mobile app's player hit
 * the SAME url with the same gating. The alternative was a parallel set of
 * /api/v1/media routes duplicating every ownership and rate-limit rule in here,
 * which is a second place for those rules to be wrong.
 *
 * Still no CSRF exposure: these are GET reads that change nothing, and a bearer
 * token is never attached automatically by a browser.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const [user, { id, n }] = await Promise.all([apiUser(req), params]);
  const number = Number(n);

  return serveProtectedAudio(req, {
    userId: user?.id ?? null,
    uuids: [id],
    locate: async () => {
      if (!Number.isInteger(number)) return null;
      const [row] = await db
        .select({ questions: practiceSections.questions })
        .from(practiceSections)
        .where(and(eq(practiceSections.id, id), eq(practiceSections.isActive, true)))
        .limit(1);
      const doc = row?.questions as SectionQuestions | undefined;
      return doc?.groups.flatMap((g) => g.items).find((i) => i.n === number)?.promptAudioUrl;
    },
  });
}
