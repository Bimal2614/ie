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
): fb is StoredSpeakingFeedback | StoredSpeakingUnscorable | StoredSpeakingFailure {
  return (
    typeof fb === "object" &&
    fb !== null &&
    (fb as { provider?: unknown }).provider === "ielts-speaking-eval"
  );
}

/**
 * True for a payload that is ONLY a record of a failed attempt.
 *
 * It has to be distinguishable, because callers reasonably assumed that "ours,
 * and not unscorable" meant "scored" — and handed the payload to a renderer
 * expecting bands and criteria. A breadcrumb has neither: there is nothing to
 * show a candidate, and the answer is still waiting for a band.
 */
export function isSpeakingFailure(fb: unknown): fb is StoredSpeakingFailure {
  return (
    isCurrentSpeakingFeedback(fb) && "lastError" in fb && !("unscorable" in fb) && !("overall" in fb)
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

/**
 * What went wrong the last time we tried, for an answer that is NOT settled.
 *
 * WHY THIS EXISTS. `unscorable` is a verdict: no speech, bad audio, nothing more
 * to try. Every other failure — the provider refusing, a bad gateway, a key
 * problem, a throttle — used to be written down nowhere at all. The row was left
 * band-less and reason-less, identical in the database to one that simply had not
 * been reached yet, and the log line that knew the reason said `{}`. Working out
 * that eleven answers had failed transiently rather than been recorded in
 * silence took re-scoring one of them by hand.
 *
 * NOT A VERDICT, AND IT MUST NOT READ AS ONE. `lastError` sits alongside
 * `unscorable` precisely so that the retry predicate can tell the two apart:
 * `scorableMockAnswer` asks whether `unscorable` is absent, so an answer
 * carrying only this is still in the queue and will be tried again. It is a
 * breadcrumb for us, not a judgement on the candidate.
 */
export type StoredSpeakingFailure = {
  provider: "ielts-speaking-eval";
  lastError: { reason: string; status: number | null; detail: string | null; at: string };
};

export function failureFeedback(
  reason: string,
  status?: number,
  detail?: string,
): StoredSpeakingFailure {
  return {
    provider: "ielts-speaking-eval",
    lastError: {
      reason,
      status: status ?? null,
      detail: detail ?? null,
      at: new Date().toISOString(),
    },
  };
}
