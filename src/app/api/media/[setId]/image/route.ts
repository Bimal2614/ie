import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { questionSets } from "@/db/schema";
import { getCurrentUser } from "@/lib/dal";
import { guardGeneral, RateLimitError } from "@/lib/security/rate-guard";
import { keyFromUrl, presignGetUrl } from "@/lib/speech/s3";

/**
 * Auth-gated image resolver for a set — the sibling of ../route.ts for audio.
 *
 * A set's `imageUrl` is a private `s3://bucket/key`, which no <img> can load,
 * so the element points here and we 302 to a short-lived presigned URL. Public
 * sample URLs pass through unchanged, which is what the seeded sets carry.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ setId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  try {
    await guardGeneral(user.id);
  } catch (e) {
    if (e instanceof RateLimitError) {
      return new NextResponse("Too many requests — slow down.", { status: 429 });
    }
    throw e;
  }

  const { setId } = await params;
  if (!UUID.test(setId)) return new NextResponse("Not found", { status: 404 });

  const [set] = await db
    .select({ imageUrl: questionSets.imageUrl })
    .from(questionSets)
    .where(and(eq(questionSets.id, setId), eq(questionSets.isActive, true)))
    .limit(1);

  if (!set?.imageUrl) return new NextResponse("Not found", { status: 404 });

  const key = keyFromUrl(set.imageUrl);
  const target = key
    ? await presignGetUrl(key, 3600)
    : /^https?:\/\//.test(set.imageUrl)
      ? set.imageUrl
      : null;

  if (!target) return new NextResponse("Media unavailable", { status: 404 });

  const res = NextResponse.redirect(target, 302);
  res.headers.set("Cache-Control", "private, max-age=300");
  return res;
}
