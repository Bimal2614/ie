import "server-only";

import { env, isSpeakingAiConfigured } from "@/lib/env";
import type { QuestionTypeKey } from "@/lib/ielts";

/**
 * IELTS Speaking Evaluation — AI band scoring for open-ended speaking answers.
 *
 * Purpose-built for UNSCRIPTED IELTS speech: there is no reference answer, only
 * the reference QUESTION, and it returns native IELTS bands (0–9) across the
 * four official criteria plus an overall. That maps straight onto our band
 * model, so a scored speaking answer needs no separate rubric.
 *
 * Contract (from `${base}/openapi.json`, schema_version 2.0):
 *  - POST application/json to `${base}/ielts/analyze-speaking`
 *  - header `X-API-Key`: shared secret, matching the service's `IELTS_API_KEY`
 *  - body: `audio_url` (a presigned URL the service GETs), `part` (1|2|3),
 *    `question` (optional, ≤2000 chars), `cue_card_points` (optional, ≤8)
 *  - 200 → SpeakingAssessment; 401 bad key; 422 either a body validation error
 *    OR "no speech in the recording" — see readError for how those are told
 *    apart; 5xx provider trouble.
 *
 * WHY A URL AND NOT THE BYTES. The service documents it plainly: the audio is
 * fetched by the transcription provider directly and downloaded in parallel for
 * the acoustic analysis, "so the download costs no extra wall clock". Sending a
 * URL also keeps multi-megabyte recordings off this application entirely — we
 * previously pulled every answer out of S3 into memory only to post it straight
 * back out, twice over the wire for bytes we never looked at.
 *
 * WHAT IT RETURNS THAT A BAND ALONE DOES NOT. Every criterion carries the band
 * descriptor clause it matched, evidenced strengths and issues (each quoting the
 * candidate's own words, with a correction and a drill), and what specifically
 * blocks the next half-band. That is the entire value of an AI examiner, so it
 * is kept and shown rather than reduced to four numbers.
 */

export type SpeakingPart = 1 | 2 | 3;

/** Which of the three speaking parts a question type belongs to. */
export function partFor(qt: QuestionTypeKey): SpeakingPart {
  if (qt === "speaking_part2") return 2;
  if (qt === "speaking_part3") return 3;
  return 1;
}

/**
 * How long we wait for one answer.
 *
 * Transcription and grading are both model calls: a 40-second Part 1 answer
 * takes ~15s and a full two-minute long turn ~40s. This is a backstop against a
 * hung connection, not a target — set well clear of a slow-but-working call, or
 * a candidate loses a band they had already earned.
 */
const REQUEST_TIMEOUT_MS = 120_000;

/** The four criteria, in the fixed order the API reports them. */
export type CriterionId =
  | "fluency_coherence"
  | "lexical_resource"
  | "grammatical_range_accuracy"
  | "pronunciation";

/**
 * Why an answer could not be assessed normally.
 *
 * These describe the ANSWER, not a failure of the system — a provider outage is
 * an HTTP error, whereas these arrive on a perfectly valid 200 and the UI has to
 * render them. Without surfacing them, an off-topic or memorised answer is shown
 * as a confident low band and the candidate has no idea why.
 */
export type SpeakingErrorCode =
  | "TEMPLATE_DETECTED"
  | "MEMORISED_ANSWER"
  | "OFF_TOPIC"
  | "TOO_SHORT"
  | "NOT_ENGLISH"
  | "UNINTELLIGIBLE";

export type Evidence = {
  /**
   * The candidate's exact words. Offsets index into the transcript the criterion
   * was judged on: fluency uses `verbatimText`, the others use `text`.
   */
  quote: string | null;
  startChar: number | null;
  endChar: number | null;
  startTime: number | null;
  endTime: number | null;
};

export type Strength = { id: string; point: string; evidence: Evidence };

export type Issue = {
  id: string;
  /** Category, e.g. "mid_clause_hesitation". Valid set depends on the criterion. */
  type: string;
  severity: "high" | "medium" | "low";
  label: string;
  explanation: string;
  evidence: Evidence;
  /** The quoted span rewritten correctly. Null where nothing can be corrected. */
  correction: string | null;
  improvement: { advice: string; example: string | null };
};

export type Criterion = {
  id: CriterionId;
  name: string;
  band: number | null;
  bandLabel: string | null;
  status: "graded" | "unavailable";
  statusReason: string | null;
  /** The band descriptor clause this answer matched — what justifies the band. */
  descriptorMatched: string | null;
  summary: string | null;
  strengths: Strength[];
  issues: Issue[];
  nextBand: { target: number | null; blockers: string[]; actions: string[] };
  /** 0–1. Low means the answer was too short to judge this criterion properly. */
  confidence: number | null;
  error: SpeakingErrorCode | null;
  errorDetail: string | null;
  /** The candidate's own words that triggered the error, when it quoted any. */
  errorQuote: string | null;
  /** Acoustic measurements — present only on Pronunciation. */
  metrics: {
    pitchRangeSemitones: number | null;
    stressVariationDb: number | null;
    rhythmNpvi: number | null;
    recogniserConfidence: number | null;
  } | null;
  /** Per-metric good/acceptable/needs_work, alongside `metrics`. */
  verdicts: Record<string, string> | null;
  /**
   * False on the prosody engine: Pronunciation was estimated from delivery
   * features rather than measured sound by sound. Worth saying out loud rather
   * than presenting an estimate as a measurement.
   */
  measuredAtPhonemeLevel: boolean | null;
};

/** Measured delivery facts — measurements, not judgements. Safe to show as-is. */
export type Delivery = {
  wordCount: number;
  answerSeconds: number;
  recordingSeconds: number;
  wordsPerMinute: number;
  /** WPM with pause time removed — separates "speaks slowly" from "stops often". */
  articulationRate: number;
  speechRatio: number;
  pauseCount: number;
  longPauseCount: number;
  longestPause: number;
  totalPauseSeconds: number;
  /**
   * Pauses inside a clause. Searching for language mid-sentence, rather than
   * pausing at a boundary, is the clearest band 6 / band 7 divider.
   */
  midClausePauseCount: number;
  boundaryPauseCount: number;
  fillerCount: number;
  repetitionCount: number;
  meanConfidence: number | null;
};

export type SpeakingAssessment = {
  overall: {
    band: number;
    bandLabel: string;
    summary: string;
    criteriaBands: Partial<Record<CriterionId, number | null>>;
    /** True when fewer than four criteria could be graded. */
    isPartial: boolean;
  };
  criteria: Criterion[];
  transcript: {
    /** Fillers removed. What a candidate reads back. */
    text: string;
    /** Fillers kept — fluency evidence offsets index into THIS string. */
    verbatimText: string;
    /** Fillers kept AND pauses marked inline. Display only, never for offsets. */
    annotatedText: string;
    durationSeconds: number;
    isEnglish: boolean;
    delivery: Delivery;
  };
  /** Empty for a normal answer. Non-empty drives the UI's caveat banner. */
  errors: {
    criterionId: CriterionId;
    code: SpeakingErrorCode;
    detail: string | null;
    quote: string | null;
  }[];
  actionPlan: {
    priority: number;
    criterionId: CriterionId;
    criterionName: string;
    reason: string;
    action: string;
    drill: string | null;
  }[];
  meta: {
    gradedAt: string;
    transcriptionModel: string;
    judgeModel: string;
    pronunciationEngine: string | null;
    /** Quote this in support requests — the API returns it as X-Request-ID too. */
    requestId: string;
    schemaVersion: string;
  };
};

export type SpeakingScoreResult =
  | { ok: true; assessment: SpeakingAssessment }
  /**
   * `no_speech` and `bad_audio` are PERMANENT for this recording — the service
   * heard nothing, or could not fetch/read it, so a retry cannot succeed.
   * Callers record those instead of leaving the row unscored, or the candidate
   * waits out a poll for a band that is never coming.
   *
   * `unauthorized` and `bad_request` are OUR bug, not the candidate's: a wrong
   * key, or a body this service rejected. They are kept separate so they show up
   * in the log as something to fix rather than hiding among provider outages.
   */
  | {
      ok: false;
      reason:
        | "not_configured"
        | "no_speech"
        | "bad_audio"
        | "unauthorized"
        | "bad_request"
        | "request_failed"
        | "bad_response";
      detail?: string;
    };

/** The service's own cap. Anything longer is rejected as a validation error. */
const MAX_QUESTION_CHARS = 2000;
const MAX_CUE_CARD_POINTS = 8;

/**
 * Score one spoken answer. Returns a structured result rather than throwing, so
 * a scoring outage degrades to "unscored" instead of failing a submission.
 *
 * AUDIO: pass a presigned URL the service can GET, not the bytes — see the note
 * at the top of this file. The recording must stay reachable for the whole call
 * (15–40s of work, plus however long the request waits to be picked up), so sign
 * it with room to spare.
 */
export async function analyzeSpeaking(params: {
  /** Presigned GET URL for the recording. See `presignGetUrl` in speech/s3. */
  audioUrl: string;
  part: SpeakingPart;
  /**
   * The question asked. There is no reference ANSWER in IELTS speaking but there
   * is always a reference QUESTION, and without it relevance and topic
   * development cannot be assessed at all.
   */
  question?: string;
  /** Part 2 "You should say" bullets. */
  cueCardPoints?: string[];
}): Promise<SpeakingScoreResult> {
  if (!isSpeakingAiConfigured()) return { ok: false, reason: "not_configured" };

  // Trimmed to the service's documented limits rather than sent as-is: an
  // over-long cue card would come back as a validation error, costing the
  // candidate their band over something we could simply have cut.
  const body: Record<string, unknown> = { audio_url: params.audioUrl, part: params.part };
  if (params.question) body.question = params.question.slice(0, MAX_QUESTION_CHARS);
  if (params.cueCardPoints?.length) {
    body.cue_card_points = params.cueCardPoints.slice(0, MAX_CUE_CARD_POINTS);
  }

  let res: Response;
  try {
    res = await fetch(`${env.SPEAKING_API_URL!}/ielts/analyze-speaking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": env.SPEAKING_API_KEY!,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (e) {
    return {
      ok: false,
      reason: "request_failed",
      detail: e instanceof Error ? e.message : "network",
    };
  }

  if (!res.ok) return await readError(res);

  let json: RawAssessment;
  try {
    json = (await res.json()) as RawAssessment;
  } catch {
    return { ok: false, reason: "bad_response", detail: "response was not JSON" };
  }

  if (typeof json?.overall?.band !== "number" || !json.transcript) {
    return { ok: false, reason: "bad_response", detail: "no band in response" };
  }

  return { ok: true, assessment: normalise(json) };
}

/**
 * Classify a non-2xx response.
 *
 * THE 422 IS OVERLOADED, and getting it wrong is expensive in both directions.
 * FastAPI returns 422 for a body it could not validate, and this service also
 * returns 422 for a recording it heard no speech in. They are told apart by the
 * SHAPE of `detail`, which is the one reliable difference:
 *
 *   validation → detail is an ARRAY of {type, loc, msg, input} objects
 *   no speech  → detail is a STRING ("No speech was detected in the recording.")
 *
 * Reading a validation error as "no speech" would stamp a permanent "we couldn't
 * hear you" on a perfectly good answer every time we sent a malformed request —
 * and, because that verdict is stored, never retry it.
 */
async function readError(res: Response): Promise<SpeakingScoreResult> {
  const text = await res.text().catch(() => "");

  // BEFORE anything else: a host-level gate in front of the service, which never
  // reaches it. Vercel's Deployment Protection answers 401 with its own JSON
  // body, so without this it reads as "your API key is wrong" and sends whoever
  // is debugging to rotate a key that was fine all along. The fix is a Vercel
  // setting, and the log should say so.
  if (text.includes("vercel_auth_enabled") || text.includes("Protected deployment")) {
    return {
      ok: false,
      reason: "unauthorized",
      detail:
        "blocked by Vercel Deployment Protection before reaching the service. " +
        "disable it for this project, or send a protection-bypass token",
    };
  }

  let detailRaw: unknown;
  try {
    detailRaw = (JSON.parse(text) as { detail?: unknown }).detail;
  } catch {
    /* non-JSON body; fall back to the status line below */
  }

  const isValidation = Array.isArray(detailRaw);
  const detail =
    typeof detailRaw === "string"
      ? detailRaw
      : detailRaw !== undefined
        ? JSON.stringify(detailRaw).slice(0, 300)
        : `HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`;

  if (res.status === 401 || res.status === 403) return { ok: false, reason: "unauthorized", detail };
  if (res.status === 422) {
    return isValidation
      ? { ok: false, reason: "bad_request", detail }
      : { ok: false, reason: "no_speech", detail };
  }
  // 400 covers a URL the service could not fetch or read — permanent for this
  // recording in the same way no-speech is.
  if (res.status === 400) return { ok: false, reason: "bad_audio", detail };
  return { ok: false, reason: "request_failed", detail: `HTTP ${res.status}: ${detail}` };
}

/* ---- Wire shape → our camelCase shape ---------------------------------- */

/**
 * The wire payload is snake_case and carries a few fields we deliberately drop:
 * `test` (we already know what we asked), `meta.tokens` (billing, not feedback)
 * and `transcript.pauses` (~4.5 KB on a long answer, and every pause it lists is
 * already marked inline in `annotated_text`, which is what the UI renders).
 */
type RawAssessment = {
  schema_version?: string;
  request_id?: string;
  overall?: {
    band?: number;
    band_label?: string;
    summary?: string;
    criteria_bands?: Record<string, number | null>;
    is_partial?: boolean;
  };
  criteria?: RawCriterion[];
  transcript?: {
    text?: string;
    verbatim_text?: string;
    annotated_text?: string;
    duration_seconds?: number;
    language?: { is_english?: boolean };
    delivery?: Record<string, number | null | undefined>;
  };
  errors?: { criterion_id?: string; code?: string; detail?: string | null; quote?: string | null }[];
  action_plan?: {
    priority?: number;
    criterion_id?: string;
    criterion_name?: string;
    reason?: string;
    action?: string;
    drill?: string | null;
  }[];
  meta?: {
    graded_at?: string;
    transcription_model?: string;
    judge_model?: string;
    pronunciation_engine?: string | null;
  };
};

type RawEvidence = {
  quote?: string | null;
  start_char?: number | null;
  end_char?: number | null;
  start_time?: number | null;
  end_time?: number | null;
};

type RawCriterion = {
  id?: string;
  name?: string;
  band?: number | null;
  band_label?: string | null;
  status?: string;
  status_reason?: string | null;
  descriptor_matched?: string | null;
  summary?: string | null;
  strengths?: { id?: string; point?: string; evidence?: RawEvidence }[];
  issues?: {
    id?: string;
    type?: string;
    severity?: string;
    label?: string;
    explanation?: string;
    evidence?: RawEvidence;
    correction?: string | null;
    improvement?: { advice?: string; example?: string | null };
  }[];
  next_band?: { target?: number | null; blockers?: string[]; actions?: string[] };
  confidence?: number | null;
  error?: string | null;
  error_detail?: string | null;
  error_quote?: string | null;
  measured_at_phoneme_level?: boolean | null;
  metrics?: {
    pitch_range_semitones?: number | null;
    stress_variation_db?: number | null;
    rhythm_npvi?: number | null;
    recogniser_confidence?: number | null;
  } | null;
  verdicts?: Record<string, string> | null;
};

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : []);

function evidence(e: RawEvidence | undefined): Evidence {
  return {
    quote: str(e?.quote),
    startChar: num(e?.start_char),
    endChar: num(e?.end_char),
    startTime: num(e?.start_time),
    endTime: num(e?.end_time),
  };
}

const CRITERION_IDS: CriterionId[] = [
  "fluency_coherence",
  "lexical_resource",
  "grammatical_range_accuracy",
  "pronunciation",
];

const isCriterionId = (v: unknown): v is CriterionId =>
  typeof v === "string" && (CRITERION_IDS as string[]).includes(v);

const ERROR_CODES: SpeakingErrorCode[] = [
  "TEMPLATE_DETECTED",
  "MEMORISED_ANSWER",
  "OFF_TOPIC",
  "TOO_SHORT",
  "NOT_ENGLISH",
  "UNINTELLIGIBLE",
];

const isErrorCode = (v: unknown): v is SpeakingErrorCode =>
  typeof v === "string" && (ERROR_CODES as string[]).includes(v);

/**
 * Every field is read defensively. The response is contract-checked upstream for
 * the two things that make it usable at all (a band and a transcript); beyond
 * that, a criterion missing its summary should cost that one line, not the whole
 * assessment a candidate just waited forty seconds for.
 */
function normalise(r: RawAssessment): SpeakingAssessment {
  const d = r.transcript?.delivery ?? {};
  const n = (k: string): number => num(d[k]) ?? 0;

  return {
    overall: {
      band: r.overall?.band ?? 0,
      bandLabel: str(r.overall?.band_label) ?? "",
      summary: str(r.overall?.summary) ?? "",
      criteriaBands: Object.fromEntries(
        Object.entries(r.overall?.criteria_bands ?? {}).filter(([k]) => isCriterionId(k)),
      ) as Partial<Record<CriterionId, number | null>>,
      isPartial: r.overall?.is_partial === true,
    },
    criteria: list(r.criteria)
      .filter((c) => isCriterionId(c.id))
      .map((c) => ({
        id: c.id as CriterionId,
        name: str(c.name) ?? "",
        band: num(c.band),
        bandLabel: str(c.band_label),
        status: c.status === "unavailable" ? ("unavailable" as const) : ("graded" as const),
        statusReason: str(c.status_reason),
        descriptorMatched: str(c.descriptor_matched),
        summary: str(c.summary),
        strengths: list(c.strengths).map((s, i) => ({
          id: str(s.id) ?? `s${i}`,
          point: str(s.point) ?? "",
          evidence: evidence(s.evidence),
        })),
        issues: list(c.issues).map((issue, i) => ({
          id: str(issue.id) ?? `i${i}`,
          type: str(issue.type) ?? "",
          severity:
            issue.severity === "high"
              ? ("high" as const)
              : issue.severity === "low"
                ? ("low" as const)
                : ("medium" as const),
          label: str(issue.label) ?? "",
          explanation: str(issue.explanation) ?? "",
          evidence: evidence(issue.evidence),
          correction: str(issue.correction),
          improvement: {
            advice: str(issue.improvement?.advice) ?? "",
            example: str(issue.improvement?.example),
          },
        })),
        nextBand: {
          target: num(c.next_band?.target),
          blockers: list(c.next_band?.blockers).filter((b) => typeof b === "string"),
          actions: list(c.next_band?.actions).filter((a) => typeof a === "string"),
        },
        confidence: num(c.confidence),
        error: isErrorCode(c.error) ? c.error : null,
        errorDetail: str(c.error_detail),
        errorQuote: str(c.error_quote),
        metrics: c.metrics
          ? {
              pitchRangeSemitones: num(c.metrics.pitch_range_semitones),
              stressVariationDb: num(c.metrics.stress_variation_db),
              rhythmNpvi: num(c.metrics.rhythm_npvi),
              recogniserConfidence: num(c.metrics.recogniser_confidence),
            }
          : null,
        verdicts: c.verdicts && typeof c.verdicts === "object" ? c.verdicts : null,
        measuredAtPhonemeLevel:
          typeof c.measured_at_phoneme_level === "boolean" ? c.measured_at_phoneme_level : null,
      })),
    transcript: {
      text: str(r.transcript?.text) ?? "",
      verbatimText: str(r.transcript?.verbatim_text) ?? "",
      annotatedText: str(r.transcript?.annotated_text) ?? "",
      durationSeconds: num(r.transcript?.duration_seconds) ?? 0,
      isEnglish: r.transcript?.language?.is_english !== false,
      delivery: {
        wordCount: n("word_count"),
        answerSeconds: n("answer_seconds"),
        recordingSeconds: n("recording_seconds"),
        wordsPerMinute: n("words_per_minute"),
        articulationRate: n("articulation_rate"),
        speechRatio: n("speech_ratio"),
        pauseCount: n("pause_count"),
        longPauseCount: n("long_pause_count"),
        longestPause: n("longest_pause"),
        totalPauseSeconds: n("total_pause_seconds"),
        midClausePauseCount: n("mid_clause_pause_count"),
        boundaryPauseCount: n("boundary_pause_count"),
        fillerCount: n("filler_count"),
        repetitionCount: n("repetition_count"),
        meanConfidence: num(d.mean_confidence),
      },
    },
    errors: list(r.errors)
      .filter((e) => isCriterionId(e.criterion_id) && isErrorCode(e.code))
      .map((e) => ({
        criterionId: e.criterion_id as CriterionId,
        code: e.code as SpeakingErrorCode,
        detail: str(e.detail),
        quote: str(e.quote),
      })),
    actionPlan: list(r.action_plan)
      .filter((a) => isCriterionId(a.criterion_id))
      .map((a, i) => ({
        priority: num(a.priority) ?? i + 1,
        criterionId: a.criterion_id as CriterionId,
        criterionName: str(a.criterion_name) ?? "",
        reason: str(a.reason) ?? "",
        action: str(a.action) ?? "",
        drill: str(a.drill),
      }))
      .sort((a, b) => a.priority - b.priority),
    meta: {
      gradedAt: str(r.meta?.graded_at) ?? new Date().toISOString(),
      transcriptionModel: str(r.meta?.transcription_model) ?? "",
      judgeModel: str(r.meta?.judge_model) ?? "",
      pronunciationEngine: str(r.meta?.pronunciation_engine),
      requestId: str(r.request_id) ?? "",
      schemaVersion: str(r.schema_version) ?? "",
    },
  };
}
