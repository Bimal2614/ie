/**
 * Assemble full-length mock tests out of the parts already in the library.
 *
 *   npm run db:build:mocks                 (local)
 *   npm run db:build:mocks -- --staging    (staging)
 *   npm run db:build:mocks -- --reset      (also delete every sitting)
 *   npm run db:build:mocks -- --dry-run    (report only, write nothing)
 *
 * WHAT COUNTS AS A MOCK. A mock test is a whole exam paper, so it is only built
 * where all four modules are present for that module stream:
 *
 *     Listening 4 parts · Reading 3 · Writing 2 · Speaking 3
 *
 * Academic and General Training are different papers under the same book and
 * test number — General borrows Listening and Speaking (stored once, as "both")
 * but has its own Reading and Writing. A book+test with no General Reading
 * therefore yields an Academic mock and no General one, and is reported as such
 * rather than silently producing a paper with a hole in it.
 *
 * IDEMPOTENT. Tests are keyed by slug and parts by (test, order), so a re-run
 * after a content fix UPDATES the same rows — a sitting started yesterday keeps
 * pointing at the paper it was given.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { resolveTarget } from "./target";
import {
  mockTests,
  mockTestSections,
  mockTestSessions,
  practiceSections,
  type NewMockTestSection,
} from "./schema";
import { SECTION_ORDER, type SectionKey } from "../lib/ielts";
import { MOCK_MODULE_MINUTES, totalMinutes } from "../lib/mock-timing";

/** A full paper's shape: how many parts each module must contribute. */
const REQUIRED_PARTS: Record<SectionKey, number> = {
  listening: 4,
  reading: 3,
  writing: 2,
  speaking: 3,
};

type ModuleKind = "academic" | "general";
const MODULES: ModuleKind[] = ["academic", "general"];

type PartRow = {
  id: string;
  book: string | null;
  testNumber: number | null;
  module: string;
  sectionType: string;
  partNumber: number | null;
  title: string;
  startNumber: number;
  endNumber: number;
  totalQuestions: number;
  source: string;
};

/* ------------------------------------------------------------------ *
 * Connection — same two-target pattern as the content import
 * ------------------------------------------------------------------ */

function connect() {
  // Target resolution is shared with the content import and the question
  // build — see ./target.ts for why it is not inlined here any more.
  const target = resolveTarget();
  const client = postgres(target.url, { ssl: target.ssl, max: 1 });
  // `casing` must match the runtime client (src/db/index.ts), or the generated
  // SQL asks for "testNumber" instead of "test_number".
  return {
    db: drizzle(client, { schema, casing: "snake_case" }),
    client,
    label: target.label,
  };
}

/* ------------------------------------------------------------------ *
 * Naming
 * ------------------------------------------------------------------ */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Listing order. "Cambridge 9" must not sort after "Cambridge 20", which is
 * exactly what ordering by title does, so the number is pulled out once here
 * and stored rather than re-derived by every reader.
 */
function sortOrderFor(book: string, testNumber: number): number {
  const n = Number(book.match(/(\d+)/)?.[1] ?? 0);
  return n * 10 + testNumber;
}

const MODULE_LABEL: Record<ModuleKind, string> = {
  academic: "Academic",
  general: "General Training",
};

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */

type Assembled = {
  slug: string;
  module: ModuleKind;
  source: string;
  book: string;
  testNumber: number;
  title: string;
  description: string;
  sortOrder: number;
  parts: {
    sectionId: string;
    section: SectionKey;
    partNumber: number;
    orderIndex: number;
    moduleIndex: number;
    startNumber: number;
    endNumber: number;
    totalQuestions: number;
  }[];
};

/**
 * Pick one module stream's parts out of a book+test, or explain what is missing.
 *
 * The module filter is `IN (theirs, 'both')`, never equality: Listening and
 * Speaking are the SAME paper in both streams and are stored once as "both", so
 * equality would find no Listening for anybody.
 */
function assemble(
  book: string,
  testNumber: number,
  rows: PartRow[],
  module: ModuleKind,
): { ok: true; test: Assembled } | { ok: false; missing: string[] } {
  const pick = (section: SectionKey) =>
    rows
      .filter(
        (r) =>
          r.sectionType === section && (r.module === module || r.module === "both"),
      )
      .sort((a, b) => (a.partNumber ?? 0) - (b.partNumber ?? 0));

  const chosen = new Map<SectionKey, PartRow[]>();
  const missing: string[] = [];
  for (const section of SECTION_ORDER) {
    const found = pick(section);
    if (found.length < REQUIRED_PARTS[section]) {
      missing.push(`${section} ${found.length}/${REQUIRED_PARTS[section]}`);
      continue;
    }
    // More than the paper needs (a re-import that left a stray part) takes the
    // first N by part number rather than making an over-long paper.
    chosen.set(section, found.slice(0, REQUIRED_PARTS[section]));
  }
  if (missing.length > 0) return { ok: false, missing };

  const parts: Assembled["parts"] = [];
  let orderIndex = 0;
  for (const section of SECTION_ORDER) {
    const rowsIn = chosen.get(section)!;
    // Writing and Speaking parts each restart at 1 in storage, so the paper
    // counts them straight through instead. Listening and Reading already carry
    // the paper's own numbering (1-10, 11-20 …) and keep it.
    const renumber = section === "writing" || section === "speaking";
    let cursor = 1;
    rowsIn.forEach((r, moduleIndex) => {
      const span = Math.max(0, r.endNumber - r.startNumber);
      const startNumber = renumber ? cursor : r.startNumber;
      const endNumber = startNumber + span;
      cursor = endNumber + 1;
      parts.push({
        sectionId: r.id,
        section,
        partNumber: r.partNumber ?? moduleIndex + 1,
        orderIndex: orderIndex++,
        moduleIndex,
        startNumber,
        endNumber,
        totalQuestions: r.totalQuestions,
      });
    });
  }

  const title = `${book} · Test ${testNumber}`;
  return {
    ok: true,
    test: {
      slug: slugify(`${book}-test-${testNumber}-${module}`),
      module,
      source: rows[0]?.source ?? "cambridge",
      book,
      testNumber,
      title,
      description: `The complete ${book} Test ${testNumber} ${MODULE_LABEL[module]} paper — all four modules in one timed sitting.`,
      sortOrder: sortOrderFor(book, testNumber),
      parts,
    },
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const reset = process.argv.includes("--reset");
  const { db, client, label } = connect();

  console.log(`\nBuilding mock tests on ${label}${dryRun ? " (dry run)" : ""}\n`);

  const rows: PartRow[] = await db
    .select({
      id: practiceSections.id,
      book: practiceSections.book,
      testNumber: practiceSections.testNumber,
      module: practiceSections.module,
      sectionType: practiceSections.sectionType,
      partNumber: practiceSections.partNumber,
      title: practiceSections.title,
      startNumber: practiceSections.startNumber,
      endNumber: practiceSections.endNumber,
      totalQuestions: practiceSections.totalQuestions,
      source: practiceSections.source,
    })
    .from(practiceSections)
    .where(eq(practiceSections.isActive, true));

  // Group by the unit a paper is: one book, one test. The book and test are kept
  // as fields rather than parsed back out of the key — "Cambridge 11" has a
  // space in it, so a joined key cannot be split apart again.
  type Bucket = { book: string; testNumber: number; rows: PartRow[] };
  const byTest = new Map<string, Bucket>();
  for (const r of rows) {
    if (!r.book || r.testNumber === null) continue; // hand-authored, not a paper
    const key = `${r.book}::${r.testNumber}`;
    const bucket = byTest.get(key);
    if (bucket) bucket.rows.push(r);
    else byTest.set(key, { book: r.book, testNumber: r.testNumber, rows: [r] });
  }

  const built: Assembled[] = [];
  const skipped: string[] = [];

  for (const { book, testNumber, rows: testRows } of byTest.values()) {
    for (const stream of MODULES) {
      const res = assemble(book, testNumber, testRows, stream);
      if (res.ok) built.push(res.test);
      else skipped.push(`${book} Test ${testNumber} · ${MODULE_LABEL[stream]} — missing ${res.missing.join(", ")}`);
    }
  }

  built.sort((a, b) => a.sortOrder - b.sortOrder || a.module.localeCompare(b.module));
  skipped.sort();

  console.log(`Complete papers: ${built.length}`);
  for (const m of MODULES) {
    console.log(`  ${MODULE_LABEL[m]}: ${built.filter((b) => b.module === m).length}`);
  }
  if (skipped.length > 0) {
    console.log(`\nIncomplete, not built (${skipped.length}):`);
    for (const s of skipped) console.log(`  · ${s}`);
  }

  if (dryRun) {
    console.log("\nDry run — nothing written.\n");
    await client.end();
    return;
  }

  if (reset) {
    // Sittings cascade from mock_tests, and answers + results cascade from the
    // sitting, so one delete clears the lot.
    const gone = await db.delete(mockTestSessions).returning({ id: mockTestSessions.id });
    console.log(`\nReset: deleted ${gone.length} sitting(s).`);
  }

  const keptSlugs = new Set(built.map((b) => b.slug));

  for (const test of built) {
    const [row] = await db
      .insert(mockTests)
      .values({
        slug: test.slug,
        module: test.module,
        source: test.source,
        book: test.book,
        testNumber: test.testNumber,
        title: test.title,
        description: test.description,
        totalMinutes: totalMinutes(SECTION_ORDER),
        // Marks on the answer sheet, which is what a candidate is scored out of.
        totalQuestions: test.parts.reduce((n, p) => n + p.totalQuestions, 0),
        totalParts: test.parts.length,
        isFullTest: true,
        sortOrder: test.sortOrder,
        isActive: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: mockTests.slug,
        set: {
          module: test.module,
          source: test.source,
          book: test.book,
          testNumber: test.testNumber,
          title: test.title,
          description: test.description,
          totalMinutes: totalMinutes(SECTION_ORDER),
          totalQuestions: test.parts.reduce((n, p) => n + p.totalQuestions, 0),
          totalParts: test.parts.length,
          isFullTest: true,
          sortOrder: test.sortOrder,
          isActive: true,
          updatedAt: new Date(),
        },
      })
      .returning({ id: mockTests.id });

    // The part list is replaced wholesale. Nothing references these rows (a
    // sitting's answers point at `practice_sections`, not at the slot), so
    // rewriting them is safe and keeps re-runs honest about removed parts.
    await db.delete(mockTestSections).where(eq(mockTestSections.mockTestId, row.id));
    const values: NewMockTestSection[] = test.parts.map((p) => ({
      mockTestId: row.id,
      sectionId: p.sectionId,
      section: p.section,
      partNumber: p.partNumber,
      orderIndex: p.orderIndex,
      moduleIndex: p.moduleIndex,
      startNumber: p.startNumber,
      endNumber: p.endNumber,
      totalQuestions: p.totalQuestions,
    }));
    await db.insert(mockTestSections).values(values);
  }

  // A paper that no longer assembles (a part was deactivated) is retired rather
  // than deleted: sittings of it still have to open, and their results still
  // have to name the paper they were sat on.
  const stale = await db.select({ id: mockTests.id, slug: mockTests.slug }).from(mockTests);
  const retire = stale.filter((t) => !keptSlugs.has(t.slug)).map((t) => t.id);
  if (retire.length > 0) {
    await db.update(mockTests).set({ isActive: false }).where(inArray(mockTests.id, retire));
    console.log(`Retired ${retire.length} paper(s) that no longer assemble.`);
  }

  const live = await db
    .select({ id: mockTests.id })
    .from(mockTests)
    .where(and(eq(mockTests.isActive, true), eq(mockTests.isFullTest, true)));
  console.log(`\nDone. ${live.length} live mock test(s).`);
  console.log(
    `Module timing: ${SECTION_ORDER.map((s) => `${s} ${MOCK_MODULE_MINUTES[s]}m`).join(" · ")} = ${totalMinutes(SECTION_ORDER)}m\n`,
  );

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
