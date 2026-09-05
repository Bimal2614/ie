import "server-only";

import {
  adminEmails,
  env,
  isEmailConfigured,
  isS3Configured,
  isSpeakingAiConfigured,
  isWritingAiConfigured,
} from "@/lib/env";
import { mapWithConcurrency } from "@/lib/scoring/concurrency";
import { analyzeSpeaking } from "@/lib/speech/ielts-speaking";
import { keyFromUrl, presignGetUrl } from "@/lib/speech/s3";
import { scoreWriting } from "@/lib/writing/openai";
import {
  SMOKE_FIXTURES,
  type SmokeFixture,
  type SmokeGroup,
  type SmokeService,
  type SpeakingFixture,
  type WritingFixture,
} from "./smoketest-fixtures";

/**
 * Are the two AI scorers actually working right now?
 *
 * WHAT THIS ANSWERS THAT A PING CANNOT. Both services can be reachable, return
 * 200 and still be useless to a candidate: a rotated key, an expired presigned
 * URL the speaking service cannot fetch, a model deprecated out from under
 * `OPENAI_MODEL`, a response that no longer parses into a band. Every one of
 * those surfaces to a candidate as an answer that simply never gets a score, and
 * to us as silence — the scoring path is deliberately non-throwing, so an outage
 * leaves null bands and a log line nobody is reading. So this submits REAL past
 * answers through the SAME code the scorers use and asserts on the band that
 * comes back.
 *
 * IT WRITES NOTHING. No attempt, no `user_responses` row, no quota spent against
 * anybody's account: `analyzeSpeaking` and `scoreWriting` are pure calls to the
 * providers, and this calls them directly. A monitoring probe that left rows
 * behind would show up in someone's history and in the AI rate limiter.
 *
 * WHAT IT DELIBERATELY DOES NOT COVER: the submit actions, plan gating, the rate
 * limiter, and the sweeper — everything between a candidate pressing submit and
 * these calls. This is a check on the two third parties and our clients for
 * them, which is the part that breaks without us doing anything.
 */

/**
 * The band every fixture must beat.
 *
 * These are ordinary mid-band answers that score in the 5–7 range, so a result
 * at or below this is not the candidate having a bad day — it is the service
 * failing to hear the recording, grading against the wrong prompt, or falling
 * back to some degraded path that still answers 200. Set well below the real
 * scores so normal model variance never pages anyone.
 */
export const MIN_BAND = 4;

/**
 * How long a call may take before the report calls it slow.
 *
 * NOT A FAILURE. A speaking call is transcription plus judging and a long turn
 * legitimately takes the better part of a minute; the point of the mark is that
 * "everything passed but every call took three times as long as usual" is what
 * a provider looks like an hour before it starts erroring, and that is worth
 * seeing in the report rather than discovering afterwards.
 */
const SLOW_MS: Record<SmokeService, number> = { speaking: 60_000, writing: 45_000 };

/**
 * How long a recording's signed URL stays valid — the same hour the scorer
 * signs for, since the service fetches it the same way.
 */
const SIGNED_URL_TTL_SEC = 3600;

/**
 * How many checks are in flight at once.
 *
 * Three brings the full eleven-fixture catalogue home in about a minute — four
 * waves, paced by the Part 2 long turn — while staying below the concurrency
 * real scoring uses, so the probe can never be the reason a candidate's answer
 * is throttled. Raising it would shorten the run and is not worth it: nothing is
 * waiting on this, and a burst of eleven simultaneous requests to a provider
 * that is already struggling is how a monitor becomes part of the outage.
 */
const CHECK_CONCURRENCY = 3;

/** Why a check failed, in the terms an operator has to act on. */
export type SmokeFailureKind =
  /** The deployment has no key for this service — a config problem, not an outage. */
  | "not_configured"
  /** The recording could not be signed: S3 is unconfigured, or the URL is malformed. */
  | "no_audio"
  /** The provider answered, but not with a usable 200. */
  | "http_error"
  /** 200, but the service said it could not use this recording. Suspect the fixture. */
  | "unscorable"
  /** 200 with a band, and the band is too low to believe. */
  | "low_band";

export type SmokeCheck = {
  id: string;
  label: string;
  group: SmokeGroup;
  service: SmokeService;
  ok: boolean;
  /** The provider's HTTP status, or null when the request never got an answer. */
  status: number | null;
  band: number | null;
  /** Wall clock for the whole check, presigning included. */
  ms: number;
  slow: boolean;
  failure: { kind: SmokeFailureKind; detail: string } | null;
};

export type SmokeReport = {
  startedAt: string;
  tookMs: number;
  /** Which deployment this ran on, so a staging alert is never read as production. */
  origin: string;
  passed: number;
  failed: number;
  ok: boolean;
  minBand: number;
  checks: SmokeCheck[];
  /** What was wired up at the time — the first thing to look at on a failure. */
  config: {
    speaking: boolean;
    writing: boolean;
    s3: boolean;
    email: boolean;
    recipients: number;
  };
};

async function runSpeaking(fixture: SpeakingFixture): Promise<Omit<SmokeCheck, "ms" | "slow">> {
  const base = {
    id: fixture.id,
    label: fixture.label,
    group: fixture.group,
    service: fixture.service,
  };
  const fail = (kind: SmokeFailureKind, detail: string, status: number | null = null) => ({
    ...base,
    ok: false,
    status,
    band: null,
    failure: { kind, detail },
  });

  if (!isSpeakingAiConfigured()) {
    return fail("not_configured", "SPEAKING_API_URL and/or SPEAKING_API_KEY are unset");
  }

  const key = keyFromUrl(fixture.audioUrl);
  if (!key) return fail("no_audio", `could not read an object key out of ${fixture.audioUrl}`);

  // Signed exactly as scoring signs it, so a bucket or credential change breaks
  // the probe at the same moment it breaks real answers.
  const audioUrl = await presignGetUrl(key, SIGNED_URL_TTL_SEC);
  if (!audioUrl) {
    return fail("no_audio", isS3Configured() ? `could not presign ${key}` : "S3 is not configured");
  }

  const result = await analyzeSpeaking({
    audioUrl,
    part: fixture.part,
    question: fixture.question,
    cueCardPoints: fixture.cueCardPoints,
  });

  if (!result.ok) {
    // `no_speech` and `bad_audio` mean the service got our request and rejected
    // the RECORDING. On a fixture that has scored for months that points at the
    // object, the bucket or the signature — not at the service being down — so
    // it is reported as its own kind rather than as an outage.
    const kind: SmokeFailureKind =
      result.reason === "no_speech" || result.reason === "bad_audio" ? "unscorable" : "http_error";
    return fail(kind, `${result.reason}${result.detail ? `: ${result.detail}` : ""}`, result.status ?? null);
  }

  const band = result.assessment.overall.band;
  if (band <= MIN_BAND) {
    return {
      ...base,
      ok: false,
      status: result.status,
      band,
      failure: {
        kind: "low_band",
        detail: `band ${band} is not above ${MIN_BAND}${
          result.assessment.errors.length
            ? ` — service flagged ${result.assessment.errors.map((e) => e.code).join(", ")}`
            : ""
        }`,
      },
    };
  }

  return { ...base, ok: true, status: result.status, band, failure: null };
}

async function runWriting(fixture: WritingFixture): Promise<Omit<SmokeCheck, "ms" | "slow">> {
  const base = {
    id: fixture.id,
    label: fixture.label,
    group: fixture.group,
    service: fixture.service,
  };

  if (!isWritingAiConfigured()) {
    return {
      ...base,
      ok: false,
      status: null,
      band: null,
      failure: { kind: "not_configured", detail: "OPENAI_API_KEY is unset" },
    };
  }

  const result = await scoreWriting({
    text: fixture.text,
    taskType: fixture.taskType,
    module: fixture.module,
    questionPrompt: fixture.questionPrompt,
    wordMin: fixture.wordMin,
  });

  if (!result.ok) {
    return {
      ...base,
      ok: false,
      status: result.status ?? null,
      band: null,
      failure: {
        kind: "http_error",
        detail: `${result.reason}${result.detail ? `: ${result.detail}` : ""}`,
      },
    };
  }

  const band = result.score.overall;
  if (band <= MIN_BAND) {
    // An off-task verdict caps every criterion at 1, so it is the usual reason a
    // known-good essay comes back at the floor — say so, because it means the
    // prompt and the answer have been paired up wrongly, not that the model is ill.
    const compliance =
      result.score.taskCompliance === "on_task" ? "" : ` — graded ${result.score.taskCompliance}`;
    return {
      ...base,
      ok: false,
      status: result.status,
      band,
      failure: { kind: "low_band", detail: `band ${band} is not above ${MIN_BAND}${compliance}` },
    };
  }

  return { ...base, ok: true, status: result.status, band, failure: null };
}

/** Run one fixture and time it. Never throws: a thrown check is a failed check. */
async function runOne(fixture: SmokeFixture): Promise<SmokeCheck> {
  const startedAt = Date.now();
  let outcome: Omit<SmokeCheck, "ms" | "slow">;
  try {
    outcome =
      fixture.service === "speaking" ? await runSpeaking(fixture) : await runWriting(fixture);
  } catch (e) {
    // Both clients are written not to throw, so reaching here is a bug or an
    // AWS SDK error out of presigning. Report it rather than losing the run.
    outcome = {
      id: fixture.id,
      label: fixture.label,
      group: fixture.group,
      service: fixture.service,
      ok: false,
      status: null,
      band: null,
      failure: { kind: "http_error", detail: e instanceof Error ? e.message : String(e) },
    };
  }
  const ms = Date.now() - startedAt;
  return { ...outcome, ms, slow: ms > SLOW_MS[fixture.service] };
}

/**
 * Run every fixture and report. Does not send anything — see the cron route for
 * that, so the same run can be triggered by hand and just read.
 *
 * The whole catalogue, every time: see the note in smoketest-fixtures.ts for why
 * this stopped sampling. It makes each run comparable with the last one, which
 * is what turns a pass/fail into something you can watch drift.
 */
export async function runSmokeTest(): Promise<SmokeReport> {
  const startedAt = Date.now();

  const checks = await mapWithConcurrency(SMOKE_FIXTURES, CHECK_CONCURRENCY, runOne);

  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.length - passed;

  return {
    startedAt: new Date(startedAt).toISOString(),
    tookMs: Date.now() - startedAt,
    origin: env.APP_URL ?? "unknown deployment",
    passed,
    failed,
    // A run that checked nothing is not a pass. It cannot happen while the
    // catalogue has entries, and if it ever does the report should say so.
    ok: failed === 0 && checks.length > 0,
    minBand: MIN_BAND,
    checks,
    config: {
      speaking: isSpeakingAiConfigured(),
      writing: isWritingAiConfigured(),
      s3: isS3Configured(),
      email: isEmailConfigured(),
      recipients: adminEmails().length,
    },
  };
}
