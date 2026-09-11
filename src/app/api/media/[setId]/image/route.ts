import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { questionSets } from "@/db/schema";
import { apiUser } from "@/lib/api/auth";
import { serveProtectedImage } from "@/lib/protected-media";

/**
 * Auth-gated image resolver for a set — the sibling of ../route.ts for audio.
 *
 * A set's `imageUrl` is a private `s3://bucket/key`, which no <img> can load,
 * so the element points here and we 302 to a short-lived presigned URL. Public
 * sample URLs pass through unchanged, which is what the seeded sets carry.
 *
 * Session, rate limit, id shape and the presign now live in
 * `serveProtectedImage`, shared with the practice-section and per-question
 * figures. What is left here is the only thing that differs: the lookup.
 */

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
export async function GET(req: Request, { params }: { params: Promise<{ setId: string }> }) {
  const [user, { setId }] = await Promise.all([apiUser(req), params]);

  return serveProtectedImage({
    userId: user?.id ?? null,
    uuids: [setId],
    locate: async () => {
      const [set] = await db
        .select({ imageUrl: questionSets.imageUrl })
        .from(questionSets)
        .where(and(eq(questionSets.id, setId), eq(questionSets.isActive, true)))
        .limit(1);
      return set?.imageUrl;
    },
  });
}
