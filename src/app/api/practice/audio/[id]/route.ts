import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { practiceSections } from "@/db/schema";
import { getCurrentUser } from "@/lib/dal";
import { guardGeneral, RateLimitError } from "@/lib/security/rate-guard";
import { keyFromUrl, presignGetUrl } from "@/lib/speech/s3";

/**
 * Auth-gated audio resolver for `practice_sections`, mirroring
 * /api/media/[setId] for the older `question_sets` table.
 *
 * `<audio src="/api/practice/audio/[id]">` lands here; we verify the session,
 * rate limit, and 302 to a short-lived presigned S3 URL. Bytes stream straight
 * from S3, the bucket never appears in the element, and a copied link expires.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  if (!UUID.test(id)) return new NextResponse("Not found", { status: 404 });

  const [row] = await db
    .select({ audioUrl: practiceSections.audioUrl })
    .from(practiceSections)
    .where(and(eq(practiceSections.id, id), eq(practiceSections.isActive, true)))
    .limit(1);

  if (!row?.audioUrl) return new NextResponse("Not found", { status: 404 });

  // Our-bucket objects (s3://bucket/key) get a presigned URL; anything else
  // (e.g. a public sample URL) passes through as-is.
  const key = keyFromUrl(row.audioUrl);
  const target = key
    ? await presignGetUrl(key, 3600)
    : /^https?:\/\//.test(row.audioUrl)
      ? row.audioUrl
      : null;

  if (!target) return new NextResponse("Media unavailable", { status: 404 });

  const res = NextResponse.redirect(target, 302);
  res.headers.set("Cache-Control", "private, max-age=300");
  return res;
}
