import { requireApiCandidate } from "@/lib/api/auth";
import { apiRoute } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { ApiError, invalid, planRequired, unavailable } from "@/lib/api/errors";
import { ingestRecording } from "@/lib/speech/ingest-recording";
import { checkAiScoring } from "@/lib/security/plan-guard";

/**
 * POST /api/v1/practice/recording — store one speaking take.
 *
 * Multipart, field name `audio`. Returns an audio location, never a band: the
 * score is computed server-side after submit, and a client that supplied its
 * own band could award itself a 9.
 *
 * WHY THIS IS A SEPARATE ROUTE FROM /api/practice/recording rather than the same
 * one taught to read a bearer token. Two reasons, and the second is the real
 * one:
 *
 *  1. The browser route enforces a same-origin check. An app sends no `Origin`
 *     header at all, so it would be refused — and relaxing that check on the
 *     shared route would weaken the browser's protection to suit a client that
 *     never needed it. A bearer token is not attached automatically by anything,
 *     so this route has no CSRF exposure to protect against in the first place.
 *
 *  2. FFMPEG. The browser records WebM/Opus, which must be transcoded, so that
 *     route carries an 80 MB binary traced into it. The app records 16 kHz mono
 *     PCM natively — already the target format — so it takes the fast path in
 *     `toWav16kMono` and never spawns a process. Keeping the routes separate is
 *     what lets this one stay a small, fast function: see
 *     `outputFileTracingIncludes` in next.config.ts, which lists the browser
 *     route and deliberately does not list this one.
 *
 * THE APP MUST SEND 16 kHz MONO PCM WAV. Flutter's `record` package does this
 * natively on both platforms. Anything else reaches the no-ffmpeg branch here
 * and is refused — by design, since the alternative is this route quietly
 * growing the binary back.
 */
export const dynamic = "force-dynamic";

/**
 * Room for the upload and the S3 round trip. No transcode happens on this route
 * in the normal case, so it needs far less headroom than the browser's.
 */
export const maxDuration = 30;

/**
 * The largest recording we will accept, in bytes.
 *
 * Kept below the 4.5 MB request-body ceiling the serverless platform enforces
 * ahead of this function, so an oversized answer gets a sentence a candidate can
 * act on instead of a platform 413.
 *
 * 16 kHz mono 16-bit PCM is ~32 KB/s, so the 125-second ceiling is ~4 MB — which
 * does NOT fit. In practice Part 1 and Part 3 answers are well inside it and a
 * full Part 2 long turn is the case that can exceed it. Raising this means
 * uploading straight to S3 with a presigned PUT, not a bigger number: the
 * platform cap is not configurable.
 */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const POST = apiRoute(async (req) => {
  const user = await requireApiCandidate(req);

  // Checked before the body is read, so a free-tier candidate is told why
  // without first uploading megabytes that were never going to be kept.
  const gate = checkAiScoring(user);
  if (gate) throw planRequired(gate);

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("audio");
  } catch {
    // A body the platform truncated at its own ceiling arrives here as a parse
    // failure rather than as a large file, so it gets the size sentence too.
    throw new ApiError(
      "payload_too_large",
      "That recording is too large to upload. Please record a shorter answer.",
    );
  }

  if (!(file instanceof Blob)) {
    throw invalid("No audio supplied.", { audio: ["Attach the recording as `audio`."] });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(
      "payload_too_large",
      "That recording is too large to upload. Please record a shorter answer.",
    );
  }

  const result = await ingestRecording(user, Buffer.from(await file.arrayBuffer()));

  if (!result.ok) {
    // The queue was full — the same bytes will succeed shortly, so this must not
    // be reported as a bad recording. 503 + Retry-After is what tells an HTTP
    // client to try again rather than discard a perfectly good answer.
    if (result.retryable) throw unavailable(result.message, 5);
    throw invalid(result.message);
  }

  return ok({ audioUrl: result.audioUrl });
});
