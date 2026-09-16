"use server";

import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  mockTests,
  mockTestSections,
  mockTestSessions,
  mockTestAnswers,
  mockTestResults,
} from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { isUuid } from "@/lib/uuid";
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
import { scheduleMockAnswerScoring, scheduleMockScoring } from "@/lib/scoring/background";
import { mockScoringArriving } from "@/lib/scoring/pending";
import { guardGeneral } from "@/lib/security/rate-guard";
import { checkAiScoring, checkMockAccess } from "@/lib/security/plan-guard";
import { keyFromUrl } from "@/lib/speech/s3";
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
 *
 * `openSitting` is looked up SEPARATELY from the per-paper history below, and
 * not as a column of it, because the rule it serves is not per-paper: one open
 * sitting blocks every other paper (see `startMock`), including ones in the
 * other stream that this catalogue is not even showing. Folding it into a query
 * already filtered to `tests` would miss exactly those, and the candidate would
 * be offered a Start that the server then refuses.
 */
export async function getMockCatalogue(moduleOverride?: string | null): Promise<{
  module: "academic" | "general";
  tests: MockTestCard[];
  openSitting: OpenSitting | null;
}> {
  const user = await requireUser();
  await guardGeneral(user.id);

  const wanted = moduleOverride ?? user.targetModule;
  // Named `stream` rather than `module`: at module scope in a Next.js file that
  // identifier is reserved, and shadowing it is a build error.
  const stream: "academic" | "general" = wanted === "general" ? "general" : "academic";

  const [tests, openSitting] = await Promise.all([
    listMockTests(stream),
    openSittingFor(user.id),
  ]);
  if (tests.length === 0) return { module: stream, tests: [], openSitting };

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
    openSitting,
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

/** The sitting a candidate is in the middle of, whichever paper it is on. */
export type OpenSitting = {
  sessionId: string;
  mockTestId: string;
  /** The paper's own name — "Cambridge 19 · Test 2" — for the block message. */
  title: string;
};

/**
 * The one sitting this candidate has open, or null.
 *
 * NOT MERELY `status = 'in_progress'`. A sitting is only closed when someone
 * opens it — `getMockSitting` grades a lapsed paper on the way past — so a
 * candidate who started a mock and never came back leaves a row that says
 * "in progress" for as long as nobody looks at it. Treating that as an open
 * sitting would lock them out of every other paper forever on the strength of a
 * clock that ran out weeks ago, which is the trap the one-at-a-time rule would
 * otherwise set for exactly the people least likely to work out why.
 *
 * So the deadline decides, not the status: a sitting is open while it still has
 * time on it. One that has run out is over whether or not the row has caught up,
 * and opening it grades it. Runs on mock_sessions_expiry_idx (status,
 * expires_at).
 */
async function openSittingFor(userId: string): Promise<OpenSitting | null> {
  const [row] = await db
    .select({
      sessionId: mockTestSessions.id,
      mockTestId: mockTestSessions.mockTestId,
      title: mockTests.title,
    })
    .from(mockTestSessions)
    .innerJoin(mockTests, eq(mockTests.id, mockTestSessions.mockTestId))
    .where(
      and(
        eq(mockTestSessions.userId, userId),
        eq(mockTestSessions.status, "in_progress"),
        gt(mockTestSessions.expiresAt, new Date()),
      ),
    )
    // Newest first, so the sitting a candidate is actually in wins over an older
    // one that somehow survived — they go to the paper they just started.
    .orderBy(desc(mockTestSessions.startedAt))
    .limit(1);

  return row ?? null;
}

/**
 * Open a paper: resume the sitting already in progress, or start a new one.
 *
 * ONE SITTING AT A TIME, ACROSS THE WHOLE ACCOUNT. A mock clock is wall-clock
 * time that does not stop for anything — so two open sittings are not two
 * candidates' worth of practice, they are one paper being destroyed in the
 * background while the other is sat. Starting Test 2 twenty minutes into Test 1
 * used to be a click, and the report it produced for Test 1 was of a paper
 * nobody ever answered.
 *
 * RESUME RATHER THAN RESTART is the other half of the same rule, and it is why
 * this redirects to the open sitting rather than refusing: starting a second
 * sitting of a paper you are 20 minutes into would hand back the time the exam
 * has already spent, which is precisely what the timeline exists to prevent.
 * A candidate who does not want to go back to it abandons it (`abandonMock`) —
 * that is a decision with a consequence, not a stray click.
 *
 * A COMPLETED PAPER CAN BE SAT AGAIN. Once the report exists the sitting is
 * over, the band is recorded, and nothing is lost by taking the paper a second
 * time. Only an OPEN sitting blocks.
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

  // Deliberately NOT filtered to this paper — see the note above. Whichever
  // sitting is open is the one this candidate is in, and it is where they go.
  // This is the real gate; the catalogue's disabled buttons are only its
  // manners.
  const open = await openSittingFor(user.id);
  if (open) redirect(`/mock-test/${open.sessionId}`);

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

/**
 * Give up on an unfinished sitting.
 *
 * THE WAY OUT OF THE ONE-AT-A-TIME RULE. A sitting holds every other paper shut
 * while it runs (see `startMock`), so a mock opened by accident would otherwise
 * cost the candidate three hours of not being able to sit anything. This closes
 * it deliberately: the paper is spent, no report is produced, and the catalogue
 * opens up again.
 *
 * NOT A RESTART, and the difference matters. The sitting is marked `abandoned`
 * rather than deleted, so the time it burned is a fact that stays on the record;
 * starting that paper again afterwards is a genuinely fresh sitting with a fresh
 * timeline, not the old one's clock handed back.
 */
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

/**
 * A speaking take has landed — write its answer row and mark it in the
 * background.
 *
 * WHY MID-SITTING AT ALL. Speaking answers used to exist only as jsonb inside
 * `draft_answers` until hand-in, when eleven of them became eleven rows and were
 * marked in one six-way-concurrent burst. That burst is what tripped the scoring
 * provider — on one observed sitting eight of eleven answers came back refused,
 * and every one scored perfectly on a later retry. An interview hands us one
 * recording a minute; there is no reason to save them all up and then ask for
 * everything at once.
 *
 * So the row is written as the take arrives and scored on its own. By hand-in
 * the module is usually already marked, and the report opens with bands on it.
 *
 * NOTHING HERE IS TAKEN ON THE CLIENT'S WORD EXCEPT WHICH QUESTION IT IS.
 * `section`, `questionType`, `marks` and the sheet number are read off the paper
 * server-side; the recording location is checked to be a key in THIS candidate's
 * own prefix before anything is stored; and the band, as everywhere, is computed
 * server-side and never accepted from a browser. The worst a forged call can do
 * is ask us to score the candidate's own recording against their own sitting,
 * which is what it is for.
 *
 * IDEMPOTENT. The unique index on (session_id, section_id, question_number) makes
 * a repeat an update, and the scorer skips a row that already has a band — so a
 * resumed sitting replaying its takes costs nothing.
 */
export async function recordMockSpeakingTake(
  sessionId: string,
  sectionId: string,
  sheetNumber: number,
): Promise<void> {
  const user = await requireUser();
  if (!isUuid(sessionId) || !isUuid(sectionId)) return;

  const [session] = await db
    .select({ id: mockTestSessions.id, mockTestId: mockTestSessions.mockTestId })
    .from(mockTestSessions)
    .where(
      and(
        eq(mockTestSessions.id, sessionId),
        eq(mockTestSessions.userId, user.id),
        eq(mockTestSessions.status, "in_progress"),
      ),
    )
    .limit(1);
  if (!session) return;

  // A lapsed plan must not be scored on. Starting the sitting was gated, but
  // this runs up to three hours later.
  if (checkAiScoring(user)) return;

  const draft = await db
    .select({ draftAnswers: mockTestSessions.draftAnswers })
    .from(mockTestSessions)
    .where(eq(mockTestSessions.id, sessionId))
    .limit(1);
  const answers = (draft[0]?.draftAnswers ?? {}) as AnswerMap;
  const ans = answers[answerKey(sectionId, sheetNumber)];
  const audioUrl = typeof ans?.audioUrl === "string" ? ans.audioUrl : null;
  if (!audioUrl) return;

  // THE RECORDING MUST BE THIS CANDIDATE'S. Keys are minted as
  // `<prefix><userId>/<uuid>.<ext>` (see uploadSpeakingAudio), so the owner is
  // in the key and can be checked without a round trip. Without this, a crafted
  // call could have us transcribe and score somebody else's recording.
  const key = keyFromUrl(audioUrl);
  if (!key || !key.split("/").includes(user.id)) return;

  // The paper decides what this question is — not the caller. ONE MODULE, not
  // the whole paper: this runs once per take, and `openMockPaper` would load all
  // twelve parts eleven times over the course of an interview.
  const parts = await openMockModule(session.mockTestId, "speaking");
  const part = parts.find((pt) => pt.sectionId === sectionId);
  if (!part) return;

  let found: { qt: QuestionTypeKey; n: number; marks: number } | null = null;
  for (const group of part.questions?.groups ?? []) {
    for (const item of group.items) {
      if (item.n + part.numberOffset !== sheetNumber) continue;
      found = { qt: group.questionType as QuestionTypeKey, n: item.n, marks: item.marks ?? 1 };
    }
  }
  if (!found) return;

  const [row] = await db
    .insert(mockTestAnswers)
    .values({
      sessionId,
      sectionId,
      questionNumber: found.n,
      sheetNumber,
      section: "speaking",
      questionType: found.qt,
      marks: found.marks,
      response: ans,
      audioUrl,
    })
    .onConflictDoUpdate({
      target: [mockTestAnswers.sessionId, mockTestAnswers.sectionId, mockTestAnswers.questionNumber],
      // The answer and its recording only. A band, a transcript or feedback
      // already on the row belongs to a scoring run that has finished, and this
      // is not the place to throw it away.
      set: { response: ans, audioUrl },
    })
    .returning({ id: mockTestAnswers.id });
  if (!row) return;

  scheduleMockAnswerScoring(user.id, row.id);
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
    //
    // UPSERT, BECAUSE SOME ROWS ARE ALREADY HERE. A speaking take writes its own
    // row as it is given, so it can be marked while the interview is still going
    // (see `recordMockSpeakingTake`). `onConflictDoNothing` would then silently
    // drop the only thing hand-in knows that the live path did not — how long
    // the candidate spent on the question.
    //
    // WHAT IS DELIBERATELY NOT IN THE `set`: band, transcript and ai_feedback.
    // Those are a finished scoring run's output. Hand-in has nothing better to
    // say about them, and overwriting them here would throw away marking we have
    // already paid for. `audio_url` is coalesced for the same reason — a draft
    // that somehow lost the location must not erase a recording we hold.
    await db
      .insert(mockTestAnswers)
      .values(rows)
      .onConflictDoUpdate({
        target: [
          mockTestAnswers.sessionId,
          mockTestAnswers.sectionId,
          mockTestAnswers.questionNumber,
        ],
        set: {
          response: sql`excluded.response`,
          audioUrl: sql`coalesce(excluded.audio_url, ${mockTestAnswers.audioUrl})`,
          isCorrect: sql`excluded.is_correct`,
          rawScore: sql`excluded.raw_score`,
          timeSpentSec: sql`excluded.time_spent_sec`,
        },
      });
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
 * NO CLIENT-CALLABLE SCORER LIVES HERE ANY MORE, and that is deliberate.
 *
 * There used to be `scoreMockSpeaking` and `scoreMockWriting` behind a "Try
 * scoring again" button on the report. They existed from before the sweeper
 * cron did, when a candidate noticing a missing band genuinely was the only
 * recovery. Scoring now has two server-side sources — `scheduleMockScoring` via
 * `after()` at hand-in, and /api/cron/scoring every five minutes for three hours
 * after it — so the button asked a candidate to start work that was already
 * queued, and every exported function in a "use server" module is a callable
 * endpoint whether or not anything in the UI calls it.
 *
 * The work itself is unchanged and still lives in src/lib/scoring/score-mock.ts,
 * where the cron reaches it with a userId it established itself.
 * `mockScoringStatus` below is all the report needs: it watches, and says so.
 */

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

  // Ownership first and separately: `mockScoringArriving` answers about a
  // sitting, not about a candidate, and it must not be handed a session id
  // nobody has checked.
  const [owned] = await db
    .select({ id: mockTestSessions.id })
    .from(mockTestSessions)
    .where(and(eq(mockTestSessions.id, sessionId), eq(mockTestSessions.userId, user.id)))
    .limit(1);
  if (!owned) return { pending: 0 };

  return { pending: await mockScoringArriving(sessionId) };
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
  bands: {
    section: SectionKey;
    band: string | null;
    raw: number | null;
    total: number | null;
    /**
     * Writing and Speaking only: how much of the module was actually answered.
     *
     * A band from these two is a mean over everything the paper asked, with an
     * unanswered question counting as zero — so coverage is most of the
     * explanation for a low one, and without it a candidate has no way to tell a
     * weak performance from a half-finished module (or from a recorder of ours
     * that failed). Null for Listening and Reading, which report marks instead.
     */
    answered: number | null;
    asked: number | null;
  }[];
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

  // What the paper asked in each AI-scored module, and how much of it came back
  // with a band. Two grouped counts, not a per-question load.
  const [asked, answered] = await Promise.all([
    db
      .select({
        section: mockTestSections.section,
        n: sql<number>`coalesce(sum(${mockTestSections.totalQuestions}), 0)::int`,
      })
      .from(mockTestSections)
      .innerJoin(mockTestSessions, eq(mockTestSessions.mockTestId, mockTestSections.mockTestId))
      .where(
        and(
          eq(mockTestSessions.id, sessionId),
          inArray(mockTestSections.section, ["writing", "speaking"]),
        ),
      )
      .groupBy(mockTestSections.section),
    db
      .select({
        section: mockTestAnswers.section,
        n: sql<number>`count(*) filter (where ${mockTestAnswers.band} is not null)::int`,
      })
      .from(mockTestAnswers)
      .where(
        and(
          eq(mockTestAnswers.sessionId, sessionId),
          inArray(mockTestAnswers.section, ["writing", "speaking"]),
        ),
      )
      .groupBy(mockTestAnswers.section),
  ]);

  const askedBy = new Map(asked.map((a) => [a.section, Number(a.n)]));
  const answeredBy = new Map(answered.map((a) => [a.section, Number(a.n)]));
  const coverage = (sec: "writing" | "speaking") => ({
    answered: answeredBy.get(sec) ?? 0,
    asked: askedBy.get(sec) ?? null,
  });

  return {
    sessionId: row.r.sessionId,
    mockTestId: row.r.mockTestId,
    title: row.title,
    module: row.r.module,
    completedAt: row.completedAt,
    overallBand: row.r.overallBand,
    bands: [
      {
        section: "listening",
        band: row.r.listeningBand,
        raw: row.r.listeningRaw,
        total: totalOf("listening"),
        answered: null,
        asked: null,
      },
      {
        section: "reading",
        band: row.r.readingBand,
        raw: row.r.readingRaw,
        total: totalOf("reading"),
        answered: null,
        asked: null,
      },
      { section: "writing", band: row.r.writingBand, raw: null, total: null, ...coverage("writing") },
      { section: "speaking", band: row.r.speakingBand, raw: null, total: null, ...coverage("speaking") },
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

