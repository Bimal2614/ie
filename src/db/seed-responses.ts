/**
 * Seed dummy attempts so History/review has data for every question type.
 *
 * Answers are graded by the REAL grader (src/lib/grading.ts) against the real
 * correctAnswer, and written in the same shape submitSetAnswers writes —
 * including one attemptId per set — so this exercises the scoring and storage
 * path, not a parallel imitation of it. What it does NOT cover is the Server
 * Action wrapper (auth, revalidation): those need a request context.
 *
 * Every third question is answered wrongly on purpose, so review screens show
 * both verdicts rather than a wall of green.
 *
 * Run: npm run db:seed:responses -- --email you@example.com
 *      add --clear to remove previously seeded dummy attempts first.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, inArray } from "drizzle-orm";
import { questionSets, questions, userResponses, users } from "./schema";
import { QUESTION_TYPES, isObjective, type QuestionTypeKey } from "../lib/ielts";
import { grade } from "../lib/grading";

type Ans = Record<string, unknown>;

const ESSAY = `Cities across the world are being forced to decide what open space is worth. In my view green space should be treated as essential infrastructure rather than decoration, for two reasons.

First, the measurable benefits are no longer in doubt. Densely planted districts record summer temperatures several degrees lower than bare ones, and residents living near maintained parks report lower stress and stronger ties to their neighbours. These are public health outcomes, delivered at a fraction of the cost of treating the conditions they prevent.

Second, the alternative is a false economy. A park that is planted and then abandoned loses the very qualities that justified it, and councils that fund planting without funding upkeep simply pay twice. If a road were left unrepaired for a decade nobody would call that a saving.

That said, housing pressure is real and cannot be dismissed. The answer is not to choose between homes and parks but to require that new development brings its own green provision with it, funded and maintained as a condition of approval.`;

/** A plausible answer for one question — correct unless `wrong`. */
function answerFor(
  type: QuestionTypeKey,
  content: Ans | null,
  ca: Ans | null,
  wrong: boolean,
): Ans | null {
  const meta = QUESTION_TYPES[type];
  const c = content ?? {};

  switch (meta.family) {
    case "single": {
      const n = ((c.options as string[]) ?? []).length || 4;
      const right = (ca?.index as number) ?? 0;
      return { index: wrong ? (right + 1) % n : right };
    }
    case "multi": {
      const right = (ca?.indices as number[]) ?? [];
      if (!wrong) return { indices: right };
      // Swap one selection for an unpicked option — a realistic near-miss.
      const n = ((c.options as string[]) ?? []).length || 5;
      const alt = [...Array(n).keys()].find((i) => !right.includes(i));
      return { indices: alt === undefined ? right.slice(1) : [right[0], alt].sort((a, b) => a - b) };
    }
    case "tfng":
    case "ynng": {
      const choices =
        (c.choices as string[]) ??
        (meta.family === "tfng" ? ["True", "False", "Not Given"] : ["Yes", "No", "Not Given"]);
      const right = (ca?.value as string) ?? choices[0];
      return { value: wrong ? (choices.find((x) => x !== right) ?? right) : right };
    }
    case "matching": {
      const right = (ca?.key as string) ?? "A";
      return { key: wrong ? "ZZ" : right };
    }
    case "completion":
    case "labelling": {
      const accepted = (ca?.any as string[]) ?? [];
      if (accepted.length === 0) return null;
      // Correct answers deliberately use the LAST accepted variant where one
      // exists ("4" rather than "four"), proving the grader honours variants.
      return { text: wrong ? "definitely-wrong" : accepted[accepted.length - 1] };
    }
    case "writing": {
      const text = ESSAY;
      return { text, words: text.trim().split(/\s+/).length };
    }
    case "speaking":
      return { recorded: true, durationSec: meta.speakSeconds ?? 45 };
    default:
      return null;
  }
}

async function main() {
  const argv = process.argv;
  const emailArg = argv[argv.indexOf("--email") + 1];
  const clear = argv.includes("--clear");
  if (!emailArg || emailArg.startsWith("--")) {
    throw new Error("pass --email <address> to choose whose history to seed");
  }

  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, {
    schema: { questionSets, questions, userResponses, users },
    casing: "snake_case",
  });

  const [user] = await db
    .select({ id: users.id, email: users.email, targetModule: users.targetModule })
    .from(users)
    .where(eq(users.emailNormalized, emailArg.trim().toLowerCase()))
    .limit(1);
  if (!user) throw new Error(`no user with email ${emailArg}`);

  const sets = await db
    .select()
    .from(questionSets)
    .where(and(eq(questionSets.isActive, true), eq(questionSets.source, "seed")))
    .orderBy(questionSets.section, questionSets.questionType);

  if (clear) {
    // Only ever removes this user's responses to seeded sets — never real
    // content, never another user.
    const setIds = sets.map((s) => s.id);
    const del = await db
      .delete(userResponses)
      .where(and(eq(userResponses.userId, user.id), inArray(userResponses.setId, setIds)))
      .returning({ id: userResponses.id });
    console.log(`cleared ${del.length} existing responses to seeded sets for ${user.email}`);
  }

  let attempts = 0;
  let rows = 0;
  let correct = 0;
  let graded = 0;

  for (const set of sets) {
    const qs = await db
      .select()
      .from(questions)
      .where(and(eq(questions.setId, set.id), eq(questions.isActive, true)))
      .orderBy(questions.orderIndex);
    if (qs.length === 0) continue;

    const attemptId = randomUUID();
    const batch: (typeof userResponses.$inferInsert)[] = [];

    qs.forEach((q, i) => {
      const type = q.questionType as QuestionTypeKey;
      const meta = QUESTION_TYPES[type];
      const ca = (q.correctAnswer as Ans) ?? null;
      const wrong = i % 3 === 2; // every third answer is wrong
      const ans = answerFor(type, q.content as Ans | null, ca, wrong);
      if (!ans) return;

      const isCorrect = meta && isObjective(meta.family) && ca ? grade(meta.family, ans, ca) : null;
      if (isCorrect !== null) {
        graded++;
        if (isCorrect) correct++;
      }

      batch.push({
        userId: user.id,
        questionId: q.id,
        setId: set.id,
        attemptId,
        section: q.section,
        questionType: q.questionType,
        module: user.targetModule,
        response: ans,
        isCorrect,
        rawScore: isCorrect === null ? null : isCorrect ? q.marks : 0,
        timeSpentSec: 20 + i * 5,
        band: null,
      });
    });

    if (batch.length > 0) {
      await db.insert(userResponses).values(batch);
      attempts++;
      rows += batch.length;
    }
  }

  console.log(
    `✓ ${user.email}: ${attempts} attempts, ${rows} responses. ` +
      `Graded ${correct}/${graded} correct (writing/speaking left unscored).`,
  );
  await client.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
