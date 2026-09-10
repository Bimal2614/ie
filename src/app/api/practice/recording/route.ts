import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { uploadSpeakingAudio } from "@/lib/speech/s3";
import { toWav16kMono, wavDurationSeconds } from "@/lib/speech/transcode";
import { checkAiScoring } from "@/lib/security/plan-guard";
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
 * The longest recording we will accept, in seconds.
 *
 * Sized to the longest authored task — the 120-second Part 2 long turn — plus a
 * few seconds of grace for the recorder's auto-stop.
 */
const MAX_RECORDING_SECONDS = 125;

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

  // A plan that cannot have this scored does not upload it either: transcoding
  // and storing audio no examiner will ever hear is pure cost. `blocked` tells
  // the recorder this is a plan matter, not a failure — the candidate keeps
  // practising, and the dialog at submit explains what a plan would buy.
  const gate = checkAiScoring(user);
  if (gate) return json({ error: gate.message, blocked: true });

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
  if (file.size === 0) return json({ error: "Recording was empty." });

  const bytes = Buffer.from(await file.arrayBuffer());

  // NORMALISE HERE, NOT AT SCORING TIME.
  //
  // The scoring API would accept the browser's WebM/Opus as it is, so this is
  // not about what it takes. Converting once on the way in — and storing the
  // RESULT — means the bytes in the bucket are exactly the bytes that were
  // scored: a re-score months later cannot drift because ffmpeg changed, review
  // plays back precisely what the scorer heard, and a long attempt doesn't
  // re-encode every recording each time scoring is retried. It also gives every
  // browser's recording one predictable format for playback.
  //
  // The cost is storage: 16 kHz mono 16-bit is ~32 KB/s, so a 2-minute long turn
  // is ~3.8 MB against ~1 MB of Opus. Cheap next to re-deriving the artefact.
  const wav = await toWav16kMono(bytes);
  if (!wav.ok) {
    if (wav.reason.startsWith("busy")) {
      // `retryable` is not decoration: the recorder acts on it. This is the one
      // failure here that says nothing about the recording — the instance was
      // converting other candidates' answers — so the same bytes will succeed
      // shortly, and telling someone to record again would throw away a good
      // answer for a queue.
      return json({
        error: "We're processing a lot of recordings right now — saving again in a moment.",
        retryable: true,
      });
    }
    return json({ error: "That recording couldn't be processed. Please record your answer again." });
  }

  // OUR ceiling, not the scoring API's — that one imposes none, and happily
  // grades answers well past this. The longest authored task is the 120-second
  // Part 2 long turn and the recorder stops itself there, so this only catches a
  // payload that didn't come from it, with grace for an auto-stop landing a
  // fraction over the mark.
  if (wavDurationSeconds(wav.wav) > MAX_RECORDING_SECONDS) {
    return json({ error: `Recordings are limited to ${MAX_RECORDING_SECONDS} seconds.` });
  }

  const res = await uploadSpeakingAudio(wav.wav, {
    userId: user.id,
    ext: "wav",
    contentType: "audio/wav",
  });
  if (!res.ok) return json({ error: res.reason });

  return json({ audioUrl: res.url });
}
