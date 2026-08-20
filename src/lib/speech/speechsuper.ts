import "server-only";

import { createHash } from "node:crypto";
import { env, isSpeechSuperConfigured } from "@/lib/env";
import type { QuestionTypeKey } from "@/lib/ielts";

/**
 * SpeechSuper — AI scoring for open-ended IELTS speaking.
 *
 * Uses the `speak.eval.pro` core, which is purpose-built for UNSCRIPTED IELTS
 * speech: no reference text, and it returns native IELTS bands (0–9) across the
 * four official criteria plus an overall. That maps straight onto our band
 * model, so a scored speaking answer needs no separate rubric.
 *
 * Contract (from docs.speechsuper.com/#/./Languages/English/speak.eval.pro):
 *  - POST multipart/form-data to `${base}/speak.eval.pro`, header `Request-Index: 0`
 *  - two form parts: `text` (a JSON blob with signed `connect` + `start`) and
 *    `audio` (raw bytes, application/octet-stream)
 *  - two SHA-1 signatures:
 *      connect.sig = sha1(appKey + timestamp + secretKey)
 *      start.sig   = sha1(appKey + timestamp + userId + secretKey)
 *  - the secretKey is only ever hashed, never transmitted.
 *
 * Signing happens here, server-side only (`server-only`) — the keys must never
 * reach the browser.
 */

export type SpeakingTaskType = "ielts_part1" | "ielts_part2" | "ielts_part3";

/** Map our speaking question types onto SpeechSuper's IELTS task strictness. */
export function taskTypeFor(qt: QuestionTypeKey): SpeakingTaskType {
  if (qt === "speaking_part2") return "ielts_part2";
  if (qt === "speaking_part3") return "ielts_part3";
  return "ielts_part1";
}

/** SpeechSuper accepts these container types; webm is NOT among them. */
export type SpeechAudioType = "wav" | "mp3" | "ogg" | "opus" | "amr";

/**
 * Hard limit from the docs ("audio limit: 120 seconds"). Part 2 is authored at
 * exactly 120s of talk time, so a full-length long turn sits right on this line
 * — leave no slack anywhere upstream of here.
 */
export const MAX_AUDIO_SECONDS = 120;

/**
 * The measurements behind the four bands.
 *
 * SpeechSuper returns roughly twenty result fields and we were keeping four, so
 * a candidate saw "pronunciation 4" with no way to know whether that meant a few
 * awkward words or almost none understood. These are the numbers that answer
 * "why", and they are already paid for in the same call.
 *
 * Deliberately a SUMMARY. The raw payload also carries per-word timings for
 * every sentence — ~50 KB for a one-minute answer — which would bloat every
 * response row for detail no screen shows. The worst-scored words are kept
 * because that is the actionable part of it; the rest is not.
 */
export type SpeakingStats = {
  /** Share of words spoken well / acceptably / poorly. */
  pronunciation: { good: number | null; fair: number | null; poor: number | null };
  /** Sentence-level accuracy and a raw error count. */
  grammar: { accurateSentencePct: number | null; errorCount: number | null };
  /** Range measures, plus the CEFR spread of the words actually used. */
  vocabulary: {
    words: number | null;
    uniqueWords: number | null;
    academicWords: string[];
    cefr: Record<string, number>;
  };
  /** Pauses, and the linking/plosion techniques the scorer detected. */
  fluency: { pauses: number | null; liaisons: number | null; lossOfPlosion: number | null };
  /** "um" / "uh" counts, keyed by filler. */
  pauseFillers: Record<string, number>;
  /** Seconds of actual speech, versus the length of the recording. */
  effectiveSpeechSec: number | null;
  durationSec: number | null;
  /** Intonation similarity to a native speaker, 0–100. */
  rhythm: number | null;
  /** Lowest-scoring words, worst first — what to practise. */
  weakWords: { word: string; score: number }[];
};

export type SpeakingScore = {
  /** IELTS overall band, 0–9 (half-band). */
  overall: number;
  fluencyCoherence: number;
  lexicalResource: number;
  grammar: number;
  pronunciation: number;
  /** 0–100 on-topic score vs the prompt (not a band). */
  relevance: number | null;
  transcription: string;
  /** Words per minute. */
  speed: number | null;
  /**
   * The scorer's own caveat about this take, when it gave one.
   *
   * Documented codes: 2001 "response might be empty", 2002 "response may not be
   * relevant to the question prompt". Both come back with a NUMERIC BAND
   * attached, so without surfacing this a silent recording is stored as a
   * confident band 0 and the candidate is told they scored zero on content they
   * believe they delivered. Kept as a caveat rather than a hard failure: only
   * the candidate can say whether they actually spoke.
   */
  warning: unknown | null;
  /** The measurements behind the bands. See SpeakingStats. */
  stats: SpeakingStats;
  /** Full raw payload, stored in aiFeedback for later UI without a re-call. */
  raw: unknown;
};

export type SpeakingScoreResult =
  | { ok: true; score: SpeakingScore }
  | { ok: false; reason: "not_configured" | "request_failed" | "bad_response"; detail?: string };

function sha1(input: string): string {
  return createHash("sha1").update(input).digest("hex");
}

/**
 * Score one spoken answer. Returns a structured result rather than throwing, so
 * a scoring outage degrades to "unscored" instead of failing a submission.
 *
 * NOTE ON AUDIO: SpeechSuper wants wav/mp3/ogg/opus/amr at ~16 kHz mono. The
 * browser's MediaRecorder produces webm/opus, which is NOT accepted — callers
 * must transcode before this point (see the wiring note in the results of the
 * scaffolding task). Passing webm will fail at the API, not here.
 */
export async function scoreSpeaking(params: {
  audio: Buffer | Uint8Array;
  audioType: SpeechAudioType;
  sampleRate?: number;
  userId: string;
  taskType: SpeakingTaskType;
  /** The question asked — drives the relevance score. */
  questionPrompt?: string;
}): Promise<SpeakingScoreResult> {
  if (!isSpeechSuperConfigured()) return { ok: false, reason: "not_configured" };

  const appKey = env.SPEECHSUPER_API_KEY!;
  const secretKey = env.SPEECHSUPER_SECRET_KEY!;
  const timestamp = String(Math.floor(Date.now() / 1000));

  const payload = {
    connect: {
      cmd: "connect",
      param: {
        sdk: { version: 16777472, source: 9, protocol: 2 },
        app: {
          applicationId: appKey,
          timestamp,
          sig: sha1(appKey + timestamp + secretKey),
        },
      },
    },
    start: {
      cmd: "start",
      param: {
        app: {
          userId: params.userId,
          applicationId: appKey,
          timestamp,
          sig: sha1(appKey + timestamp + params.userId + secretKey),
        },
        audio: {
          audioType: params.audioType,
          channel: 1,
          sampleBytes: 2,
          sampleRate: params.sampleRate ?? 16000,
        },
        request: {
          coreType: "speak.eval.pro",
          test_type: "ielts",
          task_type: params.taskType,
          model: "non_native", // better transcription for test-takers
          ...(params.questionPrompt ? { question_prompt: params.questionPrompt } : {}),
        },
      },
    },
  };

  // Copy into a standalone ArrayBuffer — a clean BlobPart regardless of whether
  // the source is a Buffer or a view over a shared/oversized backing store.
  const ab = new ArrayBuffer(params.audio.byteLength);
  new Uint8Array(ab).set(params.audio);

  const form = new FormData();
  form.append("text", JSON.stringify(payload));
  form.append("audio", new Blob([ab], { type: "application/octet-stream" }), "answer");

  let json: SpeechSuperResponse;
  try {
    const res = await fetch(`${env.SPEECHSUPER_BASE_URL!}/speak.eval.pro`, {
      method: "POST",
      headers: { "Request-Index": "0" },
      body: form,
    });
    if (!res.ok) {
      return { ok: false, reason: "request_failed", detail: `HTTP ${res.status}` };
    }
    json = (await res.json()) as SpeechSuperResponse;
  } catch (e) {
    return { ok: false, reason: "request_failed", detail: e instanceof Error ? e.message : "network" };
  }

  const r = json.result;
  if (!r || typeof r.overall !== "number") {
    return { ok: false, reason: "bad_response", detail: json.error ?? "no result" };
  }

  const stats = extractStats(r);

  return {
    ok: true,
    score: {
      overall: r.overall,
      fluencyCoherence: r.fluency_coherence ?? 0,
      lexicalResource: r.lexical_resource ?? 0,
      grammar: r.grammar ?? 0,
      pronunciation: r.pronunciation ?? 0,
      relevance: r.relevance ?? null,
      transcription: r.transcription ?? "",
      speed: r.speed ?? null,
      warning: r.Warning ?? r.warning ?? null,
      stats,
      raw: json,
    },
  };
}

/* Minimal shape of the fields we read — the full payload is kept in `raw`. */
type SpeechSuperResponse = {
  error?: string;
  result?: {
    overall?: number;
    fluency_coherence?: number;
    lexical_resource?: number;
    grammar?: number;
    pronunciation?: number;
    relevance?: number;
    transcription?: string;
    speed?: number;
    /* The docs table names this `Warning`; nothing documents the casing against
       a real payload, so both are accepted rather than guessing one. */
    Warning?: unknown;
    warning?: unknown;
    rhythm?: number;
    effective_speech_length?: number;
    numeric_duration?: number;
    pronunciation_stats?: { good_word_pct?: number; fair_word_pct?: number; poor_word_pct?: number };
    grammar_stats?: { accurate_sent_pct?: number; grammar_error_cnt?: number };
    fluency_stats?: { pause_cnt?: number; liaison_cnt?: number; loss_of_plosion_cnt?: number };
    vocabulary_stats?: {
      word_cnt?: number;
      unique_word_cnt?: number;
      academic_words?: string[];
      [cefrOrOther: string]: unknown;
    };
    pause_filler?: Record<string, number>;
    sentences?: { details?: { word?: string; pronunciation?: number }[] }[];
  };
};

/** How many mispronounced words to keep. Enough to practise, not a word list. */
const WEAK_WORD_LIMIT = 8;

/** Pull the summary numbers out of one result, tolerating every absent field. */
function extractStats(r: NonNullable<SpeechSuperResponse["result"]>): SpeakingStats {
  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

  // CEFR percentages arrive as sibling keys of the vocabulary counts
  // (`CEFR_A1_pct`, …), so they are collected by pattern rather than named
  // one by one — a new level would otherwise be silently dropped.
  const cefr: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.vocabulary_stats ?? {})) {
    const m = /^CEFR_([A-C][12])_pct$/.exec(k);
    if (m && typeof v === "number") cefr[m[1]] = v;
  }

  // Flatten every scored word, keep the worst. Silent words score 0 and are the
  // ones worth showing, so ties are broken by document order.
  const words: { word: string; score: number }[] = [];
  for (const sentence of r.sentences ?? []) {
    for (const d of sentence.details ?? []) {
      if (typeof d.word === "string" && typeof d.pronunciation === "number") {
        words.push({ word: d.word.replace(/[.,!?;:]+$/, ""), score: d.pronunciation });
      }
    }
  }
  words.sort((a, b) => a.score - b.score);

  const fillers: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.pause_filler ?? {})) {
    if (typeof v === "number" && v > 0) fillers[k] = v;
  }

  return {
    pronunciation: {
      good: num(r.pronunciation_stats?.good_word_pct),
      fair: num(r.pronunciation_stats?.fair_word_pct),
      poor: num(r.pronunciation_stats?.poor_word_pct),
    },
    grammar: {
      accurateSentencePct: num(r.grammar_stats?.accurate_sent_pct),
      errorCount: num(r.grammar_stats?.grammar_error_cnt),
    },
    vocabulary: {
      words: num(r.vocabulary_stats?.word_cnt),
      uniqueWords: num(r.vocabulary_stats?.unique_word_cnt),
      academicWords: Array.isArray(r.vocabulary_stats?.academic_words)
        ? (r.vocabulary_stats!.academic_words as string[]).filter((w) => typeof w === "string")
        : [],
      cefr,
    },
    fluency: {
      pauses: num(r.fluency_stats?.pause_cnt),
      liaisons: num(r.fluency_stats?.liaison_cnt),
      lossOfPlosion: num(r.fluency_stats?.loss_of_plosion_cnt),
    },
    pauseFillers: fillers,
    effectiveSpeechSec: num(r.effective_speech_length),
    durationSec: num(r.numeric_duration),
    rhythm: num(r.rhythm),
    weakWords: words.slice(0, WEAK_WORD_LIMIT),
  };
}
