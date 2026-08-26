import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { practiceSections } from "@/db/schema";
import { getCurrentUser } from "@/lib/dal";
import { streamProtectedAudio } from "@/lib/protected-media";
import { guardMedia, RateLimitError } from "@/lib/security/rate-guard";

/**
 * Auth-gated listening audio for `practice_sections`, mirroring
 * /api/media/[setId] for the older `question_sets` table.
 *
 * `<audio src="/api/practice/audio/[id]">` lands here; we verify the session,
 * rate limit, and stream the bytes back through this route. NOTHING is
 * redirected: a presigned S3 URL would be a working, sessionless, shareable
 * download link for the recording. See src/lib/protected-media.ts for what that
 * buys and what it costs.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * A ceiling every hosting plan allows. Each response is capped at one chunk, so
 * this is a backstop against a stalled client rather than a budget the normal
 * path spends — an exam must never lose its recording to a platform timeout.
 */
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  try {
    await guardMedia(user.id);
  } catch (e) {
    if (e instanceof RateLimitError) {
      return new NextResponse("Too many requests: slow down.", { status: 429 });
    }
    throw e;
  }

  const { id } = await params;
  if (!UUID.test(id)) return new NextResponse("Not found", { status: 404 });

  const [row] = await db
    .select({ audioUrl: practiceSections.audioUrl })
    .from(practiceSections)
    .where(and(eq(practiceSections.id, id), eq(practiceSections.isActive, true)))
    .limit(1);

  if (!row?.audioUrl) return new NextResponse("Not found", { status: 404 });

  return streamProtectedAudio(req, row.audioUrl);
}
