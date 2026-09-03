import { NextResponse } from "next/server";
import { and, asc, eq, gt, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { mockTestAnswers, mockTestSessions, userResponses } from "@/db/schema";
import { isAuthorizedCron } from "@/lib/security/cron-auth";
import { userMayUseAiScoring } from "@/lib/security/plan-guard";
import { tryConsumeAi } from "@/lib/security/rate-guard";
import { scoreAttemptSpeakingFor, scoreAttemptWritingFor } from "@/lib/scoring/score-attempt";
import { scoreMockSpeakingFor, scoreMockWritingFor } from "@/lib/scoring/score-mock";

/**
 * The scoring sweeper: everything `after()` could not finish.
 *
 * WHY A CRON AND NOT A QUEUE. `after()` at submit is the fast path, but it is
 * bounded by the invocation that scheduled it — a long Speaking batch, a
 * provider outage, a throttle, or a deploy mid-flight all leave answers written
 * with `band = null` and nothing coming to fill them in. Until now the only
 * recovery was the candidate noticing and pressing retry.
 *
 * There is no jobs table because there does not need to be one: an AI-scored row
 * with no band IS the queue, both scorers already select exactly that, and both
 * are idempotent. This route is only a scheduler — it finds work the ordinary
 * path already knows how to do, and asks it to do it again.
 *
 * THE QUEUE PREDICATE MUST MATCH WHAT THE SCORERS CAN ACTUALLY DO. That is the
 * whole subtlety here. Some rows are band-less permanently and legitimately — a
 * speaking answer whose upload failed has no recording to score, a writing task
 * left blank has nothing to grade — and the scorers skip them by design. If the
 * queue selected those too they would be picked first, forever (they are always
 * the oldest), and the batch limit below would spend every run on rows that can
 * never leave it while genuinely pending answers waited behind them. So the
 * conditions here mirror the scorers' own, and a row nothing can do anything
 * with is never in the queue to begin with.
 *
 * SAFE TO RUN OFTEN. Nothing here can double-score — a row with a band is never
 * selected — and a run with nothing to do is two indexed queries.
 */

// Never prerendered, never cached: it mutates.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/**
 * Scoring is I/O against two third parties, so this needs room — a Speaking
 * batch is tens of seconds per wave. 300s is the fluid-compute default on every
 * Vercel plan; stated here so a lower project-level default cannot silently cut
 * a sweep in half. It is a ceiling, not a reservation.
 */
export const maxDuration = 300;

/**
 * How long an unscored answer is left alone before this touches it.
 *
 * PAST THE LONGEST `after()` CAN POSSIBLY RUN, which is what sets the number.
 * `after()` gets first refusal on every submit, and the two must never work the
 * same rows at once: the scorers claim nothing when they read, so a race is not
 * a no-op — both runs see `band IS NULL` and both pay a provider for every
 * answer. The submit routes cap at maxDuration = 300s, so nothing scheduled
 * there can still be running six minutes later, and this cannot overlap it.
 *
 * Three minutes was the first guess and it was too close: a full sitting's
 * thirteen subjective answers at six-way concurrency is three waves of speaking
 * calls, and a slow provider makes that a two-to-three minute batch. The cost of
 * the extra three minutes is latency on answers that were already late; the cost
 * of getting it wrong is paying twice for every one of them.
 *
 * (The airtight version is a claim — stamping rows as taken before scoring, so
 * lateness stops mattering. That needs a column, and this closes the window
 * without one.)
 */
const GRACE_MINUTES = 6;

/**
 * How far back to look.
 *
 * A row still failing hours later is not going to be rescued by another call: it
 * is an outage that outlived its answer, or a payload the provider will keep
 * rejecting. Past this it stops costing provider requests and becomes a support
 * question instead — visible in the logs, and in the same "no band" state the
 * report already knows how to explain.
 */
const LOOKBACK_HOURS = 3;

/**
 * The most attempts/sittings one run will pick up.
 *
 * A backlog after an outage could otherwise fire hundreds of provider calls from
 * one invocation and re-trip the very limit that caused the backlog. Small
 * batches run often drain just as fast, and keep each run short.
 */
const MAX_ATTEMPTS_PER_RUN = 5;
const MAX_SITTINGS_PER_RUN = 3;

/**
 * Stop STARTING new work this far into the run.
 *
 * The invocation is killed at maxDuration wherever it happens to be. Being
 * killed is survivable — the scorers write each row as its own result lands, and
 * whatever is left stays band-less for the next run — but it is survivable by
 * accident rather than by design, and it costs a provider call whose answer is
 * thrown away. Checking the clock between jobs means a run ends because it chose
 * to, with its log line written.
 */
const START_DEADLINE_MS = 240_000;

/**
 * Answers this can score, and the condition under which scoring one is possible.
 *
 * Kept beside each other deliberately: this is the definition of "pending", and
 * it has to stay honest about what score-attempt.ts and score-mock.ts will
 * actually attempt.
 */
const scorableResponse = or(
  // A writing task with something written in it. `->>` yields NULL for a missing
  // key and for JSON null alike, which coalesce folds into the empty case.
  and(
    eq(userResponses.section, "writing"),
    sql`coalesce(btrim(${userResponses.response}->>'text'), '') <> ''`,
  ),
  // A speaking answer with a recording that has not already been judged
  // unscorable (no speech in it — a permanent fact, recorded as feedback).
  and(
    eq(userResponses.section, "speaking"),
    isNotNull(userResponses.audioUrl),
    isNull(userResponses.aiFeedback),
  ),
);

/** The same definition, for a mock sitting's answers. */
const scorableMockAnswer = or(
  and(
    eq(mockTestAnswers.section, "writing"),
    sql`coalesce(btrim(${mockTestAnswers.response}->>'text'), '') <> ''`,
  ),
  and(
    eq(mockTestAnswers.section, "speaking"),
    isNotNull(mockTestAnswers.audioUrl),
    isNull(mockTestAnswers.aiFeedback),
  ),
);

/**
 * The two AI-scored sections, stated as their own condition.
 *
 * Redundant against the section equalities inside the predicates above — and
 * kept anyway, because it is what makes the partial index on
 * (band IS NULL AND section IN (…)) usable. Postgres has to PROVE a query
 * implies an index's predicate before it may use it, and proving that from a
 * two-branch OR is not something to rely on: without this the sweep silently
 * degrades to a sequential scan of the busiest table, every five minutes.
 */
const AI_SECTIONS = ["writing", "speaking"] as const;

type Sweep = { picked: number; scored: number; skipped: number };

/**
 * May this account's work be scored right now?
 *
 * Plan first, then allowance — a tier that never had AI scoring should not have
 * a rate-limit token spent to discover that. A refusal here is not a failure:
 * the row keeps its null band and the next run asks again.
 */
async function mayScoreNow(userId: string): Promise<boolean> {
  if (!(await userMayUseAiScoring(userId))) return false;
  // `tryConsumeAi`, never a guard that registers a violation. This runs every
  // five minutes against the same account for as long as its rows stay pending,
  // so a guard that escalated would deactivate a candidate for our own retries
  // within a quarter of an hour. See its comment in rate-guard.ts.
  return (await tryConsumeAi(userId)).allowed;
}

/** Practice and section-practice attempts. */
async function sweepAttempts(from: Date, until: Date, startedAt: number): Promise<Sweep> {
  // DISTINCT because an attempt has one row per answer and is scored as a unit:
  // seven pending answers are one job, not seven.
  //
  // ORDERED, and the order is part of the contract — an unordered LIMIT is
  // whatever the plan happens to return, which makes "did this attempt get
  // picked up?" unanswerable. Oldest first, so a backlog drains in the order it
  // formed and nothing waits behind work that arrived after it.
  //
  // GROUPED rather than DISTINCT ON, because the ordering is the point: DISTINCT
  // ON has to be ordered by its own key first, which would have made the LIMIT
  // pick attempts by uuid — arbitrary, and stable in the worst way, since the
  // same unlucky attempts sort last on every run. Grouping lets the oldest
  // pending answer decide, which is the only fair reading of a queue.
  const queue = await db
    .select({
      userId: userResponses.userId,
      attemptId: userResponses.attemptId,
      oldest: sql<Date>`min(${userResponses.createdAt})`.as("oldest"),
    })
    .from(userResponses)
    .where(
      and(
        isNull(userResponses.band),
        inArray(userResponses.section, [...AI_SECTIONS]),
        isNotNull(userResponses.attemptId),
        lt(userResponses.createdAt, until),
        gt(userResponses.createdAt, from),
        scorableResponse,
      ),
    )
    // Both columns, so the group is the attempt itself — an attempt belongs to
    // exactly one account, so this splits nothing that should stay together.
    .groupBy(userResponses.attemptId, userResponses.userId)
    .orderBy(asc(sql`min(${userResponses.createdAt})`))
    .limit(MAX_ATTEMPTS_PER_RUN);

  let scored = 0;
  let skipped = 0;

  // SEQUENTIAL, deliberately. Each attempt already fans out to six concurrent
  // provider calls internally; five attempts at once would be thirty, which is
  // how a recovery sweep becomes the next outage.
  for (const job of queue) {
    if (!job.attemptId) continue;
    if (Date.now() - startedAt > START_DEADLINE_MS) break;

    if (!(await mayScoreNow(job.userId))) {
      skipped++;
      continue;
    }

    try {
      // Writing first: they share one per-account budget, and a writing grade
      // arriving early is worth more than both arriving together.
      const w = await scoreAttemptWritingFor(job.userId, job.attemptId);
      const s = await scoreAttemptSpeakingFor(job.userId, job.attemptId);
      scored += w.scored + s.scored;
    } catch (e) {
      // One bad attempt must not end the sweep for the ones behind it.
      console.error("[cron/scoring] attempt failed", { attemptId: job.attemptId, error: e });
    }
  }

  return { picked: queue.length, scored, skipped };
}

/** Finished mock sittings. */
async function sweepSittings(from: Date, until: Date, startedAt: number): Promise<Sweep> {
  // Joined to the sitting because an answer row carries no `user_id` of its own:
  // the sitting owns it, and the scorers need the owner both to check the plan
  // and to spend the right account's allowance.
  const queue = await db
    .select({
      sessionId: mockTestAnswers.sessionId,
      userId: mockTestSessions.userId,
      oldest: sql<Date>`min(${mockTestAnswers.answeredAt})`.as("oldest"),
    })
    .from(mockTestAnswers)
    .innerJoin(mockTestSessions, eq(mockTestSessions.id, mockTestAnswers.sessionId))
    .where(
      and(
        isNull(mockTestAnswers.band),
        inArray(mockTestAnswers.section, [...AI_SECTIONS]),
        // `answeredAt` is stamped when the paper is handed in, so it is the
        // sitting's submit time — the clock the grace period assumes.
        lt(mockTestAnswers.answeredAt, until),
        gt(mockTestAnswers.answeredAt, from),
        scorableMockAnswer,
      ),
    )
    .groupBy(mockTestAnswers.sessionId, mockTestSessions.userId)
    .orderBy(asc(sql`min(${mockTestAnswers.answeredAt})`))
    .limit(MAX_SITTINGS_PER_RUN);

  let scored = 0;
  let skipped = 0;

  for (const job of queue) {
    if (Date.now() - startedAt > START_DEADLINE_MS) break;

    if (!(await mayScoreNow(job.userId))) {
      skipped++;
      continue;
    }

    try {
      const w = await scoreMockWritingFor(job.userId, job.sessionId);
      const s = await scoreMockSpeakingFor(job.userId, job.sessionId);
      scored += w.scored + s.scored;
    } catch (e) {
      console.error("[cron/scoring] sitting failed", { sessionId: job.sessionId, error: e });
    }
  }

  return { picked: queue.length, scored, skipped };
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    // 404, not 401: an unauthenticated caller learns nothing about whether this
    // route exists or whether a secret is configured.
    return new NextResponse(null, { status: 404 });
  }

  const startedAt = Date.now();
  const until = new Date(startedAt - GRACE_MINUTES * 60_000);
  const from = new Date(startedAt - LOOKBACK_HOURS * 3600_000);

  // One after the other, not concurrently: both spend the same provider budget,
  // and the deadline is shared so whatever the first sweep uses the second sees.
  const attempts = await sweepAttempts(from, until, startedAt);
  const sittings = await sweepSittings(from, until, startedAt);

  const result = { attempts, sittings, tookMs: Date.now() - startedAt };
  // Silent when there was nothing to do — this runs every five minutes forever,
  // and a log line per empty run buries the ones that matter. Loud whenever it
  // actually worked, so "how often is the fast path missing?" stays answerable.
  if (attempts.picked || sittings.picked) console.info("[cron/scoring] swept", result);

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

/** Same job, for schedulers that POST. */
export const POST = GET;
