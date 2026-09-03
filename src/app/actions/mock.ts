"use server";

import { and, asc, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  mockTests,
  mockTestSessions,
  mockTestAnswers,
  mockTestResults,
} from "@/db/schema";
import { requireUser } from "@/lib/dal";
import {
  QUESTION_TYPES,
  isObjective,
  rawToBand,
  type QuestionTypeKey,
  type SectionKey,
} from "@/lib/ielts";
import { answerKey, shiftLayoutGaps, type SetLayout } from "@/lib/question-content";
import { gradeMarks } from "@/lib/grading";
import {
  listMockTests,
  mockModuleOrder,
  openMockModule,
  openMockPaper,
  outlineMockTest,
  toClientMockPart,
  type ClientMockPart,
  type MockTestSummary,
} from "@/lib/mock-tests";
import {
  MOCK_MODULE_MINUTES,
  buildTimeline,
  lapsedBetween,
  parseTimeline,
  rebaseTimeline,
  resolveTimeline,
  timelineEnd,
  type MockTimeline,
} from "@/lib/mock-timing";
import { scoreMockSpeakingFor, scoreMockWritingFor } from "@/lib/scoring/score-mock";
import { scheduleMockScoring } from "@/lib/scoring/background";
import { guardGeneral, tryConsumeAi } from "@/lib/security/rate-guard";
import { checkAiScoring, checkMockAccess } from "@/lib/security/plan-guard";
import { mediaUrl } from "@/lib/media-urls";

/**
 * Sitting a mock test.
 *
 * THE PAPER IS CHOSEN, NOT ASSEMBLED. A candidate picks "Cambridge 19 · Test 2"
 * and gets exactly the twelve parts that paper is made of, in the book's order,
 * every time. Nothing here samples the content pool: the definition lives in
 * `mock_tests` + `mock_test_sections`, built once by `db:build:mocks`, so two
 * candidates comparing notes on the same test are comparing the same paper, and
 * a band means the same thing across sittings.
 *
 * THE CLOCK IS A TIMELINE, NOT A COUNTDOWN. See src/lib/mock-timing.ts. Every
 * "where am I / how long is left" answer is computed here from the stored plan
 * and the server's own clock, never taken from the client.
 */

/** Answers travel keyed `"<practiceSectionId>:<sheetNumber>"`. */
type AnswerMap = Record<string, Record<string, unknown>>;

/* ------------------------------------------------------------------ *
 * The catalogue
 * ------------------------------------------------------------------ */

export type MockTestCard = MockTestSummary & {
  /** An unfinished sitting of THIS paper, if the candidate has one. */
  inProgressSessionId: string | null;
  /** Their best overall band on it, and how many times they have sat it. */
  attempts: number;
  bestBand: string | null;
  lastSessionId: string | null;
};

/**
 * The mock catalogue for one module, with this candidate's history folded in.
 *
 * The module is resolved SERVER-SIDE from the profile unless the caller asks for
 * the other one deliberately — the same rule the section browser uses, so a
 * General candidate is never shown an Academic paper by default.
 */
export async function getMockCatalogue(
  moduleOverride?: string | null,
): Promise<{ module: "academic" | "general"; tests: MockTestCard[] }> {
  const user = await requireUser();
  await guardGeneral(user.id);

  const wanted = moduleOverride ?? user.targetModule;
  // Named `stream` rather than `module`: at module scope in a Next.js file that
  // identifier is reserved, and shadowing it is a build error.
  const stream: "academic" | "general" = wanted === "general" ? "general" : "academic";

  const tests = await listMockTests(stream);
  if (tests.length === 0) return { module: stream, tests: [] };

  // This candidate's history against these papers, REDUCED IN POSTGRES to one
  // row per paper. The four things a card shows — the open sitting, the
  // completed count, the best band, the latest report — are all aggregates, so
  // fetching the sittings themselves and folding them in JS would ship a row
  // per attempt to compute a row per paper: a candidate who has sat 40 papers
  // four times each transfers 160 rows to render 40 cards, and grows from
  // there every time they sit anything.
  //
  // `array_agg(... order by started_at desc) filter (...)` picks the most
  // recent id of one status inside the same single pass — the SQL spelling of
  // the `.find()` this used to do on a client-side sorted list. Runs on
  // mock_sessions_user_test_idx (user_id, mock_test_id, status).
  const latestId = (status: "in_progress" | "completed") =>
    sql<string | null>`(array_agg(${mockTestSessions.id} order by ${mockTestSessions.startedAt} desc)
      filter (where ${mockTestSessions.status} = ${status}))[1]`;

  const history = await db
    .select({
      mockTestId: mockTestSessions.mockTestId,
      attempts: sql<number>`count(*) filter (where ${mockTestSessions.status} = 'completed')`,
      // numeric(2,1), so max() is the band itself — no scan, no Math.max.
      bestBand: sql<string | null>`max(${mockTestResults.overallBand})`,
      inProgressSessionId: latestId("in_progress"),
      lastSessionId: latestId("completed"),
    })
    .from(mockTestSessions)
    // mock_results_session_uq makes this at most 1:1, so it cannot inflate the
    // count above.
    .leftJoin(mockTestResults, eq(mockTestResults.sessionId, mockTestSessions.id))
    .where(
      and(
        eq(mockTestSessions.userId, user.id),
        inArray(
          mockTestSessions.mockTestId,
          tests.map((t) => t.id),
        ),
      ),
    )
    .groupBy(mockTestSessions.mockTestId);

  const byTest = new Map(history.map((h) => [h.mockTestId, h]));

  return {
    module: stream,
    tests: tests.map((t) => {
      const mine = byTest.get(t.id);
      return {
        ...t,
        inProgressSessionId: mine?.inProgressSessionId ?? null,
        attempts: Number(mine?.attempts ?? 0),
        // Re-formatted rather than passed through: max() drops the column's
        // typmod, so the scale is not guaranteed by the type alone.
        bestBand: mine?.bestBand == null ? null : Number(mine.bestBand).toFixed(1),
        lastSessionId: mine?.lastSessionId ?? null,
      };
    }),
  };
}

/* ------------------------------------------------------------------ *
 * Starting and resuming
 * ------------------------------------------------------------------ */

/**
 * Open a paper: resume the sitting already in progress, or start a new one.
 *
 * RESUME RATHER THAN RESTART is the point. Starting a second sitting of a paper
 * you are 20 minutes into would hand back the time the exam has already spent —
 * which is precisely the thing the timeline exists to prevent.
 */
export async function startMock(formData: FormData): Promise<void> {
  const user = await requireUser();
  await guardGeneral(user.id);

  // Full papers are a paid feature. A form action cannot hand a message back,
  // so a blocked candidate goes to the pricing page with the reason in the URL
  // rather than being bounced silently to a catalogue they cannot use.
  const gate = await checkMockAccess(user);
  if (gate) redirect(`/pricing?blocked=mock&plan=${gate.requiredPlan}`);

  const mockTestId = String(formData.get("mockTestId") ?? "");
  if (!mockTestId) redirect("/mock-tests");

  const [test] = await db
    .select({ id: mockTests.id, module: mockTests.module })
    .from(mockTests)
    .where(and(eq(mockTests.id, mockTestId), eq(mockTests.isActive, true)))
    .limit(1);
  if (!test) redirect("/mock-tests");

  const [open] = await db
    .select({ id: mockTestSessions.id })
    .from(mockTestSessions)
    .where(
      and(
        eq(mockTestSessions.userId, user.id),
        eq(mockTestSessions.mockTestId, test.id),
        eq(mockTestSessions.status, "in_progress"),
      ),
    )
    .limit(1);
  if (open) redirect(`/mock-test/${open.id}`);

  const order = await mockModuleOrder(test.id);
  if (order.length === 0) redirect("/mock-tests");

  const startedAt = new Date();
  const timeline = buildTimeline(order, startedAt);
  const first = timeline[0];

  const [session] = await db
    .insert(mockTestSessions)
    .values({
      userId: user.id,
      mockTestId: test.id,
      module: test.module,
      status: "in_progress",
      currentSection: first.section,
      currentSectionIndex: 0,
      currentSectionEndsAt: new Date(Date.parse(first.endsAt)),
      timeline,
      startedAt,
      expiresAt: timelineEnd(timeline),
    })
    .returning({ id: mockTestSessions.id });

  redirect(`/mock-test/${session.id}`);
}

/** Abandon an unfinished sitting so the paper can be started fresh. */
export async function abandonMock(formData: FormData): Promise<void> {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) redirect("/mock-tests");

  await db
    .update(mockTestSessions)
    .set({ status: "abandoned", completedAt: new Date() })
    .where(
      and(
        eq(mockTestSessions.id, sessionId),
        eq(mockTestSessions.userId, user.id),
        eq(mockTestSessions.status, "in_progress"),
      ),
    );

  redirect("/mock-tests");
}

/* ------------------------------------------------------------------ *
 * The sitting the player loads
 * ------------------------------------------------------------------ */

export type MockModuleView = {
  section: SectionKey;
  index: number;
  minutes: number;
  parts: ClientMockPart[];
};

/**
 * Why a sitting could not be opened. "finished" and "missing" lead to different
 * places — a completed paper has a report to show, a paper that is not yours has
 * nothing — and collapsing both to null sent every finished sitting back to the
 * catalogue instead of to its result.
 */
export type MockSittingState =
  | { status: "active"; data: MockSittingData }
  | { status: "finished" }
  | { status: "missing" };

export type MockSittingData = {
  sessionId: string;
  mockTestId: string;
  title: string;
  module: "academic" | "general";
  /** The paper's running order — the progress rail, with no content in it. */
  modules: { section: SectionKey; index: number; parts: number; questions: number; minutes: number }[];
  /** The module the clock is in, loaded in full. */
  current: MockModuleView;
  /** Seconds left in it, from the server's clock. */
  remainingSeconds: number;
  /** Modules whose time ran out rather than being handed in. */
  lapsedIndexes: number[];
  draftAnswers: Record<string, unknown>;
  draftTimings: Record<string, number>;
};

/** Owner-scoped read of a sitting row plus its parsed timeline. */
async function loadSitting(sessionId: string, userId: string) {
  const [session] = await db
    .select()
    .from(mockTestSessions)
    .where(and(eq(mockTestSessions.id, sessionId), eq(mockTestSessions.userId, userId)))
    .limit(1);
  if (!session) return null;
  return { session, timeline: parseTimeline(session.timeline) };
}

/**
 * Write the resolved position back onto the row.
 *
 * `timeline` is the truth, but `current_section` and `current_section_ends_at`
 * are what the rest of the system reads — which module a candidate is in, and
 * when it ends. Keeping them in step on every load is what makes "log the module
 * the user is on and when it ends" a fact about the row rather than something
 * only the player knows.
 */
async function syncPosition(
  sessionId: string,
  timeline: MockTimeline,
  index: number,
  section: SectionKey,
): Promise<void> {
  const slot = timeline[index];
  await db
    .update(mockTestSessions)
    .set({
      currentSection: section,
      currentSectionIndex: index,
      currentSectionEndsAt: slot ? new Date(Date.parse(slot.endsAt)) : null,
    })
    .where(eq(mockTestSessions.id, sessionId));
}

/**
 * Load a sitting for the player.
 *
 * Returns null when the paper is over — the caller sends the candidate to their
 * report. A sitting whose clock ran out while nobody was looking is submitted
 * here, on the next load, exactly as it would be collected at the end of the
 * exam whether or not the candidate was still in the room.
 */
export async function getMockSitting(sessionId: string): Promise<MockSittingState> {
  const user = await requireUser();

  const loaded = await loadSitting(sessionId, user.id);
  if (!loaded) return { status: "missing" };
  const { session, timeline } = loaded;
  if (session.status !== "in_progress") return { status: "finished" };

  const outline = await outlineMockTest(session.mockTestId);
  if (!outline || outline.modules.length === 0) return { status: "missing" };

  const position = resolveTimeline(timeline);
  if (!position || position.expired) {
    // Time is up. Grade whatever was autosaved — the answers a candidate wrote
    // before walking away are still their answers, and an unattended paper is
    // still collected at the end of the exam.
    await submitSitting(
      session.id,
      user.id,
      (session.draftAnswers ?? {}) as AnswerMap,
      session.draftTimings ?? {},
    );
    return { status: "finished" };
  }

  const active = outline.modules[position.index] ?? outline.modules[outline.modules.length - 1];
  const parts = await openMockModule(session.mockTestId, active.section);

  await syncPosition(session.id, timeline, position.index, active.section);

  return {
    status: "active",
    data: {
      sessionId: session.id,
      mockTestId: session.mockTestId,
      title: outline.title,
      module: session.module,
      modules: outline.modules,
      current: {
        section: active.section,
        index: position.index,
        minutes: MOCK_MODULE_MINUTES[active.section],
        parts: parts.map(toClientMockPart),
      },
      remainingSeconds: position.remainingSeconds,
      // Compared against where the sitting was last recorded, not against zero:
      // this is what the clock took while nobody was looking.
      lapsedIndexes: lapsedBetween(session.currentSectionIndex, position.index),
      draftAnswers: (session.draftAnswers as Record<string, unknown>) ?? {},
      draftTimings: (session.draftTimings as Record<string, number>) ?? {},
    },
  };
}

/**
 * Autosave. Called on a debounce from the player so a resumed sitting restores
 * what was typed and selected. Owner-scoped, and a no-op on a finished sitting.
 */
export async function saveMockProgress(
  sessionId: string,
  answers: Record<string, unknown>,
  timings: Record<string, number>,
): Promise<void> {
  const user = await requireUser();
  await db
    .update(mockTestSessions)
    .set({ draftAnswers: answers, draftTimings: timings })
    .where(
      and(
        eq(mockTestSessions.id, sessionId),
        eq(mockTestSessions.userId, user.id),
        eq(mockTestSessions.status, "in_progress"),
      ),
    );
}

export type AdvanceResult =
  | { done: true }
  | {
      done: false;
      current: MockModuleView;
      remainingSeconds: number;
      lapsedIndexes: number[];
    };

/**
 * Finish the current module and open the next one.
 *
 * `fromIndex` is the module the CLIENT believes it is in, and it is a claim, not
 * an instruction. If the server's clock has already rolled past it — the bell
 * went while the request was in flight, or the candidate was away — the roll-over
 * IS the advance, and the module the clock is actually in is returned instead.
 * Without that check, a request landing a few milliseconds after a module's
 * deadline would advance from the module AFTER the one being left, skipping a
 * whole hour of the paper.
 *
 * Finishing early rebases the rest of the plan to start now, so the wait is
 * given back but never the time.
 */
export async function advanceMockModule(
  sessionId: string,
  fromIndex: number,
  answers: Record<string, unknown>,
  timings: Record<string, number>,
): Promise<AdvanceResult> {
  const user = await requireUser();

  const loaded = await loadSitting(sessionId, user.id);
  if (!loaded) return { done: true };
  const { session, timeline } = loaded;
  if (session.status !== "in_progress") return { done: true };

  const outline = await outlineMockTest(session.mockTestId);
  if (!outline || outline.modules.length === 0) return { done: true };

  const position = resolveTimeline(timeline);
  if (!position || position.expired) {
    await submitSitting(session.id, user.id, answers as AnswerMap, timings);
    return { done: true };
  }

  const from = Math.max(0, Math.min(fromIndex, outline.modules.length - 1));
  let index = position.index;
  let plan = timeline;
  let remainingSeconds = position.remainingSeconds;
  // Nothing lapsed if the candidate is handing this module in themselves; the
  // roll-over branch below leaves this as the modules the bell closed for them.
  let lapsed: number[] = lapsedBetween(from, position.index);

  if (position.index <= from) {
    // The candidate is finishing the module they are actually in.
    index = from + 1;
    if (index >= outline.modules.length) {
      await submitSitting(session.id, user.id, answers as AnswerMap, timings);
      return { done: true };
    }
    plan = rebaseTimeline(timeline, index, new Date());
    const next = resolveTimeline(plan);
    remainingSeconds = next?.remainingSeconds ?? MOCK_MODULE_MINUTES[outline.modules[index].section] * 60;
    lapsed = [];
  }

  const active = outline.modules[index];
  const parts = await openMockModule(session.mockTestId, active.section);

  await db
    .update(mockTestSessions)
    .set({
      timeline: plan,
      currentSection: active.section,
      currentSectionIndex: index,
      currentSectionEndsAt: plan[index] ? new Date(Date.parse(plan[index].endsAt)) : null,
      expiresAt: timelineEnd(plan),
      draftAnswers: answers,
      draftTimings: timings,
    })
    .where(eq(mockTestSessions.id, sessionId));

  return {
    done: false,
    current: {
      section: active.section,
      index,
      minutes: MOCK_MODULE_MINUTES[active.section],
      parts: parts.map(toClientMockPart),
    },
    remainingSeconds,
    lapsedIndexes: lapsed,
  };
}

/** Hand the paper in early. */
export async function finishMock(
  sessionId: string,
  answers: AnswerMap,
  timings: Record<string, number> = {},
): Promise<void> {
  const user = await requireUser();
  await guardGeneral(user.id);
  await submitSitting(sessionId, user.id, answers, timings);
  // Scored after the response goes out, not from the report page. The trigger
  // there used to be the ONLY path: hand the paper in, close the tab, and the
  // Writing and Speaking bands were never computed at all. See
  // scheduleMockScoring — and the sweeper cron behind it, for a batch too long
  // to finish inside this invocation.
  scheduleMockScoring(user.id, sessionId);
  redirect(`/results/${sessionId}`);
}

/* ------------------------------------------------------------------ *
 * Grading
 * ------------------------------------------------------------------ */

type Tally = { correct: number; total: number };

/**
 * Mark a sitting and write its report.
 *
 * Idempotent: a sitting already out of `in_progress` returns immediately, so the
 * auto-submit on expiry and a candidate pressing Finish at the same moment
 * cannot both write a report.
 *
 * Answers are keyed by part id + SHEET number; the answer key inside the part is
 * keyed by the part's own numbering. The offset between the two is applied once,
 * here, when the two are matched up.
 */
async function submitSitting(
  sessionId: string,
  userId: string,
  answers: AnswerMap,
  timings: Record<string, number>,
): Promise<void> {
  const [session] = await db
    .update(mockTestSessions)
    .set({ status: "completed", completedAt: new Date(), draftAnswers: answers, draftTimings: timings })
    .where(
      and(
        eq(mockTestSessions.id, sessionId),
        eq(mockTestSessions.userId, userId),
        eq(mockTestSessions.status, "in_progress"),
      ),
    )
    .returning({ id: mockTestSessions.id, mockTestId: mockTestSessions.mockTestId, module: mockTestSessions.module });
  if (!session) return; // already finished, or not this candidate's

  const parts = await openMockPaper(session.mockTestId);

  const tally: Record<SectionKey, Tally> = {
    listening: { correct: 0, total: 0 },
    reading: { correct: 0, total: 0 },
    writing: { correct: 0, total: 0 },
    speaking: { correct: 0, total: 0 },
  };
  const rows: (typeof mockTestAnswers.$inferInsert)[] = [];

  for (const part of parts) {
    for (const group of part.questions?.groups ?? []) {
      const qt = group.questionType as QuestionTypeKey;
      const meta = QUESTION_TYPES[qt];
      for (const item of group.items) {
        const sheetNumber = item.n + part.numberOffset;
        const marks = item.marks ?? 1;
        const ans = answers[answerKey(part.sectionId, sheetNumber)];
        const ca = (item.answer as Record<string, unknown> | undefined) ?? null;

        let isCorrect: boolean | null = null;
        let earned = 0;
        if (meta && isObjective(meta.family) && ca) {
          // Marks, not rows: a "choose TWO letters" item is ONE question worth
          // two of the paper's 40 marks, and each letter is marked on its own.
          earned = gradeMarks(meta.family, ans, ca, marks);
          isCorrect = earned === marks;
          tally[part.section].total += marks;
          tally[part.section].correct += earned;
        }

        // Only what was attempted is written. A row per untouched gap would put
        // 80 blank answers in every report and count them as answered.
        if (!ans) continue;
        rows.push({
          sessionId,
          sectionId: part.sectionId,
          questionNumber: item.n,
          sheetNumber,
          section: part.section,
          questionType: qt,
          marks,
          response: ans,
          // Recording location captured at record time. The band is NEVER taken
          // from the client — it is computed server-side by scoreMockSpeaking.
          audioUrl: typeof ans.audioUrl === "string" ? ans.audioUrl : null,
          isCorrect,
          rawScore: isCorrect === null ? null : earned,
          timeSpentSec: timings[answerKey(part.sectionId, sheetNumber)] ?? null,
        });
      }
    }
  }

  if (rows.length > 0) {
    // A full paper is 80+ answers — one insert, not 80 round trips.
    await db.insert(mockTestAnswers).values(rows).onConflictDoNothing();
  }

  // A full mock draws a complete 40-mark Listening and Reading paper, so the
  // official raw→band tables apply — this is the case they were written for.
  // General Training Reading has its own table; rawToBand picks it by module.
  const lBand = tally.listening.total > 0 ? rawToBand("listening", tally.listening.correct) : null;
  const rBand =
    tally.reading.total > 0 ? rawToBand("reading", tally.reading.correct, session.module) : null;
  const present = [lBand, rBand].filter((b): b is number => b !== null);
  const overall =
    present.length > 0 ? Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 2) / 2 : null;
  const s = (n: number | null) => (n === null ? null : n.toFixed(1));

  await db
    .insert(mockTestResults)
    .values({
      sessionId,
      userId,
      mockTestId: session.mockTestId,
      module: session.module,
      listeningBand: s(lBand),
      readingBand: s(rBand),
      // Filled in by the AI scorers once the report is open — see below.
      writingBand: null,
      speakingBand: null,
      overallBand: s(overall),
      listeningRaw: tally.listening.correct,
      readingRaw: tally.reading.correct,
      sectionBreakdown: tally,
    })
    .onConflictDoNothing();
}

/* ------------------------------------------------------------------ *
 * AI scoring — Writing and Speaking, after the paper is handed in
 * ------------------------------------------------------------------ */

/**
 * Retry Writing + Speaking scoring for a finished sitting.
 *
 * THE AUTHORITATIVE RUN IS `scheduleMockScoring` AT HAND-IN, and the sweeper
 * cron behind it — this is the ask-again path for when neither could finish,
 * kept because the report screen is where a candidate notices a missing band.
 *
 * The work itself lives in src/lib/scoring/score-mock.ts. It cannot live here:
 * everything exported from a "use server" module is a callable endpoint, so a
 * userId-taking scorer exported from this file would let any client spend
 * someone else's AI quota. These wrappers establish the user themselves.
 *
 * Idempotent — only rows with no band are touched, so a retry or a second visit
 * cannot double-charge the API.
 */
export async function scoreMockSpeaking(sessionId: string): Promise<{ scored: number }> {
  const user = await requireUser();
  // Defence in depth: starting the sitting was already gated, but a plan can
  // lapse between hand-in and the report being opened.
  if (checkAiScoring(user)) return { scored: 0 };

  if (!(await tryConsumeAi(user.id)).allowed) return { scored: 0 };

  return scoreMockSpeakingFor(user.id, sessionId);
}

/**
 * How many of a sitting's subjective answers are still waiting for a band.
 *
 * The report polls this instead of firing the scorers on mount. Firing on mount
 * was a double charge: `finishMock` schedules the same work with `after()` and
 * then redirects here, so the page opened while that run was still going, read
 * the same `band IS NULL` rows, and called both providers a second time for
 * every answer. Idempotency does not save you there — it is read-then-write with
 * no claim, so two runs racing simply both read "unscored".
 *
 * COUNTS ONLY WHAT CAN ACTUALLY BE SCORED, for the same reason the sweeper does:
 * a speaking answer whose upload failed and a writing task left blank are
 * settled, not pending, and counting them would leave the report spinning
 * forever on a band that is never coming.
 */
export async function mockScoringStatus(sessionId: string): Promise<{ pending: number }> {
  const user = await requireUser();

  const [row] = await db
    .select({ pending: sql<number>`count(*)::int` })
    .from(mockTestAnswers)
    .innerJoin(mockTestSessions, eq(mockTestSessions.id, mockTestAnswers.sessionId))
    .where(
      and(
        eq(mockTestAnswers.sessionId, sessionId),
        eq(mockTestSessions.userId, user.id),
        isNull(mockTestAnswers.band),
        or(
          and(
            eq(mockTestAnswers.section, "writing"),
            sql`coalesce(btrim(${mockTestAnswers.response}->>'text'), '') <> ''`,
          ),
          and(
            eq(mockTestAnswers.section, "speaking"),
            isNotNull(mockTestAnswers.audioUrl),
            isNull(mockTestAnswers.aiFeedback),
          ),
        ),
      ),
    );

  return { pending: row?.pending ?? 0 };
}

/** Retry Writing scoring for a finished sitting. Mirrors scoreMockSpeaking. */
export async function scoreMockWriting(sessionId: string): Promise<{ scored: number }> {
  const user = await requireUser();
  if (checkAiScoring(user)) return { scored: 0 };

  if (!(await tryConsumeAi(user.id)).allowed) return { scored: 0 };

  return scoreMockWritingFor(user.id, sessionId);
}

/* ------------------------------------------------------------------ *
 * The report, and its per-module drill-down
 * ------------------------------------------------------------------ */

export type MockReviewItem = {
  key: string;
  /** The number printed on the paper's answer sheet. */
  number: number;
  prompt: string | null;
  content: unknown;
  correctAnswer: unknown;
  explanation: string | null;
  response: unknown;
  isCorrect: boolean | null;
  marks: number;
  earned: number;
  band: string | null;
  aiFeedback: unknown;
  timeSpentSec: number | null;
  /**
   * The candidate's own recording, as an app-relative playback path — never the
   * `s3://` location. Review of a speaking answer without the audio is a band
   * with nothing behind it.
   */
  audioUrl: string | null;
  /** What the scorer heard. Explains a band the candidate will not recognise. */
  transcript: string | null;
};

export type MockReviewPart = {
  sectionId: string;
  partNumber: number;
  title: string;
  instructions: string | null;
  questionType: QuestionTypeKey;
  passageText: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  layout: SetLayout | null;
  startNumber: number;
  items: MockReviewItem[];
};

export type MockSectionReview = {
  section: SectionKey;
  parts: MockReviewPart[];
};

/**
 * One module of a finished sitting, with the candidate's answers and verdicts.
 *
 * The answer key is read from the content, not frozen into the answer row: the
 * paper is a fixed definition, so the key that marked it is the key that is still
 * there. Owner-scoped; unanswered items are included so a review shows what was
 * left blank rather than quietly omitting it.
 */
export async function getMockSectionReview(
  sessionId: string,
  section: SectionKey,
): Promise<MockSectionReview | null> {
  const user = await requireUser();

  const [session] = await db
    .select({ id: mockTestSessions.id, mockTestId: mockTestSessions.mockTestId })
    .from(mockTestSessions)
    .where(and(eq(mockTestSessions.id, sessionId), eq(mockTestSessions.userId, user.id)))
    .limit(1);
  if (!session) return null;

  const parts = await openMockModule(session.mockTestId, section);
  if (parts.length === 0) return null;

  const answered = await db
    .select()
    .from(mockTestAnswers)
    .where(and(eq(mockTestAnswers.sessionId, sessionId), eq(mockTestAnswers.section, section)))
    .orderBy(asc(mockTestAnswers.sheetNumber));

  const byItem = new Map(answered.map((a) => [answerKey(a.sectionId, a.sheetNumber), a]));

  return {
    section,
    parts: parts.flatMap((part) =>
      (part.questions?.groups ?? []).map((group) => ({
        sectionId: part.sectionId,
        partNumber: part.partNumber,
        title: part.title,
        instructions: group.instruction ?? part.instructions,
        questionType: group.questionType as QuestionTypeKey,
        passageText: part.passageText,
        audioUrl: part.audioUrl,
        imageUrl: part.imageUrl,
        // Shifted, because `item.number` below is the SHEET number: a layout
        // still saying `[[1]]` would bind its gap to the wrong item on any
        // module whose parts were renumbered.
        layout: shiftLayoutGaps(group.layout, part.numberOffset),
        startNumber: group.from + part.numberOffset,
        items: group.items.map((item) => {
          const number = item.n + part.numberOffset;
          const a = byItem.get(answerKey(part.sectionId, number));
          const marks = item.marks ?? 1;
          return {
            key: answerKey(part.sectionId, number),
            number,
            prompt: item.prompt ?? null,
            content:
              item.options || item.cueCard
                ? {
                    ...(item.options ? { options: item.options, selectCount: item.selectCount } : {}),
                    ...(item.cueCard ? { cueCard: item.cueCard } : {}),
                  }
                : null,
            correctAnswer: item.answer ?? null,
            explanation: item.explanation ?? null,
            response: a?.response ?? null,
            isCorrect: a?.isCorrect ?? null,
            marks,
            earned: a?.rawScore ?? 0,
            band: a?.band ?? null,
            aiFeedback: a?.aiFeedback ?? null,
            timeSpentSec: a?.timeSpentSec ?? null,
            // Keyed by the ANSWER row, not the item: the route re-checks that
            // this recording belongs to the caller before presigning it.
            audioUrl: a ? mediaUrl.recording(a.id, a.audioUrl) : null,
            transcript: a?.transcript ?? null,
          };
        }),
      })),
    ),
  };
}

export type MockResultData = {
  sessionId: string;
  mockTestId: string | null;
  title: string | null;
  module: "academic" | "general";
  completedAt: Date | null;
  overallBand: string | null;
  bands: { section: SectionKey; band: string | null; raw: number | null; total: number | null }[];
};

export async function getMockResult(sessionId: string): Promise<MockResultData | null> {
  const user = await requireUser();

  const [row] = await db
    .select({
      r: mockTestResults,
      completedAt: mockTestSessions.completedAt,
      title: mockTests.title,
    })
    .from(mockTestResults)
    .innerJoin(mockTestSessions, eq(mockTestResults.sessionId, mockTestSessions.id))
    .leftJoin(mockTests, eq(mockTestSessions.mockTestId, mockTests.id))
    .where(and(eq(mockTestResults.sessionId, sessionId), eq(mockTestResults.userId, user.id)))
    .limit(1);
  if (!row) return null;

  const breakdown = (row.r.sectionBreakdown ?? {}) as Record<string, Tally>;
  const totalOf = (s: SectionKey) => breakdown[s]?.total ?? null;

  return {
    sessionId: row.r.sessionId,
    mockTestId: row.r.mockTestId,
    title: row.title,
    module: row.r.module,
    completedAt: row.completedAt,
    overallBand: row.r.overallBand,
    bands: [
      { section: "listening", band: row.r.listeningBand, raw: row.r.listeningRaw, total: totalOf("listening") },
      { section: "reading", band: row.r.readingBand, raw: row.r.readingRaw, total: totalOf("reading") },
      { section: "writing", band: row.r.writingBand, raw: null, total: null },
      { section: "speaking", band: row.r.speakingBand, raw: null, total: null },
    ],
  };
}

export type MockResultSummary = {
  sessionId: string;
  title: string | null;
  module: "academic" | "general";
  overallBand: string | null;
  completedAt: Date | null;
};

/** Past completed sittings for the current candidate, newest first. */
export async function getMockResults(): Promise<MockResultSummary[]> {
  const user = await requireUser();
  const rows = await db
    .select({
      sessionId: mockTestResults.sessionId,
      module: mockTestResults.module,
      overallBand: mockTestResults.overallBand,
      completedAt: mockTestSessions.completedAt,
      title: mockTests.title,
    })
    .from(mockTestResults)
    .innerJoin(mockTestSessions, eq(mockTestResults.sessionId, mockTestSessions.id))
    .leftJoin(mockTests, eq(mockTestSessions.mockTestId, mockTests.id))
    .where(eq(mockTestResults.userId, user.id))
    .orderBy(desc(mockTestSessions.completedAt));

  return rows.map((r) => ({
    sessionId: r.sessionId,
    title: r.title,
    module: r.module,
    overallBand: r.overallBand,
    completedAt: r.completedAt,
  }));
}

