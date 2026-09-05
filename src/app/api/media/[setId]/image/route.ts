import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { questionSets } from "@/db/schema";
import { getCurrentUser } from "@/lib/dal";
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

export async function GET(_req: Request, { params }: { params: Promise<{ setId: string }> }) {
  const [user, { setId }] = await Promise.all([getCurrentUser(), params]);

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
