import type { SpeakingAssessment } from "@/lib/speech/ielts-speaking";

/**
 * What a scored speaking answer stores in `ai_feedback`, and how to build it.
 *
 * DELIBERATELY NOT `server-only`. The one thing the report screen and this
 * module must agree on is the shape of that jsonb, and the only way to keep them
 * in step is for the component to import the type from here. Everything below is
 * either a type (erased at compile time) or a pure mapper over an argument — no
 * credentials, no environment, nothing that must not reach a client bundle.
 *
 * Both callers — question practice and the mock test — write the identical
 * payload into two different tables, so the mapping lives here rather than being
 * kept in step by hand in two places.
 */

/**
 * The stored payload.
 *
 * This is very nearly the whole assessment. That is the point: each criterion
 * arrives with the descriptor clause it matched, quoted evidence, a correction
 * and a drill, and reducing that to four numbers would throw away everything the
 * candidate can actually act on. It costs ~15–25 KB a row.
 *
 * What is dropped: `test` (we already know what we asked), `meta.tokens` (a
 * billing detail, not feedback), and `transcript.pauses` — every pause it lists
 * is already marked inline in `annotatedText`, which is what the UI renders.
 */
export type StoredSpeakingFeedback = {
  /** Discriminates the shape. Answers scored by SpeechSuper have no `provider`
   *  field of this value and are rendered by the legacy branch instead. */
  provider: "ielts-speaking-eval";
  schemaVersion: string;
  overall: SpeakingAssessment["overall"];
  criteria: SpeakingAssessment["criteria"];
  /** Measured delivery facts — safe to show a candidate directly. */
  delivery: SpeakingAssessment["transcript"]["delivery"];
  /** Fillers kept AND pauses marked inline. Display only, never for offsets. */
  annotatedText: string;
  /** Fillers kept — fluency evidence offsets index into THIS string. */
  verbatimText: string;
  isEnglish: boolean;
  errors: SpeakingAssessment["errors"];
  actionPlan: SpeakingAssessment["actionPlan"];
  meta: SpeakingAssessment["meta"];
  /**
   * Whether we could tell the scorer what was asked. Relevance and topic
   * development are judged against the question, so without one the criteria
   * that depend on it are weaker than they look — worth recording rather than
   * silently presenting the band as if it had the full picture.
   */
  promptKnown: boolean;
};

/**
 * An answer that CANNOT be scored, however many times it is retried.
 *
 * The API answers 422 when it hears no speech in a recording. Left unrecorded,
 * that row keeps `band = null` — which the report screen reads as "still
 * scoring", so a candidate watches a spinner run its whole schedule and is then
 * offered a retry that cannot possibly succeed. Writing this instead turns it
 * into a plain answer: we could not hear you, record it again.
 */
export type StoredSpeakingUnscorable = {
  provider: "ielts-speaking-eval";
  unscorable: { reason: "no_speech" | "bad_audio"; detail: string | null };
};

/** True when a stored `ai_feedback` came from this service (not SpeechSuper). */
export function isCurrentSpeakingFeedback(
  fb: unknown,
): fb is StoredSpeakingFeedback | StoredSpeakingUnscorable {
  return (
    typeof fb === "object" &&
    fb !== null &&
    (fb as { provider?: unknown }).provider === "ielts-speaking-eval"
  );
}

/** Build the row payload for a successfully scored answer. */
export function speakingFeedback(
  assessment: SpeakingAssessment,
  promptKnown: boolean,
): StoredSpeakingFeedback {
  return {
    provider: "ielts-speaking-eval",
    schemaVersion: assessment.meta.schemaVersion,
    overall: assessment.overall,
    criteria: assessment.criteria,
    delivery: assessment.transcript.delivery,
    annotatedText: assessment.transcript.annotatedText,
    verbatimText: assessment.transcript.verbatimText,
    isEnglish: assessment.transcript.isEnglish,
    errors: assessment.errors,
    actionPlan: assessment.actionPlan,
    meta: assessment.meta,
    promptKnown,
  };
}

/** Build the row payload for an answer that can never be scored. */
export function unscorableFeedback(
  reason: "no_speech" | "bad_audio",
  detail?: string,
): StoredSpeakingUnscorable {
  return { provider: "ielts-speaking-eval", unscorable: { reason, detail: detail ?? null } };
}
