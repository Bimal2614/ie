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
  };
};
