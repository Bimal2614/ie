/**
 * Check imported exam content actually works as a paper.
 *
 * Run: npm run db:verify                 — every imported book
 *      npm run db:verify -- "Cambridge 20"
 *
 * Three properties, checked per section (a listening/reading paper of 40 marks):
 *   1. COVERAGE   — every exam number 1..N is defined exactly once. Catches a
 *                   gap left by a mistyped range and a number claimed twice.
 *   2. PERFECT    — submitting the stored key scores full marks. Catches an
 *                   answer stored in a shape the grader for that family cannot
 *                   read: map labelling grades against `any`, matching against
 *                   `key`, and storing the wrong one silently loses the mark.
 *   3. ALL-WRONG  — submitting nonsense scores zero. Catches an answer key so
 *                   permissive it would mark anything correct.
 *
 * Writing and Speaking are AI-scored and carry no key, so they are reported but
 * not graded.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { grade } from "../lib/grading";
import { QUESTION_TYPES, type QuestionTypeKey } from "../lib/ielts";
import type { SectionQuestions } from "../lib/question-content";

type Answer = Record<string, unknown>;

/** What a candidate with the mark scheme in front of them would submit. */
function perfectAnswer(family: string, ca: Answer): Answer | undefined {
  switch (family) {
    // Labelling shares the completion grader: it reads `any`, and falls back
    // from ans.text to ans.key, which is what the drag-and-drop board sends.
    case "completion":
    case "labelling":
      return { text: (ca.any as string[])?.[0] };
    case "single":
      return { index: ca.index };
    case "multi":
      return { indices: ca.indices };
    case "matching":
      return { key: ca.key };
    case "tfng":
    case "ynng":
      return { value: ca.value };
    default:
      return undefined;
  }
}

const NONSENSE: Answer = {
  text: "zzzznotananswer", index: 98, indices: [97, 96],
  key: "ZZ", value: "zzzznotananswer",
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const bookFilter = process.argv[2];

  const sql = postgres(url, { max: 1 });
  const rows = await sql<
    {
      book: string; test_number: number; section_type: string; part_number: number;
      total_questions: number; questions: SectionQuestions;
    }[]
  >`SELECT book, test_number, section_type, part_number, total_questions, questions
      FROM practice_sections
     ${bookFilter ? sql`WHERE book = ${bookFilter}` : sql``}
     ORDER BY book, test_number, section_type, part_number`;

  // A "paper" is one book+test+section: 40 marks spread over its parts.
  const papers = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = `${r.book} · Test ${r.test_number} · ${r.section_type}`;
    if (!papers.has(key)) papers.set(key, [] as unknown as typeof rows);
    papers.get(key)!.push(r);
  }

  let failures = 0;
  for (const [name, parts] of papers) {
    const objective = parts[0].section_type === "listening" || parts[0].section_type === "reading";
    const covered: number[] = [];
    let correct = 0, total = 0, falsePositives = 0;
    const problemsEarly: string[] = [];

    for (const part of parts) {
      // Listening and Reading number continuously across the whole paper
      // (1..40), so their parts share one number line. Writing and Speaking
      // restart at 1 in every part — Task 1 and Task 2 both have an item 1 —
      // so their numbers are only unique within a part.
      const scope = objective ? covered : [];
      for (const g of part.questions.groups) {
        const meta = QUESTION_TYPES[g.questionType as QuestionTypeKey];
        for (const item of g.items) {
          const marks = item.marks ?? 1;
          for (let k = 0; k < marks; k++) scope.push(item.n + k);
          if (!objective || !item.answer) continue;
          total += marks;
          const ca = item.answer as Answer;
          if (grade(meta.family, perfectAnswer(meta.family, ca), ca)) correct += marks;
          if (grade(meta.family, NONSENSE, ca)) falsePositives += marks;
        }
      }
      if (!objective) {
        const dupInPart = scope.filter((n, i) => scope.indexOf(n) !== i);
        if (dupInPart.length) problemsEarly.push(`part ${part.part_number} duplicates ${dupInPart.join(",")}`);
        covered.push(...scope);
      }
    }

    covered.sort((a, b) => a - b);
    const expected = covered.length ? covered[covered.length - 1] : 0;
    const missing = objective
      ? Array.from({ length: expected }, (_, i) => i + 1).filter((n) => !covered.includes(n))
      : [];
    const dupes = objective
      ? [...new Set(covered.filter((n, i) => covered.indexOf(n) !== i))]
      : [];

    const problems: string[] = [...problemsEarly];
    if (missing.length) problems.push(`missing ${missing.join(",")}`);
    if (dupes.length) problems.push(`duplicated ${dupes.join(",")}`);
    if (objective) {
      if (expected !== 40) problems.push(`${expected} marks, expected 40`);
      if (correct !== total) problems.push(`perfect paper scores only ${correct}/${total}`);
      if (falsePositives) problems.push(`${falsePositives} mark(s) accept nonsense`);
    }

    if (problems.length) {
      failures++;
      console.log(`✗ ${name.padEnd(42)} ${problems.join(" · ")}`);
    } else {
      const detail = objective ? `${total}/40 marks` : `${covered.length} prompt(s), AI-scored`;
      console.log(`✓ ${name.padEnd(42)} ${parts.length} part(s), ${detail}`);
    }
  }

  console.log(
    failures === 0
      ? `\nAll ${papers.size} paper(s) OK.`
      : `\n${failures} of ${papers.size} paper(s) FAILED.`,
  );
  await sql.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("\n✗ " + (e instanceof Error ? e.message : e));
  process.exit(1);
});
