import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ *
 * Enums
 * ------------------------------------------------------------------ */

export const userRole = pgEnum("user_role", ["user", "admin"]);
// IELTS comes in two streams; a user studies toward one (can change later).
export const ieltsModule = pgEnum("ielts_module", ["academic", "general"]);

/* ------------------------------------------------------------------ *
 * Users
 * ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: uuid().defaultRandom().primaryKey(),

    // Display value as typed by the user.
    email: text().notNull(),
    // Lowercased/trimmed value used for uniqueness + lookups (prevents
    // duplicate accounts differing only by case).
    emailNormalized: text().notNull(),
    emailVerified: boolean().notNull().default(false),

    // bcrypt hash (cost 12). Never the plaintext.
    passwordHash: text().notNull(),
    name: text().notNull(),
    role: userRole().notNull().default("user"),

    // IELTS study profile
    targetModule: ieltsModule().notNull().default("academic"),
    targetBand: text(), // e.g. "7.5" — half-band increments, stored as text
    examDate: timestamp({ withTimezone: true }),
    avatarUrl: text(),
    country: text(),

    // --- Security / anti-bruteforce state ---
    failedLoginAttempts: integer().notNull().default(0),
    lockedUntil: timestamp({ withTimezone: true }),
    lastLoginAt: timestamp({ withTimezone: true }),
    lastLoginIp: text(),
    // Bump on password change to invalidate any pre-change tokens.
    passwordChangedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_normalized_uq").on(t.emailNormalized)],
);

/* ------------------------------------------------------------------ *
 * Sessions (server-side, revocable, opaque token)
 *
 * The cookie holds a random 256-bit token. We only ever store its SHA-256
 * hash here, so a DB read does not yield a usable session token. Sessions are
 * revocable (logout / "log out everywhere") and carry both an idle and an
 * absolute expiry.
 * ------------------------------------------------------------------ */

export const sessions = pgTable(
  "sessions",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text().notNull(), // sha256(rawToken) hex

    ipAddress: text(),
    userAgent: text(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    idleExpiresAt: timestamp({ withTimezone: true }).notNull(),
    absoluteExpiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_uq").on(t.tokenHash),
    index("sessions_user_id_idx").on(t.userId),
  ],
);

/* ------------------------------------------------------------------ *
 * Rate limiting (DB-backed sliding window)
 *
 * Keyed by "action:dimension:value", e.g. "login:ip:1.2.3.4" or
 * "login:email:user@x.com". One row per key; atomic upsert bumps the counter.
 * ------------------------------------------------------------------ */

export const rateLimits = pgTable("rate_limits", {
  key: text().primaryKey(),
  count: integer().notNull().default(0),
  windowStart: timestamp({ withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
});

/* ------------------------------------------------------------------ *
 * Security audit log (append-only)
 * Records auth-relevant events for forensics / anomaly detection.
 * ------------------------------------------------------------------ */

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    event: text().notNull(), // e.g. "login.success", "login.fail", "signup", "logout"
    ipAddress: text(),
    userAgent: text(),
    metadata: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_user_idx").on(t.userId), index("audit_log_event_idx").on(t.event)],
);

/* ------------------------------------------------------------------ *
 * Inferred types
 * ------------------------------------------------------------------ */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;

/* ================================================================== *
 * CONTENT, PRACTICE & MOCK TESTS
 * ================================================================== */

/* ------------------------------------------------------------------ *
 * Content enums
 * ------------------------------------------------------------------ */

export const section = pgEnum("section", ["listening", "reading", "writing", "speaking"]);

export const difficulty = pgEnum("difficulty", ["easy", "medium", "hard"]);

// Whether a piece of content belongs to Academic, General Training, or both.
export const moduleScope = pgEnum("module_scope", ["academic", "general", "both"]);

// The full set of official IELTS task types across all four sections.
export const questionType = pgEnum("question_type", [
  // Listening & Reading — selection / matching
  "multiple_choice_single",
  "multiple_choice_multiple",
  "matching_information",
  "matching_headings",
  "matching_features",
  "matching_sentence_endings",
  // Listening & Reading — completion
  "sentence_completion",
  "summary_completion",
  "note_completion",
  "table_completion",
  "flowchart_completion",
  "diagram_label_completion",
  "form_completion",
  "short_answer",
  // Reading-only judgement types
  "true_false_notgiven", // identifying information
  "yes_no_notgiven", // identifying writer's views/claims
  // Listening-only
  "plan_map_diagram_labelling",
  // Writing
  "writing_task1_academic", // describe a visual
  "writing_task1_general", // letter
  "writing_task2", // essay (both modules)
  // Speaking
  "speaking_part1", // intro & interview
  "speaking_part2", // cue card / long turn
  "speaking_part3", // two-way discussion
]);

export const mockSessionStatus = pgEnum("mock_session_status", [
  "in_progress",
  "completed",
  "abandoned",
  "expired",
]);

/* ------------------------------------------------------------------ *
 * question_sets — the shared stimulus / grouping
 *
 * One row = a reading passage, a listening recording (a "part"), a writing
 * task prompt, or a speaking part. Its `questions` are the individual items.
 * ------------------------------------------------------------------ */

export const questionSets = pgTable(
  "question_sets",
  {
    id: uuid().defaultRandom().primaryKey(),
    module: moduleScope().notNull().default("both"),
    section: section().notNull(),
    // Dominant task type of the set (items can refine per-question).
    questionType: questionType().notNull(),

    title: text().notNull(),
    instructions: text(),
    difficulty: difficulty().notNull().default("medium"),

    passageText: text(), // reading
    audioUrl: text(), // listening
    transcript: text(), // listening (for review)
    imageUrl: text(), // writing task 1 visual / map / diagram

    /**
     * The shared structure the questions live inside — a summary paragraph with
     * numbered gaps, a table grid, a note outline, a heading list, diagram pins.
     * Gaps are written `[[n]]` where n is the question's exam number, so one
     * table/summary spans many questions exactly as it does on test day.
     * Typed as `SetLayout` in src/lib/question-content.ts. Null for types whose
     * questions stand alone (MCQ, TFNG, writing, speaking).
     */
    layout: jsonb().$type<unknown>(),

    partNumber: integer(), // listening 1-4 / reading passage 1-3
    /**
     * Exam number of this set's first question. IELTS numbers continuously
     * across the paper (passage 2 starts at 14), so numbering is set-level data
     * rather than a render-time index.
     */
    startNumber: integer().notNull().default(1),
    estimatedMinutes: integer(),
    tags: jsonb().$type<string[]>(),
    source: text(),

    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("question_sets_section_idx").on(t.section),
    index("question_sets_module_idx").on(t.module),
    index("question_sets_type_idx").on(t.questionType),
    // Practice pagination filters on (section, type, active) and pages by
    // (createdAt, id). Covering all five lets Postgres walk the index in order
    // and satisfy LIMIT/OFFSET without sorting the whole match set.
    index("question_sets_paging_idx").on(
      t.section,
      t.questionType,
      t.isActive,
      t.createdAt,
      t.id,
    ),
  ],
);

/* ------------------------------------------------------------------ *
 * questions — individual items within a set
 *
 * Type-specific shapes (options, blanks, headings, matching pairs, etc.) live
 * in `content` (jsonb); accepted answers live in `correctAnswer` (jsonb) for
 * objective types. Writing/Speaking items carry word/time limits instead.
 * ------------------------------------------------------------------ */

export const questions = pgTable(
  "questions",
  {
    id: uuid().defaultRandom().primaryKey(),
    setId: uuid()
      .notNull()
      .references(() => questionSets.id, { onDelete: "cascade" }),
    section: section().notNull(), // denormalized for querying
    questionType: questionType().notNull(),
    orderIndex: integer().notNull().default(0),

    prompt: text(),
    content: jsonb(), // options / blanks / headings / pairs …
    correctAnswer: jsonb(), // acceptable answers for auto-scored types
    explanation: text(),
    marks: integer().notNull().default(1),

    // Writing
    wordLimitMin: integer(),
    wordLimitMax: integer(),
    // Speaking
    prepSeconds: integer(),
    speakSeconds: integer(),

    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("questions_set_idx").on(t.setId),
    index("questions_section_idx").on(t.section),
    index("questions_type_idx").on(t.questionType),
  ],
);

/* ------------------------------------------------------------------ *
 * user_responses — single-question PRACTICE attempts
 *
 * `band` holds the AI-scored band for Writing/Speaking; objective sections use
 * `isCorrect` / `rawScore`. section & questionType are denormalized so history
 * survives content edits/deletes (question_id is set null on delete).
 * ------------------------------------------------------------------ */

export const userResponses = pgTable(
  "user_responses",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid().references(() => questions.id, { onDelete: "set null" }),
    setId: uuid(),
    /**
     * Groups every row written by ONE submit of a set.
     *
     * A candidate experiences "I did that table and got 3 of 4", not four
     * unrelated events — but marks are per gap, so the rows must stay per gap.
     * This id is what lets history and the dashboard aggregate back up to the
     * attempt without inferring it from matching timestamps.
     */
    attemptId: uuid().notNull().defaultRandom(),
    section: section().notNull(),
    questionType: questionType().notNull(),
    module: ieltsModule().notNull().default("academic"),

    response: jsonb(), // answer given (selection / text / etc.)
    audioUrl: text(), // speaking recording (S3)
    transcript: text(), // speaking STT transcript

    isCorrect: boolean(),
    rawScore: integer(),
    band: numeric({ precision: 2, scale: 1 }), // 0.0–9.0
    aiFeedback: jsonb(), // criteria breakdown + suggestions

    timeSpentSec: integer(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("user_responses_user_idx").on(t.userId),
    index("user_responses_user_created_idx").on(t.userId, t.createdAt),
    index("user_responses_type_idx").on(t.questionType),
    // History drills down by user → day → section → type; this serves the whole
    // path, including the per-type attempt list.
    index("user_responses_history_idx").on(
      t.userId,
      t.createdAt,
      t.section,
      t.questionType,
    ),
    // getAttemptedSets joins responses to sets by set_id for one user.
    index("user_responses_user_set_idx").on(t.userId, t.setId),
    // Rolling rows back up into attempts, and loading one attempt's rows.
    index("user_responses_attempt_idx").on(t.attemptId),
  ],
);

/* ------------------------------------------------------------------ *
 * Mock tests: definition → session → served questions → answers → result
 * ------------------------------------------------------------------ */

export const mockTests = pgTable(
  "mock_tests",
  {
    id: uuid().defaultRandom().primaryKey(),
    module: ieltsModule().notNull().default("academic"),
    title: text().notNull(),
    description: text(),
    // Which sections this test includes + per-section config (counts, timing).
    config: jsonb(),
    isFullTest: boolean().notNull().default(true), // all 4 sections
    totalMinutes: integer(),
    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("mock_tests_module_idx").on(t.module)],
);

export const mockTestSessions = pgTable(
  "mock_test_sessions",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mockTestId: uuid().references(() => mockTests.id, { onDelete: "set null" }),
    module: ieltsModule().notNull().default("academic"),

    status: mockSessionStatus().notNull().default("in_progress"),
    currentSection: section(),

    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp({ withTimezone: true }),
    expiresAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("mock_sessions_user_idx").on(t.userId),
    index("mock_sessions_status_idx").on(t.status),
  ],
);

// The exact set of questions served for a given session (selection is frozen).
export const mockTestQuestions = pgTable(
  "mock_test_questions",
  {
    id: uuid().defaultRandom().primaryKey(),
    sessionId: uuid()
      .notNull()
      .references(() => mockTestSessions.id, { onDelete: "cascade" }),
    questionId: uuid()
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    setId: uuid(),
    section: section().notNull(),
    orderIndex: integer().notNull().default(0),
  },
  (t) => [index("mock_questions_session_idx").on(t.sessionId)],
);

export const mockTestAnswers = pgTable(
  "mock_test_answers",
  {
    id: uuid().defaultRandom().primaryKey(),
    sessionId: uuid()
      .notNull()
      .references(() => mockTestSessions.id, { onDelete: "cascade" }),
    questionId: uuid()
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    section: section().notNull(),

    response: jsonb(),
    audioUrl: text(),
    transcript: text(),
    isCorrect: boolean(),
    rawScore: integer(),
    band: numeric({ precision: 2, scale: 1 }),
    aiFeedback: jsonb(),
    timeSpentSec: integer(),
    answeredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("mock_answers_session_question_uq").on(t.sessionId, t.questionId),
    index("mock_answers_session_idx").on(t.sessionId),
  ],
);

export const mockTestResults = pgTable(
  "mock_test_results",
  {
    id: uuid().defaultRandom().primaryKey(),
    sessionId: uuid()
      .notNull()
      .references(() => mockTestSessions.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    module: ieltsModule().notNull().default("academic"),

    // IELTS scaled bands 0.0–9.0 (half-band increments).
    listeningBand: numeric({ precision: 2, scale: 1 }),
    readingBand: numeric({ precision: 2, scale: 1 }),
    writingBand: numeric({ precision: 2, scale: 1 }),
    speakingBand: numeric({ precision: 2, scale: 1 }),
    overallBand: numeric({ precision: 2, scale: 1 }),

    // Raw correct counts (out of 40) for objective sections.
    listeningRaw: integer(),
    readingRaw: integer(),
    // Per-question-type accuracy + other analytics for the dashboard.
    sectionBreakdown: jsonb(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("mock_results_session_uq").on(t.sessionId),
    index("mock_results_user_idx").on(t.userId),
  ],
);

/* ------------------------------------------------------------------ *
 * Inferred content types
 * ------------------------------------------------------------------ */

export type QuestionSet = typeof questionSets.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type UserResponse = typeof userResponses.$inferSelect;
export type MockTest = typeof mockTests.$inferSelect;
export type MockTestSession = typeof mockTestSessions.$inferSelect;
export type MockTestResult = typeof mockTestResults.$inferSelect;
