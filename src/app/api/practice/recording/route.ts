import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { ingestRecording } from "@/lib/speech/ingest-recording";
import { isProd } from "@/lib/env";

/**
 * Store one speaking recording. POST here when a take stops; GET ./[id] plays
 * one back.
 *
 * WHY THIS IS A ROUTE AND NOT A SERVER ACTION, which it was until now.
 *
 * Transcoding needs ffmpeg-static, and its 80 MB binary has to be traced into
 * whatever function can reach it (see outputFileTracingIncludes). A server
 * action is bundled into every ROUTE that renders a component importing it — so
 * the action living next to the recorder put that binary inside
 * /practice/[section]/[type], /practice/set/[id], /section-practice/[id] and
 * /mock-test/[id]. Reading and Listening have nothing to transcode and were
 * paying for it anyway: a cold start on a function that size was measured at
 * 15.9 SECONDS on a plain navigation into a reading task.
 *
 * A route handler is its own function. The binary is traced here, and nowhere
 * else, so every practice page went back to a normal cold start while the one
 * request that actually needs ffmpeg still has it.
 *
 * SECURITY: the band never travels through the client. This returns only an
 * audio location; the score is computed server-side after submit. If the client
 * supplied its own band, any candidate could award themselves a 9.
 */

/**
 * Room for the work, which is bounded but not instant: a recording can queue up
 * to FFMPEG_QUEUE_TIMEOUT_MS (20s) for a transcode lane and then run for up to
 * FFMPEG_TIMEOUT_MS (30s). At the platform's 15s default the slow half of that
 * range was killed mid-convert, which the recorder could only report as a broken
 * recording. A ceiling, not a reservation — nothing is billed for time unspent.
 */
export const maxDuration = 60;

/**
 * The largest recording we will accept, in bytes.
 *
 * Kept below the 4.5 MB request-body ceiling the serverless platform enforces
 * ahead of this function, so an oversized answer gets a sentence a candidate can
 * act on instead of a platform 413. ~120s of browser Opus is a fraction of it,
 * and Safari's AAC is smaller still. (Raising this means uploading straight to
 * S3 with a presigned PUT, not a bigger number: the platform cap is not
 * configurable.)
 */
const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;

/**
 * Same-origin check, which a server action used to get for free.
 *
 * The session cookie is SameSite=Lax, so a browser will not attach it to a
 * cross-site POST and the request would fail the auth check above anyway. This
 * is the second lock: it costs one header comparison, and it means a future
 * change to the cookie policy cannot quietly turn this into an endpoint any page
 * on the internet can make a signed-in candidate call.
 *
 * Dev is exempt because there is no stable origin to compare against when the
 * app is reached as localhost, 127.0.0.1 and a LAN IP by turns.
 */
function sameOrigin(req: Request): boolean {
  if (!isProd) return true;
  const origin = req.headers.get("origin");
  // A same-origin fetch from our own page always sends Origin. Its absence is
  // therefore not "an old browser", it is not our recorder.
  if (!origin) return false;
  const host = req.headers.get("host");
  try {
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** What the recorder expects back — unchanged from the action it replaces. */
type StoreResult =
  | { audioUrl: string }
  | { error: string; blocked?: boolean; retryable?: boolean };

const json = (body: StoreResult, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Please sign in again to save this recording." }, 401);
  if (!sameOrigin(req)) return json({ error: "Request rejected." }, 403);

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("audio");
  } catch {
    // A body the platform truncated at its own ceiling arrives here as a parse
    // failure rather than as a large file, so it gets the size sentence too.
    return json({ error: "That recording is too large to upload. Please record a shorter answer." });
  }

  if (!(file instanceof Blob)) return json({ error: "No audio supplied." });
  if (file.size > MAX_UPLOAD_BYTES) {
    return json({ error: "That recording is too large to upload. Please record a shorter answer." });
  }

  // Everything from the plan gate to the bucket is shared with the app's upload
  // route — see src/lib/speech/ingest-recording.ts.
  const result = await ingestRecording(user, Buffer.from(await file.arrayBuffer()));
  if (!result.ok) {
    return json({ error: result.message, blocked: result.blocked, retryable: result.retryable });
  }

  return json({ audioUrl: result.audioUrl });
}
