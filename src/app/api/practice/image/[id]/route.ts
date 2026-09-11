import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { practiceSections } from "@/db/schema";
import { apiUser } from "@/lib/api/auth";
import { serveProtectedImage } from "@/lib/protected-media";

/**
 * Auth-gated image resolver for `practice_sections` — maps and diagrams for
 * listening labelling, and the chart or plan a Writing Task 1 describes.
 *
 * `<img src="/api/practice/image/[id]">` lands here; the session is verified
 * and rate limited, then we 302 to a short-lived presigned S3 URL. The bucket
 * never appears in the element, and a copied link expires.
 *
 * All of that is `serveProtectedImage`, shared with the set and per-question
 * figure routes; the lookup below is the only part that is this route's own.
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
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([apiUser(req), params]);

  return serveProtectedImage({
    userId: user?.id ?? null,
    uuids: [id],
    locate: async () => {
      const [row] = await db
        .select({ imageUrl: practiceSections.imageUrl })
        .from(practiceSections)
        .where(and(eq(practiceSections.id, id), eq(practiceSections.isActive, true)))
        .limit(1);
      return row?.imageUrl;
    },
  });
}
