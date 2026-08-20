/**
 * Import exam content from JSON into `practice_sections`.
 *
 * Run: npm run db:import              — every book under content/
 *      npm run db:import -- cambridge-20   — one book's folder
 *
 * WHY JSON ON DISK. Content is data, not code. Cambridge 20 alone is 48 parts;
 * hand-maintaining that as TypeScript literals means a compile step to fix a
 * typo in a gap and a diff nobody can review. A file per test-module reads like
 * the page it came from, and the validator below is what keeps it honest.
 *
 * One file = one or more PARTS. A part owns exactly one stimulus (a recording,
 * a passage, a task prompt) and the 2–3 question groups asked against it.
 *
 * IDEMPOTENT — upserts on (book, test_number, section_type, part_number), so
 * re-running after a correction updates in place rather than duplicating.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { practiceSections } from "./schema";
import {
  gapsInLayout,
  type SectionQuestions,
  type QuestionGroup,
  type SetLayout,
} from "../lib/question-content";

const CONTENT_DIR = "content";

/* ------------------------------------------------------------------ *
 * The on-disk shape
 * ------------------------------------------------------------------ */

type PartDoc = {
  module: "academic" | "general" | "both";
  sectionType: "listening" | "reading" | "writing" | "speaking";
  book: string;
  testNumber: number;
  partNumber: number;
  title: string;
  /** Section-level instruction; groups may override with their own. */
  instructions?: string;
  audioUrl?: string;
  transcript?: string;
  passageText?: string;
  imageUrl?: string;
  estimatedMinutes?: number;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
  groups: QuestionGroup[];
};

type ContentFile = { parts: PartDoc[] };

/* ------------------------------------------------------------------ *
 * Validation — a content bug fails here, not at exam time
 * ------------------------------------------------------------------ */

const OBJECTIVE = new Set(["listening", "reading"]);

function validate(part: PartDoc, where: string): void {
  const label = `${where} → ${part.book} T${part.testNumber} ${part.sectionType} P${part.partNumber}`;
  if (!part.groups?.length) throw new Error(`${label}: no groups`);

  const seen = new Set<number>();

  for (const g of part.groups) {
    if (!g.items?.length) throw new Error(`${label}: group ${g.questionType} has no items`);

    // An item worth N marks occupies N consecutive numbers — "Questions 17 and
    // 18, choose TWO letters" is one selection scored out of two.
    const nums = g.items.flatMap((i) =>
      Array.from({ length: i.marks ?? 1 }, (_, k) => i.n + k),
    );

    for (const n of nums) {
      if (seen.has(n)) throw new Error(`${label}: question ${n} defined twice`);
      seen.add(n);
      if (n < g.from || n > g.to) {
        throw new Error(`${label}: question ${n} outside its group range ${g.from}–${g.to}`);
      }
    }

    const expected = g.to - g.from + 1;
    if (nums.length !== expected) {
      throw new Error(
        `${label}: group ${g.questionType} covers ${g.from}–${g.to} (${expected} marks) but defines ${nums.length}`,
      );
    }

    for (const i of g.items) {
      const marks = i.marks ?? 1;
      if (marks > 1 && i.selectCount !== marks) {
        throw new Error(
          `${label}: Q${i.n} is worth ${marks} marks but selectCount is ${i.selectCount ?? 1}`,
        );
      }
      // Listening & Reading are auto-marked; without a key the item is dead.
      if (OBJECTIVE.has(part.sectionType) && !i.answer) {
        throw new Error(`${label}: Q${i.n} has no answer key`);
      }
    }

    // Gap-backed layouts bind every input through `[[n]]`. An unmatched gap
    // renders as a dead field; a missing one silently loses a mark.
    if (g.layout) {
      const gaps = gapsInLayout(g.layout as SetLayout);
      if (gaps.length > 0) {
        const missing = nums.filter((n) => !gaps.includes(n));
        const orphan = gaps.filter((n) => !nums.includes(n));
        if (missing.length) throw new Error(`${label}: no [[n]] gap for Q${missing.join(", ")}`);
        if (orphan.length) throw new Error(`${label}: gap(s) ${orphan.join(", ")} have no question`);
      }
    }
  }

  const all = [...seen].sort((a, b) => a - b);
  for (let i = 1; i < all.length; i++) {
    if (all[i] !== all[i - 1] + 1) {
      throw new Error(`${label}: numbering jumps from ${all[i - 1]} to ${all[i]}`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Load
 * ------------------------------------------------------------------ */

function jsonFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...jsonFilesUnder(full));
    else if (entry.endsWith(".json")) out.push(full);
  }
  return out;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const filter = process.argv[2]; // optional book folder, e.g. "cambridge-20"
  const root = filter ? join(CONTENT_DIR, filter) : CONTENT_DIR;

  const files = jsonFilesUnder(root).sort();
  if (files.length === 0) {
    console.log(`No JSON content found under ${root}/`);
    process.exit(0);
  }

  // Parse and validate EVERYTHING before writing anything, so a typo in the
  // last file cannot leave the database half-updated.
  const loaded: { file: string; part: PartDoc }[] = [];
  for (const file of files) {
    let doc: ContentFile;
    try {
      doc = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
      throw new Error(`${file}: invalid JSON — ${e instanceof Error ? e.message : e}`);
    }
    const rel = relative(CONTENT_DIR, file);
    for (const part of doc.parts ?? []) {
      validate(part, rel);
      loaded.push({ file: rel, part });
    }
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema: { practiceSections }, casing: "snake_case" });

  let count = 0;
  for (const { part } of loaded) {
    const numbers = part.groups
      .flatMap((g) => g.items.flatMap((i) => Array.from({ length: i.marks ?? 1 }, (_, k) => i.n + k)))
      .sort((a, b) => a - b);
    const questions: SectionQuestions = { groups: part.groups };
    const types = [...new Set(part.groups.map((g) => g.questionType))];

    const values = {
      module: part.module,
      sectionType: part.sectionType,
      questionType: types[0] as never,
      questionTypes: types,
      book: part.book,
      testNumber: part.testNumber,
      partNumber: part.partNumber,
      source: "cambridge",
      title: part.title,
      instructions: part.instructions ?? part.groups[0]?.instruction ?? null,
      difficulty: (part.difficulty ?? "medium") as "easy" | "medium" | "hard",
      estimatedMinutes: part.estimatedMinutes ?? null,
      audioUrl: part.audioUrl ?? null,
      transcript: part.transcript ?? null,
      passageText: part.passageText ?? null,
      imageUrl: part.imageUrl ?? null,
      startNumber: numbers[0],
      endNumber: numbers[numbers.length - 1],
      totalQuestions: numbers.length,
      questions,
      tags: part.tags ?? null,
      isActive: true,
      updatedAt: new Date(),
    };

    await db
      .insert(practiceSections)
      .values(values)
      .onConflictDoUpdate({
        target: [
          practiceSections.book,
          practiceSections.testNumber,
          practiceSections.sectionType,
          practiceSections.partNumber,
        ],
        set: values,
      });

    count++;
    console.log(
      `✓ ${part.book} T${part.testNumber} ${part.sectionType.padEnd(9)} P${part.partNumber}` +
        `  Q${values.startNumber}-${values.endNumber} (${values.totalQuestions})  [${types.join(" + ")}]`,
    );
  }

  console.log(`\nImported ${count} part(s) from ${files.length} file(s).`);
  // TODO: chain the rebuild onto this. `questions` holds a COPY of every
  // answer, so until it runs the two tables disagree — section practice marks a
  // corrected answer right while per-question practice still marks it wrong,
  // and nothing errors. The rebuild is idempotent and keeps question ids
  // stable, so calling it unconditionally here is safe.
  console.log("NEXT: npm run db:build:questions — question_sets/questions still hold the old copy.");
  await client.end();
  process.exit(0);
}

main().catch((e) => {
  console.error("\n✗ " + (e instanceof Error ? e.message : e));
  process.exit(1);
});
