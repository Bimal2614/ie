"use server";

import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { userResponses } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { QUESTION_TYPES, type QuestionTypeKey } from "@/lib/ielts";
import { uploadSpeakingAudio, downloadSpeakingAudio, keyFromUrl } from "@/lib/speech/s3";
import { toWav16kMono } from "@/lib/speech/transcode";
import { scoreSpeaking, taskTypeFor } from "@/lib/speech/speechsuper";

/**
 * Speaking answers: store the recording, then score it server-side.
 *
 * SECURITY: the band never travels through the client. Recording only yields an
 * audio URL; the score is computed here and written straight to the row. If the
 * client supplied its own band, any candidate could award themselves a 9.
 */

/**
 * Called when a recording stops. Returns only the stored audio location — the
 * answer payload carries the URL, never a score.
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
  const res = await uploadSpeakingAudio(bytes, {
    userId: user.id,
    ext: "webm",
    contentType: file.type || "audio/webm",
  });
  if (!res.ok) return { error: res.reason };

  return { audioUrl: res.url };
}

/**
 * Score every unscored speaking answer in one attempt.
 *
 * Runs after submit rather than inline: a SpeechSuper call takes ~9s, so a
 * seven-question Part 1 would block a submit for a minute. Rows land with
 * band=null and are filled in here; the UI already renders "awaiting score"
 * until then.
 */
export async function scoreAttemptSpeaking(attemptId: string): Promise<{ scored: number }> {
  const user = await requireUser();

  const rows = await db
    .select()
    .from(userResponses)
    .where(
      and(
        eq(userResponses.attemptId, attemptId),
        eq(userResponses.userId, user.id),
        eq(userResponses.section, "speaking"),
        isNull(userResponses.band),
        isNotNull(userResponses.audioUrl),
      ),
    );

  let scored = 0;
  for (const row of rows) {
    const key = row.audioUrl ? keyFromUrl(row.audioUrl) : null;
    if (!key) continue;

    const raw = await downloadSpeakingAudio(key);
    if (!raw) continue;

    // Always normalise — the browser records WebM, which SpeechSuper rejects.
    const wav = await toWav16kMono(raw);
    if (!wav.ok) continue;

    const meta = QUESTION_TYPES[row.questionType as QuestionTypeKey];
    const result = await scoreSpeaking({
      audio: wav.wav,
      audioType: "wav",
      sampleRate: 16000,
      userId: user.id,
      taskType: taskTypeFor(row.questionType as QuestionTypeKey),
      questionPrompt: meta?.instruction,
    });
    if (!result.ok) continue;

    const s = result.score;
    await db
      .update(userResponses)
      .set({
        band: s.overall.toFixed(1),
        transcript: s.transcription,
        aiFeedback: {
          criteria: {
            fluencyCoherence: s.fluencyCoherence,
            lexicalResource: s.lexicalResource,
            grammar: s.grammar,
            pronunciation: s.pronunciation,
          },
          relevance: s.relevance,
          speed: s.speed,
          provider: "speechsuper:speak.eval.pro",
        },
      })
      .where(eq(userResponses.id, row.id));
    scored++;
  }

  return { scored };
}
