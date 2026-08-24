import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { mockTestAnswers, mockTestSessions, userResponses } from "@/db/schema";
import { getCurrentUser } from "@/lib/dal";
import { guardGeneral, RateLimitError } from "@/lib/security/rate-guard";
import { keyFromUrl, presignGetUrl } from "@/lib/speech/s3";

/**
 * Playback for a candidate's OWN speaking recording.
 *
 * `<audio src="/api/practice/recording/[id]">` lands here, where `id` is the
 * answer row's id — a `user_responses` id for practice, or a `mock_test_answers`
 * id for a mock. We verify the session, verify the row BELONGS to that session's
 * user, then 302 to a short-lived presigned URL.
 *
 * WHY THE BUCKET LOCATION NEVER LEAVES THE SERVER. These objects are recordings
 * of people speaking. The stored value is `s3://bucket/key`, and the key is
 * `<prefix>/<userId>/<uuid>.wav` — so handing it to the browser would publish
 * the bucket name, the folder layout, and another user's id. Returning our own
 * path instead means the client holds an opaque reference it can only use as
 * itself: the presigned URL is minted per request, expires, and is never stored
 * anywhere a copied link could outlive.
 *
 * OWNERSHIP IS THE WHOLE POINT. Unlike the media routes next to this one — which
 * serve published content every signed-in user may read — a recording is
 * private to one person. Every lookup below is filtered by the caller's own id,
 * so a valid uuid belonging to somebody else is a 404, not a 200.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The stored `s3://` location, but only if this user owns the row. */
async function ownedAudioUrl(id: string, userId: string): Promise<string | null> {
  const [practice] = await db
    .select({ audioUrl: userResponses.audioUrl })
    .from(userResponses)
    .where(and(eq(userResponses.id, id), eq(userResponses.userId, userId)))
    .limit(1);
  if (practice?.audioUrl) return practice.audioUrl;

  // Mock answers hang off a session rather than carrying a user id, so
  // ownership comes through the join.
  const [mock] = await db
    .select({ audioUrl: mockTestAnswers.audioUrl })
    .from(mockTestAnswers)
    .innerJoin(mockTestSessions, eq(mockTestSessions.id, mockTestAnswers.sessionId))
    .where(and(eq(mockTestAnswers.id, id), eq(mockTestSessions.userId, userId)))
    .limit(1);
  return mock?.audioUrl ?? null;
}

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

  const audioUrl = await ownedAudioUrl(id, user.id);
  // Deliberately indistinguishable from "no such row": a different response for
  // "exists but isn't yours" would confirm which ids are real.
  if (!audioUrl) return new NextResponse("Not found", { status: 404 });

  const key = keyFromUrl(audioUrl);
  if (!key) return new NextResponse("Media unavailable", { status: 404 });

  const target = await presignGetUrl(key, 3600);
  if (!target) return new NextResponse("Media unavailable", { status: 404 });

  const res = NextResponse.redirect(target, 302);
  // Private: a shared cache must never hold one person's recording.
  res.headers.set("Cache-Control", "private, max-age=300");
  return res;
}
