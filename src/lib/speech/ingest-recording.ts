import "server-only";

import { uploadSpeakingAudio } from "@/lib/speech/s3";
import { toWav16kMono, wavDurationSeconds } from "@/lib/speech/transcode";
import { checkAiScoring } from "@/lib/security/plan-guard";
import type { AuthenticatedUser } from "@/lib/session";

/**
 * Take one speaking recording from bytes to a stored, scoreable artefact.
 *
 * Shared by the browser's upload route and the app's. The two differ only in
 * how the request is authenticated and how large a body they can carry; what
 * happens to the audio — the plan gate, the normalisation, the duration
 * ceiling, where it lands in the bucket — must not differ at all, because the
 * bytes in the bucket are the bytes an examiner model will be given.
 *
 * SECURITY: the band never travels through the client. This returns only an
 * audio location; the score is computed server-side after submit. If the client
 * supplied its own band, any candidate could award themselves a 9.
 */

/**
 * The longest recording we will accept, in seconds.
 *
 * Sized to the longest authored task — the 120-second Part 2 long turn — plus a
 * few seconds of grace for the recorder's auto-stop.
 */
export const MAX_RECORDING_SECONDS = 125;

export type IngestResult =
  | { ok: true; audioUrl: string }
  | {
      ok: false;
      message: string;
      /** The plan cannot have this scored — not a failure, a tier matter. */
      blocked?: boolean;
      /** Says nothing about the recording: the same bytes will work shortly. */
      retryable?: boolean;
    };

export async function ingestRecording(
  user: AuthenticatedUser,
  bytes: Buffer,
): Promise<IngestResult> {
  // A plan that cannot have this scored does not upload it either: transcoding
  // and storing audio no examiner will ever hear is pure cost. `blocked` tells
  // the recorder this is a plan matter, not a failure — the candidate keeps
  // practising, and the dialog at submit explains what a plan would buy.
  const gate = checkAiScoring(user);
  if (gate) return { ok: false, message: gate.message, blocked: true };

  if (bytes.length === 0) return { ok: false, message: "Recording was empty." };

  // NORMALISE HERE, NOT AT SCORING TIME.
  //
  // The scoring API would accept the browser's WebM/Opus as it is, so this is
  // not about what it takes. Converting once on the way in — and storing the
  // RESULT — means the bytes in the bucket are exactly the bytes that were
  // scored: a re-score months later cannot drift because ffmpeg changed, review
  // plays back precisely what the scorer heard, and a long attempt doesn't
  // re-encode every recording each time scoring is retried. It also gives every
  // client's recording one predictable format for playback.
  //
  // The cost is storage: 16 kHz mono 16-bit is ~32 KB/s, so a 2-minute long turn
  // is ~3.8 MB against ~1 MB of Opus. Cheap next to re-deriving the artefact.
  //
  // A recording that ALREADY arrives as 16 kHz mono PCM — which is what the
  // mobile app produces natively — skips this entirely and is stored as sent.
  const wav = await toWav16kMono(bytes);
  if (!wav.ok) {
    if (wav.reason.startsWith("busy")) {
      // `retryable` is not decoration: the recorder acts on it. This is the one
      // failure here that says nothing about the recording — the instance was
      // converting other candidates' answers — so the same bytes will succeed
      // shortly, and telling someone to record again would throw away a good
      // answer for a queue.
      return {
        ok: false,
        message: "We're processing a lot of recordings right now — saving again in a moment.",
        retryable: true,
      };
    }
    return {
      ok: false,
      message: "That recording couldn't be processed. Please record your answer again.",
    };
  }

  // OUR ceiling, not the scoring API's — that one imposes none, and happily
  // grades answers well past this. The longest authored task is the 120-second
  // Part 2 long turn and the recorder stops itself there, so this only catches a
  // payload that didn't come from it, with grace for an auto-stop landing a
  // fraction over the mark.
  if (wavDurationSeconds(wav.wav) > MAX_RECORDING_SECONDS) {
    return { ok: false, message: `Recordings are limited to ${MAX_RECORDING_SECONDS} seconds.` };
  }

  const res = await uploadSpeakingAudio(wav.wav, {
    userId: user.id,
    ext: "wav",
    contentType: "audio/wav",
  });
  if (!res.ok) return { ok: false, message: res.reason };

  return { ok: true, audioUrl: res.url };
}
