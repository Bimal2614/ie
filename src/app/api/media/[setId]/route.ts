import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { questionSets } from "@/db/schema";
import { getCurrentUser } from "@/lib/dal";
import { streamProtectedAudio } from "@/lib/protected-media";
import { guardMedia, RateLimitError } from "@/lib/security/rate-guard";

/**
 * Auth-gated listening audio for a `question_sets` row.
 *
 * `<audio src="/api/media/[setId]">` hits this; we verify the session, rate
 * limit, and stream the recording back through this route — the browser never
 * learns where the file actually lives, and there is no URL it could keep.
 *
 * This route used to 302 to a presigned S3 URL, which was a plain https link
 * that played for anyone, anywhere, with no session, for an hour. That is a
 * download link for the exam audio, and it was one Network-panel click away.
 * The bytes now cost us egress instead; src/lib/protected-media.ts explains why
 * that is the right trade and exactly which attacks it does and does not stop.
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

export async function GET(req: Request, { params }: { params: Promise<{ setId: string }> }) {
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

  const { setId } = await params;
  if (!UUID.test(setId)) return new NextResponse("Not found", { status: 404 });

  const [set] = await db
    .select({ audioUrl: questionSets.audioUrl })
    .from(questionSets)
    .where(and(eq(questionSets.id, setId), eq(questionSets.isActive, true)))
    .limit(1);

  if (!set?.audioUrl) return new NextResponse("Not found", { status: 404 });

  return streamProtectedAudio(req, set.audioUrl);
}
