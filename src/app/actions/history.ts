"use server";

import { and, eq, gte, lt, count, sql, desc, asc, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { userResponses, questions, questionSets, practiceSections } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import type { SectionKey, QuestionTypeKey } from "@/lib/ielts";
import type { SetLayout, QuestionGroup, QuestionItem } from "@/lib/question-content";
import { mediaUrl } from "@/lib/media-urls";

/* ------------------------------------------------------------------ *
 * Day boundaries
 *
 * A "day" is the user's local day, but createdAt is stored in UTC. The page
 * passes a plain YYYY-MM-DD plus the browser's offset so "today" means the
 * same thing on screen as it does in the query.
 * ------------------------------------------------------------------ */

/**
 * Ceilings on the grouped day queries.
 *
 * Both already aggregate in SQL, so they return tens of rows rather than one per
 * answer — these are backstops, not pagination. Without them the row count is
 * bounded only by how much a single user did in a day, which is the kind of
 * assumption that holds right up until it doesn't.
 */
const MAX_GROUPED_ROWS = 200;
const MAX_ATTEMPTS_PER_DAY = 500;

function dayBounds(date: string, tzOffsetMinutes: number): { start: Date; end: Date } {
  // Date.UTC of local midnight, pushed back by the offset to get the UTC instant.
  const [y, m, d] = date.split("-").map(Number);
  const startUtcMs = Date.UTC(y, m - 1, d) + tzOffsetMinutes * 60_000;
  return { start: new Date(startUtcMs), end: new Date(startUtcMs + 24 * 60 * 60 * 1000) };
}

/* ------------------------------------------------------------------ *
 * Day summary — stats + section → type tree
 * ------------------------------------------------------------------ */

export type TypeRow = {
  questionType: QuestionTypeKey;
  attempted: number;
  correct: number;
  /** Objective questions only — writing/speaking are graded by band. */
  graded: number;
  accuracy: number | null;
  /** Mean band for AI-scored types, once scoring is wired. */
  avgBand: number | null;
};

export type SectionRow = {
  section: SectionKey;
  attempted: number;
  correct: number;
  graded: number;
  accuracy: number | null;
  types: TypeRow[];
};

export type DaySummary = {
  date: string;
  attempted: number;
  correct: number;
  graded: number;
  accuracy: number | null;
  sections: SectionRow[];
};

export async function getDaySummary(date: string, tzOffsetMinutes: number): Promise<DaySummary> {
  const user = await requireUser();
  const { start, end } = dayBounds(date, tzOffsetMinutes);

  const inDay = and(
    eq(userResponses.userId, user.id),
    gte(userResponses.createdAt, start),
    lt(userResponses.createdAt, end),
  );

  const rows = await db
    .select({
      section: userResponses.section,
      questionType: userResponses.questionType,
      attempted: count(),
      correct: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true)`,
      graded: sql<number>`count(*) filter (where ${userResponses.isCorrect} is not null)`,
      avgBand: sql<number | null>`avg(${userResponses.band})`,
    })
    .from(userResponses)
    .where(inDay)
    .groupBy(userResponses.section, userResponses.questionType)
    // A ceiling, not paging. The grouping already collapses a day to at most
    // one row per (section, type) — about 40 — so this can only ever bite if
    // something has gone wrong upstream, and then it fails cheaply instead of
    // streaming an unbounded result into memory.
    .limit(MAX_GROUPED_ROWS);

  const bySection = new Map<SectionKey, TypeRow[]>();
  let attempted = 0;
  let correct = 0;
  let graded = 0;

  for (const r of rows) {
    const a = Number(r.attempted);
    const c = Number(r.correct);
    const g = Number(r.graded);
    attempted += a;
    correct += c;
    graded += g;

    const list = bySection.get(r.section as SectionKey) ?? [];
    list.push({
      questionType: r.questionType as QuestionTypeKey,
      attempted: a,
      correct: c,
      graded: g,
      accuracy: g > 0 ? Math.round((c / g) * 100) : null,
      avgBand: r.avgBand === null ? null : Number(r.avgBand),
    });
    bySection.set(r.section as SectionKey, list);
  }

  const sections: SectionRow[] = [...bySection.entries()].map(([section, types]) => {
    const a = types.reduce((n, t) => n + t.attempted, 0);
    const c = types.reduce((n, t) => n + t.correct, 0);
    const g = types.reduce((n, t) => n + t.graded, 0);
    return {
      section,
      attempted: a,
      correct: c,
      graded: g,
      accuracy: g > 0 ? Math.round((c / g) * 100) : null,
      types,
    };
  });

  return {
    date,
    attempted,
    correct,
    graded,
    accuracy: graded > 0 ? Math.round((correct / graded) * 100) : null,
    sections,
  };
}

/* ------------------------------------------------------------------ *
 * Attempts for one (day, type)
 * ------------------------------------------------------------------ */

/**
 * One row per *attempt* (one submit of a set), not per question.
 *
 * A gap-backed set has no per-question prompt — the question text lives in the
 * shared table/summary — so listing rows individually showed the set title
 * repeated N times with nothing to tell them apart. "Table completion · 3/4
 * correct" is both the useful unit and the one candidates actually think in.
 */
export type AttemptRow = {
  attemptId: string;
  questionType: QuestionTypeKey;
  /** Which set it was — lets a caller mark the one already on screen. */
  setId: string | null;
  setTitle: string | null;
  questions: number;
  correct: number;
  graded: number;
  /** Mean band across AI-scored questions in the attempt, if any. */
  avgBand: number | null;
  createdAt: Date;
};

/**
 * ROLLED UP FIRST, TITLED SECOND — one statement, but two stages.
 *
 * Both attempt lists are this query with a different WHERE, so they are this
 * query. What differs between "everything I did on Tuesday" and "my last dozen
 * goes at table completion" is the filter, the direction and the ceiling —
 * nothing about how responses become attempts, or where an attempt's title
 * comes from.
 *
 * The two stages matter. Joining the set tables alongside the responses instead
 * puts the title lookup *inside* the aggregate: the planner does one
 * primary-key probe per ANSWER, so a 13-gap attempt pays 13 probes per table
 * for one title, and the group key grows text columns it then has to sort on.
 * Rolling up to attempts first and applying the LIMIT there means each join
 * runs at most `limit` times, whatever the history holds.
 */
async function rollUpAttempts(
  where: SQL | undefined,
  { newestFirst, limit }: { newestFirst: boolean; limit: number },
): Promise<AttemptRow[]> {
  const started = sql`min(${userResponses.createdAt})`;

  const attempts = db
    .select({
      attemptId: userResponses.attemptId,
      setId: userResponses.setId,
      questionType: userResponses.questionType,
      /**
       * `attempt_`-PREFIXED ALIASES, DELIBERATELY.
       *
       * A real column of the subquery comes out qualified —
       * `"attempts"."set_id"` — but a SQL alias comes out bare, and the outer
       * query left-joins two set tables. `practice_sections` has a `questions`
       * column of its own, so a plain `questions` alias is genuinely ambiguous
       * and Postgres rejects the statement (42702). The prefix is what keeps
       * these five names the subquery's own, whatever columns those tables
       * grow later.
       */
      questions: count().as("attempt_questions"),
      correct: sql<number>`count(*) filter (where ${userResponses.isCorrect} = true)`.as(
        "attempt_correct",
      ),
      graded: sql<number>`count(*) filter (where ${userResponses.isCorrect} is not null)`.as(
        "attempt_graded",
      ),
      avgBand: sql<number | null>`avg(${userResponses.band})`.as("attempt_avg_band"),
      createdAt: sql<Date>`${started}`.as("attempt_started_at"),
    })
    .from(userResponses)
    .where(where)
    .groupBy(userResponses.attemptId, userResponses.setId, userResponses.questionType)
    .orderBy(newestFirst ? desc(started) : asc(started))
    .limit(limit)
    .as("attempts");

  const rows = await db
    .select({
      attemptId: attempts.attemptId,
      setId: attempts.setId,
      questionType: attempts.questionType,
      /**
       * BOTH SET TABLES, because `set_id` points at whichever one the attempt
       * came from: question practice writes a `question_sets` id, section
       * practice a `practice_sections` id. Asking only the first is why a
       * section-practice attempt used to be listed as "Untitled set" — its
       * title was in the other table all along.
       *
       * Left joins, and coalesced rather than picked: a response outlives the
       * set it came from, so history must not vanish when content is edited.
       */
      setTitle: sql<string | null>`coalesce(${questionSets.title}, ${practiceSections.title})`,
      questions: attempts.questions,
      correct: attempts.correct,
      graded: attempts.graded,
      avgBand: attempts.avgBand,
      createdAt: attempts.createdAt,
    })
    .from(attempts)
    // Primary-key lookups driven by the subquery's ≤ `limit` rows, so the pair
    // costs two probes per listed attempt, not two per answer.
    .leftJoin(questionSets, eq(attempts.setId, questionSets.id))
    .leftJoin(practiceSections, eq(attempts.setId, practiceSections.id))
    // A subquery's order is not carried through a join — it has to be said
    // again out here or the list comes back in whatever order the join emits.
    .orderBy(newestFirst ? desc(attempts.createdAt) : asc(attempts.createdAt));

  return rows.map((r) => ({
    attemptId: r.attemptId,
    setId: r.setId,
    questionType: r.questionType as QuestionTypeKey,
    setTitle: r.setTitle,
    questions: Number(r.questions),
    correct: Number(r.correct),
    graded: Number(r.graded),
    avgBand: r.avgBand === null ? null : Number(r.avgBand),
    createdAt: new Date(r.createdAt),
  }));
}

/** One day's attempts at one task type, in the order they were sat. */
export async function getAttempts(
  date: string,
  tzOffsetMinutes: number,
  section: SectionKey,
  questionType: QuestionTypeKey,
): Promise<AttemptRow[]> {
  const user = await requireUser();
  const { start, end } = dayBounds(date, tzOffsetMinutes);

  return rollUpAttempts(
    and(
      eq(userResponses.userId, user.id),
      gte(userResponses.createdAt, start),
      lt(userResponses.createdAt, end),
      eq(userResponses.section, section),
      eq(userResponses.questionType, questionType),
    ),
    // Chronological: a day reads forwards. The cap is a backstop, not paging —
    // a candidate cannot realistically sit this many in a day, and without it a
    // runaway could render an unbounded list.
    { newestFirst: false, limit: MAX_ATTEMPTS_PER_DAY },
  );
}

/* ------------------------------------------------------------------ *
 * One attempt in full — question, your answer, the correct answer, score
 * ------------------------------------------------------------------ */

/** One answered question within an attempt. */
export type AttemptItem = {
  responseId: string;
  /** Null once the question is deleted; review then falls back to a plain list. */
  questionId: string | null;
  /** Exam number, so a table's marks read Q23–Q26 as they did on screen. */
  number: number | null;
  isCorrect: boolean | null;
  /** A paired "Choose TWO letters" is one row worth two marks. */
  marks: number;
  band: string | null;
  rawScore: number | null;
  response: unknown;
  /**
   * App-relative playback path (`/api/practice/recording/<id>`), or null when
   * there is no recording. NEVER the `s3://` location — see the mapping below.
   */
  audioUrl: string | null;
  transcript: string | null;
  aiFeedback: unknown;
  /** Null when the question has since been deleted. */
  question: {
    prompt: string | null;
    content: unknown;
    correctAnswer: unknown;
    explanation: string | null;
    orderIndex: number;
    // Carried so review can re-render the question exactly as it was answered.
    wordLimitMin: number | null;
    prepSeconds: number | null;
    speakSeconds: number | null;
  } | null;
};

export type AttemptDetail = {
  attemptId: string;
  section: SectionKey;
  questionType: QuestionTypeKey;
  createdAt: Date;
  correct: number;
  graded: number;
  items: AttemptItem[];
  set: {
    id: string;
    title: string;
    instructions: string | null;
    passageText: string | null;
    audioUrl: string | null;
    imageUrl: string | null;
    layout: SetLayout | null;
    startNumber: number;
  } | null;
};

/** Every question answered in one submit, in exam order. */
export async function getAttemptDetail(attemptId: string): Promise<AttemptDetail | null> {
  return loadAttempt(attemptId, true);
}

/**
 * The body of both attempt reads.
 *
 * `withPassage` is the only difference between them, and it is a column in the
 * SELECT rather than a `delete` on the way out — a reading passage dropped
 * after the fact has still crossed the wire from Postgres and still sat in this
 * process's memory. Not exported: the flag is an internal detail, and every
 * export in a "use server" module is a callable endpoint.
 */
async function loadAttempt(
  attemptId: string,
  withPassage: boolean,
): Promise<AttemptDetail | null> {
  const user = await requireUser();

  /**
   * THE SET IS FETCHED ONCE, NOT JOINED PER ROW.
   *
   * This used to left-join `question_sets` AND `practice_sections` and select
   * both whole rows alongside every response. But an attempt is one submit of
   * one set, so those were the SAME row repeated once per answer — and a
   * `practice_sections` row is ~7 KB, most of it the transcript and the answer
   * key jsonb. A 13-answer attempt moved 95 KB where 7 KB would do, and a
   * 40-mark paper closer to 290 KB. The joined values were only ever read off
   * `rows[0]`, never per row, so nothing needed them there.
   *
   * Both tables are still consulted because `set_id` points at whichever one the
   * attempt came from: question practice writes a `question_sets` id, section
   * practice a `practice_sections` id. Two primary-key lookups in parallel cost
   * far less than one repeated join.
   */
  const rows = await db
    .select({
      r: {
        id: userResponses.id,
        setId: userResponses.setId,
        questionNumber: userResponses.questionNumber,
        section: userResponses.section,
        questionType: userResponses.questionType,
        response: userResponses.response,
        audioUrl: userResponses.audioUrl,
        transcript: userResponses.transcript,
        isCorrect: userResponses.isCorrect,
        rawScore: userResponses.rawScore,
        band: userResponses.band,
        aiFeedback: userResponses.aiFeedback,
        createdAt: userResponses.createdAt,
      },
      // Per-row: each answer has its own question. Left-joined because
      // `question_id` is set null when content is deleted, and the attempt and
      // its score must survive that.
      q: {
        id: questions.id,
        prompt: questions.prompt,
        content: questions.content,
        correctAnswer: questions.correctAnswer,
        explanation: questions.explanation,
        orderIndex: questions.orderIndex,
        marks: questions.marks,
        wordLimitMin: questions.wordLimitMin,
        prepSeconds: questions.prepSeconds,
        speakSeconds: questions.speakSeconds,
      },
    })
    .from(userResponses)
    .leftJoin(questions, eq(userResponses.questionId, questions.id))
    // Scoped to the owner — an attempt id must never read across users.
    .where(and(eq(userResponses.attemptId, attemptId), eq(userResponses.userId, user.id)))
    .orderBy(
      asc(questions.orderIndex),
      asc(userResponses.questionNumber),
      asc(userResponses.createdAt),
    );

  if (rows.length === 0) return null;

  const first = rows[0];
  const setId = first.r.setId;

  // Each resolves to its row or null independently, so the types stay simple —
  // a conditional that yields a tuple of nulls collapses to `never` in the
  // destructuring and every field read below fails to compile.
  const [s, ps] = await Promise.all([
    setId
      ? db
          .select({
            id: questionSets.id,
            title: questionSets.title,
            instructions: questionSets.instructions,
            passageText: withPassage ? questionSets.passageText : sql<string | null>`null`,
            audioUrl: questionSets.audioUrl,
            imageUrl: questionSets.imageUrl,
            layout: questionSets.layout,
            startNumber: questionSets.startNumber,
          })
          .from(questionSets)
          .where(eq(questionSets.id, setId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    setId
      ? db
          .select({
            id: practiceSections.id,
            title: practiceSections.title,
            instructions: practiceSections.instructions,
            passageText: withPassage ? practiceSections.passageText : sql<string | null>`null`,
            audioUrl: practiceSections.audioUrl,
            imageUrl: practiceSections.imageUrl,
            startNumber: practiceSections.startNumber,
            // Needed to find which jsonb item each exam number answered. The
            // transcript is deliberately NOT selected: review renders the
            // answers, not the script.
            questions: practiceSections.questions,
          })
          .from(practiceSections)
          .where(eq(practiceSections.id, setId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  /** The jsonb item a section-practice row answered, plus the group holding it. */
  const sectionItem = (n: number | null) => {
    if (n === null || !ps?.questions?.groups) return null;
    for (const g of ps.questions.groups as QuestionGroup[]) {
      const item = g.items.find((i: QuestionItem) => i.n === n);
      if (item) return { group: g, item };
    }
    return null;
  };

  const items: AttemptItem[] = rows.map((row) => {
    // A narrowed left join returns an object of nulls rather than a null object,
    // so identity is what says whether a question row exists. Collapsing it to
    // `null` here is what lets TypeScript narrow the field reads below.
    const q = row.q && row.q.id != null ? row.q : null;
    const found = q ? null : sectionItem(row.r.questionNumber);
    const item = found?.item;
    return {
      responseId: row.r.id,
      questionId: q?.id ?? null,
      number:
        q && s && q.orderIndex != null ? s.startNumber + q.orderIndex : row.r.questionNumber,
      isCorrect: row.r.isCorrect,
      marks: q?.marks ?? item?.marks ?? 1,
      band: row.r.band,
      rawScore: row.r.rawScore,
      response: row.r.response,
      // OUR path, not the stored s3:// location. The raw value is
      // `s3://bucket/<prefix>/<userId>/<uuid>.wav`, so returning it would
      // publish the bucket, the folder layout and a user id to the browser.
      // The route behind this re-checks ownership and mints a presigned URL per
      // request, so the client never holds anything durable.
      audioUrl: mediaUrl.recording(row.r.id, row.r.audioUrl),
      transcript: row.r.transcript,
      aiFeedback: row.r.aiFeedback,
      question: q
        ? {
            prompt: q.prompt,
            content: q.content,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            orderIndex: q.orderIndex,
            wordLimitMin: q.wordLimitMin,
            prepSeconds: q.prepSeconds,
            speakSeconds: q.speakSeconds,
          }
        : item
          ? {
              prompt: item.prompt ?? null,
              content: { n: item.n, options: item.options, selectCount: item.selectCount },
              correctAnswer: item.answer ?? null,
              explanation: item.explanation ?? null,
              orderIndex: item.n,
              wordLimitMin: item.wordLimitMin ?? null,
              prepSeconds: item.prepSeconds ?? null,
              speakSeconds: item.speakSeconds ?? null,
            }
          : null,
    };
  });

  // A section attempt spans the whole part, so it only has one layout to show
  // when every answered item came from the same group.
  const groups = new Set(
    rows.map((row) => sectionItem(row.q?.id != null ? null : row.r.questionNumber)?.group),
  );
  const soleGroup = groups.size === 1 ? [...groups][0] : undefined;

  return {
    attemptId,
    section: first.r.section as SectionKey,
    questionType: first.r.questionType as QuestionTypeKey,
    createdAt: rows.reduce(
      (min, row) => (row.r.createdAt < min ? row.r.createdAt : min),
      first.r.createdAt,
    ),
    // Marks, not rows — a paired MCQ is one row worth two of the paper's 40.
    correct: items.filter((i) => i.isCorrect === true).reduce((t, i) => t + i.marks, 0),
    graded: items.filter((i) => i.isCorrect !== null).reduce((t, i) => t + i.marks, 0),
    items,
    set: s
      ? {
          id: s.id,
          title: s.title,
          instructions: s.instructions,
          passageText: s.passageText,
      // OUR media path, never the stored s3:// value. Consumers only need this
      // to know a recording exists and to play it, and both are true of the
      // gated route — while the raw value would publish the bucket and key.
          audioUrl: mediaUrl.setAudio(s.id, s.audioUrl),
          imageUrl: mediaUrl.setImage(s.id, s.imageUrl),
          layout: (s.layout as SetLayout | null) ?? null,
          startNumber: s.startNumber,
        }
      : ps
        ? {
            id: ps.id,
            title: ps.title,
            instructions: ps.instructions,
            passageText: ps.passageText,
            // Section parts have their own gated resolver.
            audioUrl: mediaUrl.sectionAudio(ps.id, ps.audioUrl),
            imageUrl: mediaUrl.sectionImage(ps.id, ps.imageUrl),
            layout: (soleGroup?.layout as SetLayout | null) ?? null,
            startNumber: ps.startNumber,
          }
        : null,
  };
}

/** Most recent day with any activity — where History opens by default. */
export async function getLatestActiveDate(tzOffsetMinutes: number): Promise<string | null> {
  const user = await requireUser();
  const [row] = await db
    .select({
      day: sql<string>`to_char((${userResponses.createdAt} - make_interval(mins => ${tzOffsetMinutes}))::date, 'YYYY-MM-DD')`,
    })
    .from(userResponses)
    .where(eq(userResponses.userId, user.id))
    .orderBy(desc(userResponses.createdAt))
    .limit(1);
  return row?.day ?? null;
}

/* ------------------------------------------------------------------ *
 * Recent attempts — the in-player history panel
 *
 * The day-scoped pair above answers "what did I do on Tuesday". Mid-practice
 * the question is a different one — "how did I do at THIS before" — and the
 * answer must not depend on the candidate having practised today. So these are
 * scoped by what is on screen and bounded by a count, not a day.
 *
 * "This" is the set: the passage, the recording, the task or the topic in front
 * of them. Scoped to the type instead, the panel opened on Recording 48 and
 * listed four other recordings — the candidate then had to read five set titles
 * to find out whether the one they are sitting had ever been sat before, which
 * is the single fact they opened it for. The whole type is still one click away
 * in the footer, at /history.
 * ------------------------------------------------------------------ */

/** Ceiling on the panel, whatever the caller asks for. */
const MAX_RECENT_ATTEMPTS = 30;

/** Cheap shape check: the panel's key is a uuid for sets but an exam number for
 *  section documents, and handing Postgres the latter is a 22P02, not a miss. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Both panel lists take the same cap, so neither can be talked past it. */
function panelLimit(limit: number): number {
  return Math.min(Math.max(limit, 1), MAX_RECENT_ATTEMPTS);
}

/**
 * Every past attempt at the set on screen.
 *
 * `set_id` alone identifies it — it is a uuid from `question_sets` or from
 * `practice_sections`, and the two tables cannot collide — so the section and
 * the type would be redundant filters. Paired with the user it also lands on
 * `user_responses_user_set_idx` rather than scanning a candidate's history.
 */
export async function getSetAttempts(setId: string, limit = 12): Promise<AttemptRow[]> {
  const user = await requireUser();
  if (!UUID.test(setId)) return [];

  return rollUpAttempts(
    and(eq(userResponses.userId, user.id), eq(userResponses.setId, setId)),
    // Most recent first — the panel opens on what you just did.
    { newestFirst: true, limit: panelLimit(limit) },
  );
}

/**
 * Every past attempt at one task type, whatever the set.
 *
 * The fallback for a player with no set on screen — there is nothing narrower
 * to ask about then, and an empty panel would be a worse answer than a wider
 * one.
 */
export async function getRecentAttempts(
  section: SectionKey,
  questionType: QuestionTypeKey,
  limit = 12,
): Promise<AttemptRow[]> {
  const user = await requireUser();

  return rollUpAttempts(
    and(
      eq(userResponses.userId, user.id),
      eq(userResponses.section, section),
      eq(userResponses.questionType, questionType),
    ),
    // Capped by a count rather than a day, since "how did I do at this before"
    // must not depend on having practised today.
    { newestFirst: true, limit: panelLimit(limit) },
  );
}

/**
 * One attempt for the panel: the answers and the marks, without the passage.
 *
 * The full review re-renders the reading passage, which is the largest thing
 * in an attempt by far and is already on screen behind the panel. Leaving it
 * out of the SELECT keeps a preview that is opened casually, several times a
 * session, from reading and shipping prose the panel never draws.
 * `/history/[id]` still calls getAttemptDetail and gets the whole thing.
 */
export async function getAttemptPreview(attemptId: string): Promise<AttemptDetail | null> {
  return loadAttempt(attemptId, false);
}

/* ------------------------------------------------------------------ *
 * Every past answer to ONE question — the sequential-speaking panel
 *
 * Speaking Parts 1 and 3 are an interview: the set is a TOPIC and the unit a
 * candidate works on is a single question inside it. So "how did I do at this
 * before", asked while looking at "Do you work or study?", means that question
 * — not the last dozen sittings of the whole topic, where the answer being
 * asked about is one of seven recordings buried inside each row.
 *
 * The attempt-shaped list above stays for everything else, where the attempt
 * genuinely IS the unit: a reading passage is answered, and marked, as one.
 * ------------------------------------------------------------------ */

/** Ceiling on the per-question panel, whatever the caller asks for. */
const MAX_QUESTION_ANSWERS = 30;

/** One past answer to one question. */
export type QuestionAnswerRow = {
  responseId: string;
  /** Its attempt, so the full review is still one click away. */
  attemptId: string;
  createdAt: Date;
  isCorrect: boolean | null;
  band: number | null;
  response: unknown;
  /** App-relative playback path, never the stored `s3://` location. */
  audioUrl: string | null;
  transcript: string | null;
  aiFeedback: unknown;
};

export type QuestionHistory = {
  questionId: string;
  questionType: QuestionTypeKey;
  prompt: string | null;
  content: unknown;
  correctAnswer: unknown;
  /** The set's layout, so the answers render as they did on screen. */
  layout: SetLayout | null;
  answers: QuestionAnswerRow[];
};

export async function getQuestionAnswers(
  questionId: string,
  limit = 12,
): Promise<QuestionHistory | null> {
  const user = await requireUser();
  if (!UUID.test(questionId)) return null;

  /**
   * The question ONCE, the answers separately.
   *
   * Prompt, content and answer key are properties of the question, not of an
   * attempt at it — joining them onto the responses would ship the same three
   * columns back a dozen times to render one heading.
   */
  const [q] = await db
    .select({
      id: questions.id,
      questionType: questions.questionType,
      prompt: questions.prompt,
      content: questions.content,
      correctAnswer: questions.correctAnswer,
      // Left-joined: a question outlives nothing here, but the column lives on
      // the set and speaking sets have no layout at all.
      layout: questionSets.layout,
    })
    .from(questions)
    .leftJoin(questionSets, eq(questions.setId, questionSets.id))
    .where(eq(questions.id, questionId))
    .limit(1);

  if (!q) return null;

  const rows = await db
    .select({
      responseId: userResponses.id,
      attemptId: userResponses.attemptId,
      createdAt: userResponses.createdAt,
      isCorrect: userResponses.isCorrect,
      band: userResponses.band,
      response: userResponses.response,
      audioUrl: userResponses.audioUrl,
      transcript: userResponses.transcript,
      aiFeedback: userResponses.aiFeedback,
    })
    .from(userResponses)
    // Scoped to the owner first — a question id is public content, so this
    // filter is the only thing standing between it and someone else's answers.
    .where(and(eq(userResponses.userId, user.id), eq(userResponses.questionId, questionId)))
    // Newest first: the panel opens on the answer just given.
    .orderBy(desc(userResponses.createdAt))
    .limit(Math.min(Math.max(limit, 1), MAX_QUESTION_ANSWERS));

  return {
    questionId: q.id,
    questionType: q.questionType as QuestionTypeKey,
    prompt: q.prompt,
    content: q.content,
    correctAnswer: q.correctAnswer,
    layout: (q.layout as SetLayout | null) ?? null,
    answers: rows.map((r) => ({
      responseId: r.responseId,
      attemptId: r.attemptId,
      createdAt: r.createdAt,
      isCorrect: r.isCorrect,
      band: r.band === null ? null : Number(r.band),
      response: r.response,
      // OUR gated path, for the reason set out in loadAttempt: the stored value
      // is `s3://bucket/<prefix>/<userId>/<uuid>.wav`.
      audioUrl: mediaUrl.recording(r.responseId, r.audioUrl),
      transcript: r.transcript,
      aiFeedback: r.aiFeedback,
    })),
  };
}
