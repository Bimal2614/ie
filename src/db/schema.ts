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

import type { SectionQuestions } from "../lib/question-content";

/* ------------------------------------------------------------------ *
 * Enums
 * ------------------------------------------------------------------ */

export const userRole = pgEnum("user_role", ["user", "admin"]);
// IELTS comes in two streams; a user studies toward one (can change later).
export const ieltsModule = pgEnum("ielts_module", ["academic", "general"]);
/**
 * What a candidate has paid for. The entitlements each one buys live in
 * src/lib/plans.ts — this column is only the identity, so a change of price or
 * of what a tier includes never needs a migration.
 */
export const userPlan = pgEnum("user_plan", ["free", "pro", "premium"]);

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

    // bcrypt hash (cost 12). Never the plaintext. NULL for OAuth-only accounts
    // (e.g. Google sign-in), which have no password.
    passwordHash: text(),
    // Google account subject id ("sub"), set when linked via Google sign-in.
    googleId: text(),
    name: text().notNull(),
    // Contact number, stored normalized (optional leading "+", digits only).
    // Required at email signup, but NULL-able: Google sign-in creates the row
    // before we have a number, and the app shell then prompts for one.
    phone: text(),
    role: userRole().notNull().default("user"),

    /**
     * Subscription tier. The SERVER's copy — every gate reads this column (via
     * the session), never anything the client sent.
     *
     * There is no billing integration yet, so nothing in the app promotes an
     * account: a paid plan is set out of band (admin/DB, later a payment
     * webhook) and every account starts on `free`. `planExpiresAt` is what a
     * lapsed subscription sets — a past timestamp reads as `free` without
     * rewriting the tier, so a renewal restores the old one and history keeps
     * showing what the candidate actually had. NULL means "does not expire".
     */
    plan: userPlan().notNull().default("free"),
    planExpiresAt: timestamp({ withTimezone: true }),

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
    // Set when the account is disabled (e.g. repeated rate-limit abuse). While
    // set, sessions are rejected so the user cannot use the app.
    deactivatedAt: timestamp({ withTimezone: true }),
    deactivationReason: text(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_normalized_uq").on(t.emailNormalized),
    uniqueIndex("users_google_id_uq").on(t.googleId), // NULLs don't conflict in PG
  ],
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
 * Auth tokens (email verification + password reset)
 *
 * Opaque, single-use, expiring tokens. Only the SHA-256 hash is stored; the raw
 * token lives solely in the emailed link. Same security model as sessions.
 * ------------------------------------------------------------------ */
export const authTokenType = pgEnum("auth_token_type", ["email_verify", "password_reset"]);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text().notNull(), // sha256(rawToken) hex
    type: authTokenType().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true }), // set when consumed (single-use)
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("auth_tokens_token_hash_uq").on(t.tokenHash),
    index("auth_tokens_user_idx").on(t.userId),
  ],
);

/* ================================================================== *
 * BILLING
 *
 *   subscriptions      one PURCHASED PERIOD of a plan - what was bought, when
 *                      it runs from, when it lapses, and how it ended
 *   subscription_logs  append-only history of everything that happened to a
 *                      subscription (and to a user's tier), for support and
 *                      for reconstructing "what did they have on the 3rd?"
 *
 * WHY `users.plan` STILL EXISTS ALONGSIDE THESE.
 * Every gated action has to know the tier, and it already loads the user row to
 * authenticate the request. Deriving the tier from `subscriptions` instead would
 * add a join to the hot path of every submit. So `users.plan` +
 * `users.plan_expires_at` are the cached answer, `subscriptions` is the record
 * of truth, and one writer (src/lib/subscriptions.ts) is the only thing allowed
 * to move them - never a route by hand.
 * ================================================================== */

export const subscriptionStatus = pgEnum("subscription_status", [
  /** Paid and inside its period. */
  "active",
  /** Cancellation requested; still entitled until `current_period_end`. */
  "cancelling",
  /** Ran to its end without renewing - what the cron sweep writes. */
  "expired",
  /** Ended early: an admin revoke or a refund. */
  "cancelled",
  /** Renewal payment failed; entitlement held during the grace window. */
  "past_due",
]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /** The tier this period grants. Never "free" - free is the absence of one. */
    plan: userPlan().notNull(),
    status: subscriptionStatus().notNull().default("active"),

    /**
     * The period's clock.
     *
     * `startsAt` is when this subscription first began and is kept across
     * renewals, so "customer since" survives; the CURRENT paid window is
     * `currentPeriodStart` -> `currentPeriodEnd`, which a renewal rolls forward
     * on the same row. `endsAt` is written once, when it truly stops.
     */
    startsAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    currentPeriodStart: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /**
     * When this paid window closes. There is no cadence column because the plan
     * already says what was bought: the writer computes this from that tier's
     * `billingMonths` in src/lib/plans.ts - Premium sells three months at a
     * time, Pro one. NULL means "does not lapse", which is how an admin grants
     * an open-ended account.
     */
    currentPeriodEnd: timestamp({ withTimezone: true }),
    endsAt: timestamp({ withTimezone: true }),

    /**
     * Set the moment a candidate asks to cancel. Entitlement is NOT withdrawn
     * here - they paid to the end of the period, so the sweep is what takes it
     * away at `current_period_end`.
     */
    cancelAtPeriodEnd: boolean().notNull().default(false),
    cancelledAt: timestamp({ withTimezone: true }),
    cancelReason: text(),

    /** Minor units (cents/paise) - never a float, money must not round. */
    priceCents: integer(),
    currency: text().notNull().default("USD"),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("subscriptions_user_idx").on(t.userId),
    /**
     * The sweep's index: "everything still entitled whose window has closed".
     * Status first, then the date, so the scan touches only live rows.
     */
    index("subscriptions_status_period_end_idx").on(t.status, t.currentPeriodEnd),
  ],
);

/** What happened. One value per state change a subscription can undergo. */
export const subscriptionEventType = pgEnum("subscription_event_type", [
  "created",
  "activated",
  "renewed",
  "upgraded",
  "downgraded",
  "cancel_requested",
  "cancelled",
  "expired",
  "reactivated",
  "payment_succeeded",
  "payment_failed",
  "refunded",
  "plan_granted",
  "plan_revoked",
]);

/** Who caused it - a candidate, an admin, a provider webhook, or the sweep. */
export const subscriptionActor = pgEnum("subscription_actor", ["user", "admin", "system", "webhook"]);

/**
 * Everything that has ever happened to a user's billing, append-only.
 *
 * Kept SEPARATE from `audit_log`: that one is security forensics (logins, rate
 * limits) keyed by a free-text event, and folding money into it means support
 * has to grep. This is the billing ledger - one row per state change, each
 * carrying the tier on both sides of it, so "when did they lose Pro, and who
 * took it" is one indexed read rather than an inference from a diff.
 *
 * Nothing here is ever updated or deleted. A mistake is corrected by writing the
 * correcting event, exactly as a ledger works.
 */
export const subscriptionLogs = pgTable(
  "subscription_logs",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /**
     * SET NULL, not CASCADE: a subscription row may be pruned one day, and the
     * ledger of what a candidate was charged has to outlive it.
     */
    subscriptionId: uuid().references(() => subscriptions.id, { onDelete: "set null" }),

    event: subscriptionEventType().notNull(),
    actor: subscriptionActor().notNull().default("system"),
    /** The admin who acted, when `actor` is "admin". */
    actorUserId: uuid().references(() => users.id, { onDelete: "set null" }),

    /** The tier on each side of the event - "free" is a legitimate value here. */
    fromPlan: userPlan(),
    toPlan: userPlan(),
    /** The subscription's status after the event, so a replay needs no joins. */
    status: subscriptionStatus(),

    /** When the entitlement started and stopped, as of this event. */
    effectiveAt: timestamp({ withTimezone: true }),
    expiresAt: timestamp({ withTimezone: true }),

    amountCents: integer(),
    currency: text(),

    /** Human-readable reason, shown to support. Never a stack trace. */
    note: text(),
    /**
     * Anything else worth keeping, unindexed: a payment id, a gateway's raw
     * callback, the admin's ticket number. Deliberately open - when a payment
     * gateway is wired in, its references land here rather than costing a
     * migration and a column nothing else reads.
     */
    metadata: jsonb(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Support reads one user's billing story newest-first.
    index("subscription_logs_user_created_idx").on(t.userId, t.createdAt),
    index("subscription_logs_subscription_idx").on(t.subscriptionId),
    index("subscription_logs_event_idx").on(t.event),
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
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionLog = typeof subscriptionLogs.$inferSelect;
export type NewSubscriptionLog = typeof subscriptionLogs.$inferInsert;

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
    /**
     * Stable identity for a set built from other content, e.g.
     * `cambridge:11:listening:1:2:11` (book:module:test:part:first question).
     * It is what makes the per-question build idempotent: a re-run after a
     * content fix updates the same rows, so a user's answer history keeps
     * pointing at the question it was given. Null for hand-seeded sets.
     */
    externalKey: text(),

    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("question_sets_external_key_uq").on(t.externalKey),
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
    // The item's position in its set is its identity, so a rebuild can upsert
    // rather than delete and reinsert — which would blank the question_id on
    // every response already recorded against it.
    uniqueIndex("questions_set_order_uq").on(t.setId, t.orderIndex),
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
     * Exam number of the item answered, for content that numbers its questions
     * inside a document rather than giving each one a row — `practice_sections`
     * holds its items as jsonb, so there is no uuid to point at. `set_id` then
     * carries the practice_sections id and this carries the number, which is
     * what review needs to say "Question 7" rather than "an answer".
     */
    questionNumber: integer(),
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
 * MOCK TESTS
 *
 *   mock_tests           one full-length paper  ("Cambridge 19 · Test 2",
 *                        Academic) — the definition, shared by everyone
 *   mock_test_sections   its twelve parts, in exam order, each pointing at the
 *                        `practice_sections` row that already holds that part
 *   mock_test_sessions   one candidate's sitting of it, with the exam clock
 *   mock_test_answers    what they wrote, one row per numbered answer
 *   mock_test_results    the band report
 *
 * WHY THE DEFINITION POINTS AT `practice_sections` AND NOT AT QUESTIONS.
 * A mock is not a new pile of content — it is the SAME twelve parts a candidate
 * can already sit one at a time, assembled into a paper. Referencing the part
 * means a fix to Cambridge 19 Reading Passage 2 reaches practice and the mock
 * together, and the mock definition stays twelve rows rather than eighty.
 * ------------------------------------------------------------------ */

export const mockTests = pgTable(
  "mock_tests",
  {
    id: uuid().defaultRandom().primaryKey(),

    /**
     * Stable, human-readable identity — `cambridge-19-test-2-academic`. It is
     * what makes re-running the builder an UPDATE: a sitting started yesterday
     * keeps pointing at the same test after content is re-imported.
     */
    slug: text().notNull(),

    // A candidate sits one module, and Academic/General are different papers
    // under the same book and test number, so the module is part of the key.
    module: ieltsModule().notNull().default("academic"),

    source: text().notNull().default("cambridge"), // cambridge | original
    book: text(), // "Cambridge 19"
    testNumber: integer(), // 1-4

    title: text().notNull(), // "Cambridge 19 · Test 2"
    description: text(),

    /** Wall-clock minutes from the first module's start to the last one's end. */
    totalMinutes: integer().notNull().default(0),
    /** Marks on the answer sheet across every module (Listening 40 + Reading 40 + …). */
    totalQuestions: integer().notNull().default(0),
    /** Parts, i.e. rows in mock_test_sections. A full paper is 12. */
    totalParts: integer().notNull().default(0),
    /** All four modules present. Only a full paper is offered as a mock. */
    isFullTest: boolean().notNull().default(true),

    /** Listing order — book then test, computed once so the UI needn't parse titles. */
    sortOrder: integer().notNull().default(0),

    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("mock_tests_slug_uq").on(t.slug),
    // One paper per book+test+module: Cambridge 19 Test 2 exists twice, once
    // per module, and never more than that.
    uniqueIndex("mock_tests_source_uq").on(t.book, t.testNumber, t.module),
    // The catalogue lists one module's live papers in order — the whole query.
    index("mock_tests_listing_idx").on(t.module, t.isActive, t.sortOrder),
  ],
);

/**
 * The parts of one mock test, in the order they are sat.
 *
 * `orderIndex` runs 0..11 across the WHOLE paper (Listening 1-4, Reading 1-3,
 * Writing 1-2, Speaking 1-3) so the exam order is data rather than a sort rule
 * repeated in every reader.
 *
 * NUMBERING. `startNumber`/`endNumber` are the numbers printed on THIS paper's
 * answer sheet. For Listening and Reading they match the part's own numbering
 * (1-10, 11-20 …, and 1-13, 14-26 …). For Writing and Speaking they do not:
 * every stored Writing task and Speaking part starts its own count at 1, so a
 * paper would otherwise show three "question 1"s. Here they are renumbered
 * continuously within the module — Writing 1-2, Speaking 1-11 — exactly as a
 * candidate counts them. The offset between the two numberings is what the read
 * layer applies to turn a stored item number into a sheet number.
 */
export const mockTestSections = pgTable(
  "mock_test_sections",
  {
    id: uuid().defaultRandom().primaryKey(),
    mockTestId: uuid()
      .notNull()
      .references(() => mockTests.id, { onDelete: "cascade" }),
    /** The `practice_sections` row that holds this part's stimulus + questions. */
    sectionId: uuid()
      .notNull()
      .references(() => practiceSections.id, { onDelete: "cascade" }),

    section: section().notNull(), // denormalised: every read groups by it
    /** Part within its module: Listening 1-4, Reading 1-3, Writing 1-2, Speaking 1-3. */
    partNumber: integer().notNull().default(1),
    /** Position in the whole paper, 0-based. */
    orderIndex: integer().notNull().default(0),
    /** Position within its module, 0-based — what the part tabs count. */
    moduleIndex: integer().notNull().default(0),

    /** This paper's answer-sheet numbers for the part (inclusive). */
    startNumber: integer().notNull().default(1),
    endNumber: integer().notNull().default(1),
    /** Marks the part carries — not item count; a "choose TWO" item is worth 2. */
    totalQuestions: integer().notNull().default(0),
  },
  (t) => [
    index("mock_sections_test_idx").on(t.mockTestId),
    // Exam order is unique by construction; a duplicate would be a build bug.
    uniqueIndex("mock_sections_order_uq").on(t.mockTestId, t.orderIndex),
    // A part appears in a paper exactly once.
    uniqueIndex("mock_sections_part_uq").on(t.mockTestId, t.sectionId),
    index("mock_sections_section_idx").on(t.sectionId),
  ],
);

/**
 * One candidate's sitting.
 *
 * THE CLOCK IS A FROZEN TIMELINE, NOT A COUNTDOWN. `timeline` holds an absolute
 * start and end instant per module, decided by the server when the sitting
 * begins. Nothing pauses it: closing the tab, losing the connection or walking
 * away spends exam time exactly as it does in a real test hall. Resuming
 * therefore does not "continue where you left off" — it asks the timeline where
 * the clock is NOW, which is why leaving 5 minutes into a 40-minute Listening
 * and coming back 50 minutes later lands you 10 minutes into Reading, with
 * Listening gone.
 *
 * Finishing a module early is the one thing that moves the timeline: the
 * modules after it are rebased to start immediately, so an early finish buys
 * back the waiting rather than the time (see rebaseTimeline).
 */
export const mockTestSessions = pgTable(
  "mock_test_sessions",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mockTestId: uuid()
      .notNull()
      .references(() => mockTests.id, { onDelete: "cascade" }),
    module: ieltsModule().notNull().default("academic"),

    status: mockSessionStatus().notNull().default("in_progress"),

    /** The module the candidate is in right now — Listening, Reading, … */
    currentSection: section(),
    /** Its position in the paper's module list, 0-based. */
    currentSectionIndex: integer().notNull().default(0),
    /**
     * When that module's time is up, server-side. Denormalised from `timeline`
     * so "which sittings have run out" is an indexed query rather than a jsonb
     * scan, and so a stale client can never argue about the deadline.
     */
    currentSectionEndsAt: timestamp({ withTimezone: true }),

    /**
     * The whole exam plan: `[{ section, index, startsAt, endsAt }]` in exam
     * order, as absolute instants. Typed as `MockTimeline` in
     * src/lib/mock-timing.ts.
     */
    timeline: jsonb().$type<unknown>(),

    /**
     * Autosaved work, keyed `"<practiceSectionId>:<itemNumber>"`.
     *
     * NOT keyed by the number alone: Listening and Reading both number 1-40, and
     * every Writing task and Speaking part starts again at 1, so a bare number
     * collides four ways inside a single paper.
     */
    draftAnswers: jsonb().$type<Record<string, unknown>>(),
    /** Accumulated focus seconds, same keys as draftAnswers. */
    draftTimings: jsonb().$type<Record<string, number>>(),

    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp({ withTimezone: true }),
    /** End of the last module — after this the paper is over, answered or not. */
    expiresAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("mock_sessions_user_idx").on(t.userId),
    index("mock_sessions_status_idx").on(t.status),
    // "Do I already have this paper open?" — the resume check on every start.
    index("mock_sessions_user_test_idx").on(t.userId, t.mockTestId, t.status),
    // The sweep that closes sittings whose clock ran out while nobody was there.
    index("mock_sessions_expiry_idx").on(t.status, t.expiresAt),
  ],
);

/**
 * One answered item.
 *
 * Items live inside a `practice_sections` jsonb document and have no row of
 * their own, so a part id plus the item's number is the identity — the same
 * pair `user_responses` uses for section practice, which is why the AI scorers
 * resolve a mock answer's prompt without needing a second code path.
 */
export const mockTestAnswers = pgTable(
  "mock_test_answers",
  {
    id: uuid().defaultRandom().primaryKey(),
    sessionId: uuid()
      .notNull()
      .references(() => mockTestSessions.id, { onDelete: "cascade" }),
    /** The part it belongs to, in `practice_sections`. */
    sectionId: uuid().notNull(),
    /** The item's number INSIDE that part — what the answer key is keyed by. */
    questionNumber: integer().notNull(),
    /** The number printed on this paper's answer sheet. See mock_test_sections. */
    sheetNumber: integer().notNull().default(0),

    section: section().notNull(),
    questionType: questionType().notNull(),
    /** Marks the item carries; 2 for a paired "choose TWO letters". */
    marks: integer().notNull().default(1),

    response: jsonb(),
    audioUrl: text(),
    transcript: text(),
    isCorrect: boolean(),
    rawScore: integer(), // marks EARNED, which a half-right pair makes < marks
    band: numeric({ precision: 2, scale: 1 }),
    aiFeedback: jsonb(),
    timeSpentSec: integer(),
    answeredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("mock_answers_item_uq").on(t.sessionId, t.sectionId, t.questionNumber),
    index("mock_answers_session_idx").on(t.sessionId),
    // The results drill-down loads one module of one sitting.
    index("mock_answers_session_section_idx").on(t.sessionId, t.section),
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
    mockTestId: uuid().references(() => mockTests.id, { onDelete: "set null" }),
    module: ieltsModule().notNull().default("academic"),

    // IELTS scaled bands 0.0-9.0 (half-band increments).
    listeningBand: numeric({ precision: 2, scale: 1 }),
    readingBand: numeric({ precision: 2, scale: 1 }),
    writingBand: numeric({ precision: 2, scale: 1 }),
    speakingBand: numeric({ precision: 2, scale: 1 }),
    overallBand: numeric({ precision: 2, scale: 1 }),

    // Raw correct marks (out of 40) for the objective modules.
    listeningRaw: integer(),
    readingRaw: integer(),
    // Per-module tallies + per-question-type accuracy for the dashboard.
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
export type NewMockTest = typeof mockTests.$inferInsert;
export type MockTestSection = typeof mockTestSections.$inferSelect;
export type NewMockTestSection = typeof mockTestSections.$inferInsert;
export type MockTestSession = typeof mockTestSessions.$inferSelect;
export type MockTestAnswer = typeof mockTestAnswers.$inferSelect;
export type MockTestResult = typeof mockTestResults.$inferSelect;

/* ================================================================== *
 * PRACTICE SECTIONS
 *
 * One row = one exam part: Listening Part 1, Reading Passage 2, Writing
 * Task 1, Speaking Part 2. It carries the single stimulus that part shares
 * (one recording, one passage, one visual) as real columns, and the questions
 * asked against it — grouped by task type, with their answer key — as one
 * jsonb document.
 *
 * WHY THE QUESTIONS ARE JSON. A part is authored, reviewed and published as a
 * unit: you never edit question 7 of Cambridge 21 Test 1 without the table it
 * sits in. Splitting it across rows meant a 10-statement insert to add a part
 * and a join to render one. As a document it is one insert, one read, and the
 * file on disk looks like the page in the book.
 *
 * WHY EVERYTHING ELSE IS COLUMNS. Anything the app filters, counts, or orders
 * by — section, type, book, active — stays a real column so the practice
 * library and mock builder use indexes rather than jsonb probes.
 * ================================================================== */

export const practiceSections = pgTable(
  "practice_sections",
  {
    id: uuid().defaultRandom().primaryKey(),

    /* --- What this is --- */
    module: moduleScope().notNull().default("both"),
    sectionType: section().notNull(),
    /**
     * The type this part is filed under in the practice library. A part mixing
     * table + note completion has to appear somewhere, so one type leads.
     */
    questionType: questionType().notNull(),
    /**
     * Every type present. Filed under table_completion but also containing
     * note completion, this part must still surface when a candidate drills
     * note completion — the primary type alone would hide it.
     */
    questionTypes: jsonb().$type<string[]>().notNull().default([]),

    /* --- Where it came from --- */
    book: text(), // "Cambridge 21"
    testNumber: integer(), // 1
    partNumber: integer(), // Listening Part 1 / Reading Passage 2 / Task 1
    source: text().notNull().default("original"), // cambridge | seed | original

    /* --- Presentation --- */
    title: text().notNull(),
    /** Section-level instruction. Groups carry their own, which take priority. */
    instructions: text(),
    difficulty: difficulty().notNull().default("medium"),
    estimatedMinutes: integer(),

    /* --- The stimulus: at most one of these per row --- */
    audioUrl: text(), // listening — ONE file for the part; plays once
    transcript: text(), // listening — review only, never during the attempt
    passageText: text(), // reading
    imageUrl: text(), // writing task 1 visual / map / diagram

    /* --- Numbering: continuous across the paper, as on the answer sheet --- */
    startNumber: integer().notNull().default(1),
    endNumber: integer().notNull().default(1),
    totalQuestions: integer().notNull().default(0),

    /* --- The questions + answer key --- */
    questions: jsonb().$type<SectionQuestions>().notNull(),

    tags: jsonb().$type<string[]>(),
    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("practice_sections_section_idx").on(t.sectionType),
    index("practice_sections_type_idx").on(t.questionType),
    // The practice library pages by (section, type, active) ordered by
    // (createdAt, id); covering all five lets Postgres satisfy LIMIT/OFFSET
    // from the index without sorting the whole match set.
    index("practice_sections_paging_idx").on(
      t.sectionType,
      t.questionType,
      t.isActive,
      t.createdAt,
      t.id,
    ),
    // Re-importing a book updates its parts instead of duplicating them, so an
    // import can be re-run after a typo fix. NULLs don't conflict in PG, so
    // original (non-book) content is unaffected.
    //
    // `module` is part of the key because Academic and General Training are
    // different papers under the same book, test and part: Cambridge 11 Test 1
    // Reading Part 1 exists twice. Listening and Speaking are the SAME paper in
    // both modules and are stored once as "both", so they never collide.
    uniqueIndex("practice_sections_source_uq").on(
      t.book,
      t.testNumber,
      t.sectionType,
      t.partNumber,
      t.module,
    ),
  ],
);

export type PracticeSection = typeof practiceSections.$inferSelect;
export type NewPracticeSection = typeof practiceSections.$inferInsert;
