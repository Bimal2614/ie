"use server";

import { requireUser } from "@/lib/dal";
import { uploadSpeakingAudio } from "@/lib/speech/s3";
import { toWav16kMono, wavDurationSeconds } from "@/lib/speech/transcode";
import { scoreAttemptSpeakingFor } from "@/lib/scoring/score-attempt";
import { tryConsumeAi } from "@/lib/security/rate-guard";
import { checkAiScoring } from "@/lib/security/plan-guard";

/**
 * Speaking answers: store the recording, then score it server-side.
 *
 * SECURITY: the band never travels through the client. Recording only yields an
 * audio URL; the score is computed here and written straight to the row. If the
 * client supplied its own band, any candidate could award themselves a 9.
 */

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
 * act on instead of a platform 413.
 *
 * AND BELOW `serverActions.bodySizeLimit` BY MORE THAN THE ENVELOPE. A blob of
 * exactly the limit is not a request of exactly the limit: multipart boundaries,
 * the field name and the filename all ride along, so a 4 MiB recording against a
 * "4mb" limit is rejected by the framework before this check can produce its
 * friendlier sentence — the very thing the check exists to prevent. Half a
 * megabyte of headroom closes that window, and costs nothing real: 125 seconds
 * of browser Opus is well under 2 MB, and Safari's AAC is smaller still.
 */
const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;

/**
 * Called when a recording stops. Normalises the audio, stores it, and returns
 * only its location — the answer payload carries the URL, never a score.
 */
export async function storeSpeakingRecording(
  form: FormData,
): Promise<{ audioUrl: string } | { error: string; blocked?: boolean; retryable?: boolean }> {
  const user = await requireUser();

  // A plan that cannot have this scored does not upload it either: transcoding
  // and storing audio no examiner will ever hear is pure cost. `blocked` tells
  // the recorder this is a plan matter, not a failure — the candidate keeps
  // practising, and the dialog at submit explains what a plan would buy.
  const gate = checkAiScoring(user);
  if (gate) return { error: gate.message, blocked: true };

  const file = form.get("audio");
  if (!(file instanceof Blob)) return { error: "No audio supplied." };
  // OUR ceiling has to sit under the PLATFORM's. A serverless function rejects a
  // request body over 4.5 MB before any of this code runs, with a 413 the
  // recorder can only report as "something went wrong" — so a limit above that
  // is not a limit, it is a worse error message. 4 MB leaves headroom for the
  // multipart envelope, and ~120s of browser Opus is a fraction of it. (Raising
  // this means uploading straight to S3 with a presigned PUT, not a bigger
  // number: the platform cap is not configurable.)
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "That recording is too large to upload. Please record a shorter answer." };
  }
  if (file.size === 0) return { error: "Recording was empty." };

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
    // A queue that timed out is a MOMENTARY condition — the instance is busy
    // converting other candidates' recordings — and telling someone to record
    // again would throw away a perfectly good answer. Everything else really is
    // a broken recording.
    if (wav.reason.startsWith("busy")) {
      // `retryable` is not decoration: the recorder acts on it. This is the one
      // failure here that says nothing about the recording — the instance was
      // converting other candidates' answers — so the same bytes will succeed
      // shortly, and telling someone to record again would throw away a good
      // answer for a queue.
      return {
        error: "We're processing a lot of recordings right now — saving again in a moment.",
        retryable: true,
      };
    }
    return { error: "That recording couldn't be processed. Please record your answer again." };
  }

  // OUR ceiling, not the scoring API's — that one imposes none, and happily
  // grades answers well past this. The longest authored task is the 120-second
  // Part 2 long turn and the recorder stops itself there, so this only catches a
  // payload that didn't come from it, with grace for an auto-stop landing a
  // fraction over the mark.
  if (wavDurationSeconds(wav.wav) > MAX_RECORDING_SECONDS) {
    return { error: `Recordings are limited to ${MAX_RECORDING_SECONDS} seconds.` };
  }

  const res = await uploadSpeakingAudio(wav.wav, {
    userId: user.id,
    ext: "wav",
    contentType: "audio/wav",
  });
  if (!res.ok) return { error: res.reason };

  return { audioUrl: res.url };
}

/**
 * Retry scoring for one attempt.
 *
 * The authoritative run happens in the background at submit (see
 * scheduleAttemptScoring). This exists for the case that run couldn't finish —
 * a throttle, an outage, or a batch that outlived the route's duration — so a
 * candidate looking at an unscored answer has a way to ask again. It is safe to
 * call repeatedly: the underlying scorer only touches rows with no band.
 */
export async function scoreAttemptSpeaking(
  attemptId: string,
): Promise<{ scored: number; limited?: boolean; message?: string }> {
  const user = await requireUser();

  const gate = checkAiScoring(user);
  if (gate) return { scored: 0, limited: true, message: gate.message };

  const budget = await tryConsumeAi(user.id);
  if (!budget.allowed) return { scored: 0, limited: true, message: budget.message };

  const { scored } = await scoreAttemptSpeakingFor(user.id, attemptId);
  return { scored };
}
