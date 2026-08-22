import "server-only";

import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { practiceSections } from "@/db/schema";
import type { SectionQuestions } from "@/lib/question-content";
import { SECTION_ORDER, type SectionKey } from "@/lib/ielts";

/** What the candidate actually sits — their profile's target module. */
export type ModuleKind = "academic" | "general";
import { mediaUrl } from "@/lib/media-urls";

/**
 * Read layer for the section-wise practice browser.
 *
 * The browser drills down source → book+test → part, and each step is its own
 * query returning only what that step draws. A single "give me everything"
 * endpoint would ship every transcript and answer key to render a list of book
 * names — so the summary queries below deliberately never select `questions`,
 * `transcript` or `passage_text`. Only openSection(), the last step, reads the
 * whole row, and only for the one part being practised.
 */

/** Only published material is browsable; drafts stay out of the library. */
const LIVE = eq(practiceSections.isActive, true);

/**
 * The scope every step of the drill-down shares: live material, optionally one
 * section, and the candidate's module.
 *
 * A module filter is `module IN (theirs, 'both')`, not equality. Listening and
 * Speaking are the SAME paper in both modules and are stored once as "both";
 * only Reading and Writing exist twice. Equality would hide three quarters of
 * the library from everyone.
 */
function scopeFilter(section?: SectionKey | null, module?: ModuleKind | null) {
  const parts = [LIVE];
  if (section) parts.push(eq(practiceSections.sectionType, section));
  if (module) parts.push(inArray(practiceSections.module, [module, "both"]));
  return and(...parts);
}

export function isSectionKey(v: string | null | undefined): v is SectionKey {
  return !!v && (SECTION_ORDER as string[]).includes(v);
}

/* ------------------------------------------------------------------ *
 * Step 1 — sources
 * ------------------------------------------------------------------ */

export type SourceSummary = {
  source: string;
  label: string;
  /** Distinct book+test combinations under this source. */
  tests: number;
  /** Parts available (the thing you actually sit). */
  parts: number;
  sections: SectionKey[];
};

const SOURCE_LABELS: Record<string, string> = {
  cambridge: "Cambridge",
  original: "IELTSVega original",
  seed: "Sample content",
};

function titleCase(s: string): string {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function listSources(
  section?: SectionKey | null,
  module?: ModuleKind | null,
): Promise<SourceSummary[]> {
  const rows = await db
    .select({
      source: practiceSections.source,
      parts: count(),
      tests: sql<number>`count(distinct (${practiceSections.book}, ${practiceSections.testNumber}))`,
      sections: sql<string[]>`array_agg(distinct ${practiceSections.sectionType}::text)`,
    })
    .from(practiceSections)
    .where(scopeFilter(section, module))
    .groupBy(practiceSections.source)
    .orderBy(practiceSections.source);

  return rows.map((r) => ({
    source: r.source,
    label: SOURCE_LABELS[r.source] ?? titleCase(r.source),
    tests: Number(r.tests),
    parts: Number(r.parts),
    // Keep exam order rather than the alphabetical order Postgres returns.
    sections: SECTION_ORDER.filter((s) => (r.sections ?? []).includes(s)),
  }));
}

/* ------------------------------------------------------------------ *
 * Step 2 — books, flattened to one row per test
 *
 * "Cambridge 21" is not the unit a candidate picks; "Cambridge 21 · Test 1"
 * is. Flattening here means the UI renders a list rather than a second nested
 * accordion.
 * ------------------------------------------------------------------ */

export type BookSummary = {
  /** Stable id for the row, safe to use as a React key and a query param. */
  key: string;
  book: string;
  testNumber: number | null;
  label: string;
  parts: number;
  questions: number;
  sections: SectionKey[];
};

export async function listBooks(
  source: string,
  section?: SectionKey | null,
  module?: ModuleKind | null,
): Promise<BookSummary[]> {
  const rows = await db
    .select({
      book: practiceSections.book,
      testNumber: practiceSections.testNumber,
      parts: count(),
      questions: sql<number>`coalesce(sum(${practiceSections.totalQuestions}), 0)`,
      sections: sql<string[]>`array_agg(distinct ${practiceSections.sectionType}::text)`,
    })
    .from(practiceSections)
    .where(and(scopeFilter(section, module), eq(practiceSections.source, source)))
    .groupBy(practiceSections.book, practiceSections.testNumber)
    .orderBy(asc(practiceSections.book), asc(practiceSections.testNumber));

  return rows.map((r) => {
    const book = r.book ?? "Untitled";
    return {
      key: `${book}::${r.testNumber ?? ""}`,
      book,
      testNumber: r.testNumber,
      label: r.testNumber ? `${book} · Test ${r.testNumber}` : book,
      parts: Number(r.parts),
      questions: Number(r.questions),
      sections: SECTION_ORDER.filter((s) => (r.sections ?? []).includes(s)),
    };
  });
}

/* ------------------------------------------------------------------ *
 * Step 3 — the parts inside one test (what the picker dialog lists)
 * ------------------------------------------------------------------ */

export type PartSummary = {
  id: string;
  sectionType: SectionKey;
  partNumber: number | null;
  title: string;
  questionTypes: string[];
  totalQuestions: number;
  startNumber: number;
  endNumber: number;
  estimatedMinutes: number | null;
  hasAudio: boolean;
};

export async function listParts(
  book: string,
  testNumber: number | null,
  section?: SectionKey | null,
  module?: ModuleKind | null,
): Promise<PartSummary[]> {
  const rows = await db
    .select({
      id: practiceSections.id,
      sectionType: practiceSections.sectionType,
      partNumber: practiceSections.partNumber,
      title: practiceSections.title,
      questionTypes: practiceSections.questionTypes,
      totalQuestions: practiceSections.totalQuestions,
      startNumber: practiceSections.startNumber,
      endNumber: practiceSections.endNumber,
      estimatedMinutes: practiceSections.estimatedMinutes,
      // Presence, not the URL — the list only needs to draw a headphones icon,
      // and the URL is a private object location.
      hasAudio: sql<boolean>`${practiceSections.audioUrl} is not null`,
    })
    .from(practiceSections)
    .where(
      and(
        scopeFilter(section, module),
        eq(practiceSections.book, book),
        testNumber === null
          ? sql`${practiceSections.testNumber} is null`
          : eq(practiceSections.testNumber, testNumber),
      ),
    )
    .orderBy(asc(practiceSections.sectionType), asc(practiceSections.partNumber));

  const ordered = [...rows].sort(
    (a, b) =>
      SECTION_ORDER.indexOf(a.sectionType as SectionKey) -
        SECTION_ORDER.indexOf(b.sectionType as SectionKey) ||
      (a.partNumber ?? 0) - (b.partNumber ?? 0),
  );

  return ordered.map((r) => ({
    id: r.id,
    sectionType: r.sectionType as SectionKey,
    partNumber: r.partNumber,
    title: r.title,
    questionTypes: r.questionTypes ?? [],
    totalQuestions: r.totalQuestions,
    startNumber: r.startNumber,
    endNumber: r.endNumber,
    estimatedMinutes: r.estimatedMinutes,
    hasAudio: Boolean(r.hasAudio),
  }));
}

/* ------------------------------------------------------------------ *
 * Step 4 — one part, in full, for the player
 * ------------------------------------------------------------------ */

export type OpenSection = {
  id: string;
  sectionType: SectionKey;
  book: string | null;
  testNumber: number | null;
  partNumber: number | null;
  title: string;
  instructions: string | null;
  module: string;
  estimatedMinutes: number | null;
  audioUrl: string | null;
  passageText: string | null;
  imageUrl: string | null;
  startNumber: number;
  endNumber: number;
  totalQuestions: number;
  questions: SectionQuestions;
};

/**
 * The answer key is deliberately NOT stripped here — grading happens on the
 * server (submitSectionPractice) and the page passes only the redacted view to
 * the client. See toClientSection().
 */
export async function openSection(id: string): Promise<OpenSection | null> {
  const [row] = await db
    // Named columns, not `select()`. The whole row is ~9.8 KB for a listening
    // part and 7.2 KB of that is the TRANSCRIPT — which is review-only material
    // this read then threw away, so the player was paying four times over for
    // the answer key in prose. The other omissions (tags, difficulty, source,
    // timestamps) are simply unused here.
    .select({
      id: practiceSections.id,
      sectionType: practiceSections.sectionType,
      book: practiceSections.book,
      testNumber: practiceSections.testNumber,
      partNumber: practiceSections.partNumber,
      title: practiceSections.title,
      instructions: practiceSections.instructions,
      module: practiceSections.module,
      estimatedMinutes: practiceSections.estimatedMinutes,
      audioUrl: practiceSections.audioUrl,
      passageText: practiceSections.passageText,
      imageUrl: practiceSections.imageUrl,
      startNumber: practiceSections.startNumber,
      endNumber: practiceSections.endNumber,
      totalQuestions: practiceSections.totalQuestions,
      questions: practiceSections.questions,
    })
    .from(practiceSections)
    .where(and(eq(practiceSections.id, id), LIVE))
    .limit(1);
  if (!row) return null;
  return toOpenSection(row);
}

/**
 * Exactly what openSection selects — deliberately NOT `$inferSelect`, so adding
 * a column to the table cannot silently widen this read, and dropping one from
 * the query fails to compile here instead of at runtime.
 */
type SectionRow = Pick<
  typeof practiceSections.$inferSelect,
  | "id"
  | "sectionType"
  | "book"
  | "testNumber"
  | "partNumber"
  | "title"
  | "instructions"
  | "module"
  | "estimatedMinutes"
  | "audioUrl"
  | "passageText"
  | "imageUrl"
  | "startNumber"
  | "endNumber"
  | "totalQuestions"
  | "questions"
>;

function toOpenSection(row: SectionRow): OpenSection {
  return {
    id: row.id,
    sectionType: row.sectionType as SectionKey,
    book: row.book,
    testNumber: row.testNumber,
    partNumber: row.partNumber,
    title: row.title,
    instructions: row.instructions,
    module: row.module,
    estimatedMinutes: row.estimatedMinutes,
    audioUrl: row.audioUrl,
    passageText: row.passageText,
    imageUrl: row.imageUrl,
    startNumber: row.startNumber,
    endNumber: row.endNumber,
    totalQuestions: row.totalQuestions,
    questions: row.questions,
  };
}

/**
 * Strip the answer key before the section crosses to the client.
 *
 * Without this the correct answers ship inside the RSC payload and are readable
 * in devtools before a single question is answered — the practice equivalent of
 * printing the mark scheme on the exam paper.
 */
export function toClientSection(s: OpenSection) {
  return {
    ...s,
    /**
     * MEDIA CROSSES AS OUR OWN PATHS, never as the stored location.
     *
     * The spread above is deliberate for the harmless columns, but it was also
     * carrying `s3://bucket/<key>` for the recording and the figure straight
     * into the RSC payload — readable in devtools, and publishing the bucket and
     * its layout for nothing. Both routes re-check the session and mint a
     * short-lived presigned URL, so the client only ever needs these.
     */
    audioUrl: mediaUrl.sectionAudio(s.id, s.audioUrl),
    imageUrl: mediaUrl.sectionImage(s.id, s.imageUrl),
    questions: {
      groups: s.questions.groups.map((g) => ({
        ...g,
        // Rebuilt field by field rather than spread-minus-key: a spread would
        // silently carry any future answer-bearing field to the client, while
        // this fails to compile until someone decides where the new field goes.
        items: g.items.map((i) => ({
          n: i.n,
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

export type ClientSection = ReturnType<typeof toClientSection>;
