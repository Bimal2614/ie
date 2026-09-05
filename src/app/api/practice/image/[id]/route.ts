import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { practiceSections } from "@/db/schema";
import { getCurrentUser } from "@/lib/dal";
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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([getCurrentUser(), params]);

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
