import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { mockTests, mockTestSections, practiceSections } from "@/db/schema";
import { SECTION_ORDER, type SectionKey } from "@/lib/ielts";
import { shiftLayoutGaps, type SectionQuestions } from "@/lib/question-content";
import { mediaUrl } from "@/lib/media-urls";
import { MOCK_MODULE_MINUTES } from "@/lib/mock-timing";

/**
 * Read layer for mock tests — the catalogue, and one paper's parts.
 *
 * A mock test is a *definition* (which twelve `practice_sections` rows, in which
 * order, numbered how); a sitting of it lives in `mock_test_sessions`. Nothing
 * here knows about a candidate, which is why the catalogue query is the same for
 * everyone and can be cached later without leaking anyone's progress.
 *
 * ONE MODULE AT A TIME. `openMockModule` deliberately loads a single module's
 * parts rather than the whole paper. Shipping all twelve would put three reading
 * passages and both writing prompts in the page source while the candidate is
 * still on Listening — the exam equivalent of handing out every booklet at once.
 */

/* ------------------------------------------------------------------ *
 * The catalogue
 * ------------------------------------------------------------------ */

export type MockTestSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  module: "academic" | "general";
  book: string | null;
  testNumber: number | null;
  totalMinutes: number;
  totalQuestions: number;
  totalParts: number;
  /** Module → parts in it, for the "4 · 3 · 2 · 3" breakdown on the card. */
  parts: { section: SectionKey; count: number; minutes: number }[];
};

/**
 * Every live full-length paper for one module, newest book first.
 *
 * Two queries, not one per test, and both are aggregates: adding a book adds
 * rows to a `count(*)`, never a round trip.
 */
export async function listMockTests(module: "academic" | "general"): Promise<MockTestSummary[]> {
  const tests = await db
    // Named columns, not the whole row: `source`, `isFullTest` and the
    // timestamps are never read here, and SELECT * would ship them to every
    // card on the page.
    .select({
      id: mockTests.id,
      slug: mockTests.slug,
      title: mockTests.title,
      description: mockTests.description,
      module: mockTests.module,
      book: mockTests.book,
      testNumber: mockTests.testNumber,
      totalMinutes: mockTests.totalMinutes,
      totalQuestions: mockTests.totalQuestions,
      totalParts: mockTests.totalParts,
    })
    .from(mockTests)
    .where(and(eq(mockTests.module, module), eq(mockTests.isActive, true)))
    // NEWEST BOOK FIRST, oldest last: Cambridge 21 down to Cambridge 11. The
    // tests INSIDE a book still run 1 → 4 — a candidate wants this year's
    // paper at the top of the shelf, not Test 4 before Test 1 — so the two
    // halves of `sortOrder` (bookNumber * 10 + testNumber) are split back out
    // here and sorted in opposite directions. Sorting an expression gives up
    // mock_tests_listing_idx for the ordering, which costs nothing on a
    // catalogue of ~44 rows and saves storing a second column that could drift
    // out of step with the first.
    .orderBy(
      desc(sql`${mockTests.sortOrder} / 10`),
      asc(sql`${mockTests.sortOrder} % 10`),
      asc(mockTests.title),
    );

  if (tests.length === 0) return [];

  // COUNTED IN POSTGRES, not here. The card only needs "4 · 3 · 2 · 3",
  // so this returns one row per (paper, module) — four per test — rather
  // than one row per part, which for a shelf of 40 papers is 480 rows
  // fetched to produce 160 numbers.
  const parts = await db
    .select({
      mockTestId: mockTestSections.mockTestId,
      section: mockTestSections.section,
      count: sql<number>`count(*)`,
    })
    .from(mockTestSections)
    .where(
      inArray(
        mockTestSections.mockTestId,
        tests.map((t) => t.id),
      ),
    )
    .groupBy(mockTestSections.mockTestId, mockTestSections.section);

  const counts = new Map<string, Map<SectionKey, number>>();
  for (const p of parts) {
    const byTest = counts.get(p.mockTestId) ?? new Map<SectionKey, number>();
    byTest.set(p.section as SectionKey, Number(p.count));
    counts.set(p.mockTestId, byTest);
  }

  return tests.map((t) => {
    const byTest = counts.get(t.id) ?? new Map<SectionKey, number>();
    return {
      id: t.id,
      slug: t.slug,
      title: t.title,
      description: t.description,
      module: t.module,
      book: t.book,
      testNumber: t.testNumber,
      totalMinutes: t.totalMinutes,
      totalQuestions: t.totalQuestions,
      totalParts: t.totalParts,
      // Exam order, not the order Postgres happened to return.
      parts: SECTION_ORDER.filter((s) => byTest.has(s)).map((s) => ({
        section: s,
        count: byTest.get(s)!,
        minutes: MOCK_MODULE_MINUTES[s],
      })),
    };
  });
}

/* ------------------------------------------------------------------ *
 * One paper's shape — the running order, with no content
 * ------------------------------------------------------------------ */

export type MockModuleOutline = {
  section: SectionKey;
  /** Position in the paper, 0-based — the index the timeline is keyed by. */
  index: number;
  parts: number;
  /** Marks on the answer sheet for this module (Listening/Reading: 40). */
  questions: number;
  minutes: number;
};

export type MockPaperOutline = {
  id: string;
  title: string;
  module: "academic" | "general";
  book: string | null;
  testNumber: number | null;
  totalMinutes: number;
  modules: MockModuleOutline[];
};

/**
 * The paper's running order and nothing else.
 *
 * Read on every load of a sitting — to plan the clock, to draw the progress
 * rail, and to know how many modules there are — so it stays free of passages,
 * layouts and answer keys.
 */
export async function outlineMockTest(mockTestId: string): Promise<MockPaperOutline | null> {
  const [test] = await db
    .select()
    .from(mockTests)
    .where(and(eq(mockTests.id, mockTestId), eq(mockTests.isActive, true)))
    .limit(1);
  if (!test) return null;

  const rows = await db
    .select({
      section: mockTestSections.section,
      totalQuestions: mockTestSections.totalQuestions,
      orderIndex: mockTestSections.orderIndex,
    })
    .from(mockTestSections)
    .where(eq(mockTestSections.mockTestId, mockTestId))
    .orderBy(asc(mockTestSections.orderIndex));

  const bySection = new Map<SectionKey, { parts: number; questions: number }>();
  for (const r of rows) {
    const s = r.section as SectionKey;
    const cur = bySection.get(s) ?? { parts: 0, questions: 0 };
    cur.parts += 1;
    cur.questions += r.totalQuestions;
    bySection.set(s, cur);
  }

  const modules = SECTION_ORDER.filter((s) => bySection.has(s)).map((s, index) => ({
    section: s,
    index,
    parts: bySection.get(s)!.parts,
    questions: bySection.get(s)!.questions,
    minutes: MOCK_MODULE_MINUTES[s],
  }));

  return {
    id: test.id,
    title: test.title,
    module: test.module,
    book: test.book,
    testNumber: test.testNumber,
    totalMinutes: test.totalMinutes,
    modules,
  };
}

/** The ordered modules of a paper — what the timeline is built from. */
export async function mockModuleOrder(mockTestId: string): Promise<SectionKey[]> {
  const rows = await db
    .selectDistinct({ section: mockTestSections.section })
    .from(mockTestSections)
    .where(eq(mockTestSections.mockTestId, mockTestId));
  const present = new Set(rows.map((r) => r.section as SectionKey));
  return SECTION_ORDER.filter((s) => present.has(s));
}

/* ------------------------------------------------------------------ *
 * One module's parts, in full
 * ------------------------------------------------------------------ */

export type MockPart = {
  /** `mock_test_sections` row id — this part's slot in this paper. */
  id: string;
  /** `practice_sections` row id — the identity every answer is keyed by. */
  sectionId: string;
  section: SectionKey;
  partNumber: number;
  /** Position within its module, 0-based. */
  moduleIndex: number;
  title: string;
  instructions: string | null;
  estimatedMinutes: number | null;
  audioUrl: string | null;
  passageText: string | null;
  imageUrl: string | null;
  /** Answer-sheet numbers on THIS paper. */
  startNumber: number;
  endNumber: number;
  totalQuestions: number;
  /**
   * sheetNumber = item.n + numberOffset.
   *
   * Zero for Listening and Reading, which already number continuously across the
   * paper. Non-zero for Writing and Speaking, where every stored part restarts
   * at 1 and the paper has to count them straight through instead.
   */
  numberOffset: number;
  questions: SectionQuestions;
};

/**
 * Every part of one module, with the answer key still attached.
 *
 * SERVER ONLY. Grading reads the key from here; the player is handed
 * `toClientMockPart`, which rebuilds each item without it.
 */
export async function openMockModule(
  mockTestId: string,
  section: SectionKey,
): Promise<MockPart[]> {
  const rows = await db
    .select({
      id: mockTestSections.id,
      sectionId: mockTestSections.sectionId,
      section: mockTestSections.section,
      partNumber: mockTestSections.partNumber,
      moduleIndex: mockTestSections.moduleIndex,
      startNumber: mockTestSections.startNumber,
      endNumber: mockTestSections.endNumber,
      totalQuestions: mockTestSections.totalQuestions,
      // Named columns rather than the whole practice_sections row: `transcript`
      // alone is ~7 KB a part and is review-only material the player must never
      // receive — it is the answers, in prose.
      title: practiceSections.title,
      instructions: practiceSections.instructions,
      estimatedMinutes: practiceSections.estimatedMinutes,
      audioUrl: practiceSections.audioUrl,
      passageText: practiceSections.passageText,
      imageUrl: practiceSections.imageUrl,
      partStartNumber: practiceSections.startNumber,
      questions: practiceSections.questions,
    })
    .from(mockTestSections)
    .innerJoin(practiceSections, eq(mockTestSections.sectionId, practiceSections.id))
    .where(
      and(
        eq(mockTestSections.mockTestId, mockTestId),
        eq(mockTestSections.section, section),
        eq(practiceSections.isActive, true),
      ),
    )
    .orderBy(asc(mockTestSections.orderIndex));

  return rows.map((r) => ({
    id: r.id,
    sectionId: r.sectionId,
    section: r.section as SectionKey,
    partNumber: r.partNumber,
    moduleIndex: r.moduleIndex,
    title: r.title,
    instructions: r.instructions,
    estimatedMinutes: r.estimatedMinutes,
    // OUR gated paths, never the stored s3:// location.
    audioUrl: mediaUrl.sectionAudio(r.sectionId, r.audioUrl),
    passageText: r.passageText,
    imageUrl: mediaUrl.sectionImage(r.sectionId, r.imageUrl),
    startNumber: r.startNumber,
    endNumber: r.endNumber,
    totalQuestions: r.totalQuestions,
    numberOffset: r.startNumber - r.partStartNumber,
    questions: r.questions,
  }));
}

/** Every part of a paper, module by module. Used by grading and review. */
export async function openMockPaper(mockTestId: string): Promise<MockPart[]> {
  const order = await mockModuleOrder(mockTestId);
  const modules = await Promise.all(order.map((s) => openMockModule(mockTestId, s)));
  return modules.flat();
}

/* ------------------------------------------------------------------ *
 * The redacted view
 * ------------------------------------------------------------------ */

/**
 * Strip the answer key, and renumber the part onto this paper's answer sheet.
 *
 * TWO NUMBERINGS MEET HERE. Storage numbers an item within its part (Writing
 * Task 2 is item 1 of part 2); the paper numbers it across the module (question
 * 2 of 2). Everything the candidate sees and everything they send back is in
 * SHEET numbers, and the server converts once, on the way in and on the way out
 * — so no component has to remember which of the two it is holding.
 *
 * The key is rebuilt field by field rather than spread-minus-`answer`: a spread
 * would silently carry any future answer-bearing field into the RSC payload,
 * where it is readable in devtools before a single question is answered. This
 * fails to compile instead, until someone decides where the new field goes.
 *
 * The result matches `ClientGroup`/`ClientSectionView` in section-body.tsx, so
 * the mock and section practice render through exactly the same component and
 * cannot drift apart.
 */
export function toClientMockPart(part: MockPart) {
  const shift = part.numberOffset;
  return {
    id: part.id,
    sectionId: part.sectionId,
    sectionType: part.section,
    partNumber: part.partNumber,
    moduleIndex: part.moduleIndex,
    title: part.title,
    instructions: part.instructions,
    audioUrl: part.audioUrl,
    passageText: part.passageText,
    imageUrl: part.imageUrl,
    startNumber: part.startNumber,
    endNumber: part.endNumber,
    totalQuestions: part.totalQuestions,
    questions: {
      groups: (part.questions?.groups ?? []).map((g) => ({
        questionType: g.questionType,
        instruction: g.instruction,
        from: g.from + shift,
        to: g.to + shift,
        // A layout's `[[n]]` gaps name items by number, so they move too.
        layout: shiftLayoutGaps(g.layout, shift),
        items: g.items.map((i) => ({
          n: i.n + shift,
          prompt: i.prompt,
          options: i.options,
          selectCount: i.selectCount,
          marks: i.marks,
          wordLimitMin: i.wordLimitMin,
          wordLimitMax: i.wordLimitMax,
          prepSeconds: i.prepSeconds,
          speakSeconds: i.speakSeconds,
          cueCard: i.cueCard,
        })),
      })),
    },
  };
}

export type ClientMockPart = ReturnType<typeof toClientMockPart>;
