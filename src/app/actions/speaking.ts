"use server";

import { requireUser } from "@/lib/dal";
import { uploadSpeakingAudio } from "@/lib/speech/s3";
import { toWav16kMono, wavDurationSeconds } from "@/lib/speech/transcode";
import { MAX_AUDIO_SECONDS } from "@/lib/speech/speechsuper";
import { scoreAttemptSpeakingFor } from "@/lib/scoring/score-attempt";
import { guardAi, RateLimitError } from "@/lib/security/rate-guard";

/**
 * Speaking answers: store the recording, then score it server-side.
 *
 * SECURITY: the band never travels through the client. Recording only yields an
 * audio URL; the score is computed here and written straight to the row. If the
 * client supplied its own band, any candidate could award themselves a 9.
 */

/**
 * Called when a recording stops. Normalises the audio, stores it, and returns
 * only its location — the answer payload carries the URL, never a score.
 */
export async function storeSpeakingRecording(form: FormData): Promise<{ audioUrl: string } | { error: string }> {
  const user = await requireUser();

  const file = form.get("audio");
  if (!(file instanceof Blob)) return { error: "No audio supplied." };
  // Guard the upload path: ~120s of Opus is well under this; anything larger is
  // not a legitimate answer.
  if (file.size > 15 * 1024 * 1024) return { error: "Recording too large." };
  if (file.size === 0) return { error: "Recording was empty." };

  const bytes = Buffer.from(await file.arrayBuffer());

  // NORMALISE HERE, NOT AT SCORING TIME.
  //
  // Browsers record WebM/Opus and SpeechSuper accepts neither, so a conversion
  // has to happen somewhere. Doing it once on the way in — and storing the
  // RESULT — means the bytes in the bucket are exactly the bytes that were
  // scored: a re-score months later cannot drift because ffmpeg changed, review
  // plays back precisely what the scorer heard, and a long attempt doesn't
  // re-encode every recording each time scoring is retried.
  //
  // The cost is storage: 16 kHz mono 16-bit is ~32 KB/s, so a 2-minute long turn
  // is ~3.8 MB against ~1 MB of Opus. Cheap next to re-deriving the artefact.
  const wav = await toWav16kMono(bytes);
  if (!wav.ok) {
    return { error: "That recording couldn't be processed. Please record your answer again." };
  }

  // The documented ceiling is 120s. The recorder stops itself at the task limit,
  // so this only catches a payload that didn't come from it — with a little
  // grace, since an auto-stop lands a fraction over the mark.
  if (wavDurationSeconds(wav.wav) > MAX_AUDIO_SECONDS + 5) {
    return { error: `Recordings are limited to ${MAX_AUDIO_SECONDS} seconds.` };
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

  try {
    await guardAi(user.id);
  } catch (e) {
    if (e instanceof RateLimitError) return { scored: 0, limited: true, message: e.message };
    throw e;
  }

  const { scored } = await scoreAttemptSpeakingFor(user.id, attemptId);
  return { scored };
}
