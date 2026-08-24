import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { questionSets } from "@/db/schema";
import { getCurrentUser } from "@/lib/dal";
import { guardGeneral, RateLimitError } from "@/lib/security/rate-guard";
import { keyFromUrl, presignGetUrl } from "@/lib/speech/s3";

/**
 * Auth-gated media resolver. `<audio src="/api/media/[setId]">` hits this; we
 * verify the session + rate limit, look up the set's stored audio, and 302 to a
 * SHORT-LIVED presigned S3 URL. The browser streams bytes straight from S3
 * (zero server bandwidth), the bucket is never exposed in the element, and any
 * copied link expires. Public sample URLs (not in our bucket) pass through.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ setId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  try {
    await guardGeneral(user.id);
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

  // Our-bucket objects (s3://bucket/key) get a presigned URL; anything else
  // (e.g. a public sample URL) passes through as-is.
  const key = keyFromUrl(set.audioUrl);
  const target = key ? await presignGetUrl(key, 3600) : /^https?:\/\//.test(set.audioUrl) ? set.audioUrl : null;

  if (!target) return new NextResponse("Media unavailable", { status: 404 });

  const res = NextResponse.redirect(target, 302);
  // Let the browser reuse the redirect briefly (fewer re-auths on seek) while
  // staying well inside the 1-hour signature lifetime.
  res.headers.set("Cache-Control", "private, max-age=300");
  return res;
}
