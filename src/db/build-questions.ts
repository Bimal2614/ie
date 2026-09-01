/**
 * Build per-question practice rows from the paper-level content.
 *
 * Run: npm run db:build:questions
 *
 * `practice_sections` holds a whole exam part — one recording or passage and
 * the 2–3 question groups asked against it — and is READ ONLY here. This script
 * projects it into the per-question model (`question_sets` + `questions`) so a
 * candidate can drill one question at a time through the existing practice UI.
 *
 * IDEMPOTENT. Every set carries an `external_key` derived from the paper it
 * came from, and every question is keyed by its position in that set, so a
 * re-run after a content fix updates the same rows in place. That matters
 * because `user_responses.question_id` points here: delete-and-reinsert would
 * blank the pointer on every answer a user has already given.
 *
 * TWO THINGS THIS ADDS that the paper-level content does not carry:
 *
 *  - `explanation`, lifted from the export answer keys by
 *    tools/cambridge/explain.py. For reading it is the sentence that justifies
 *    the answer; for listening it is the line of the transcript where the
 *    answer is spoken.
 *
 *  - an audio window for listening, in `content.audio`. A single gap is a few
 *    seconds of a six-minute recording, so drilling one question means playing
 *    just its moment. The window is stored as a FRACTION of the transcript
 *    rather than seconds: the browser already knows the real duration, and
 *    nothing here has to measure or re-encode the audio. Only the offsets are
 *    stored: the transcript line they were derived from is where the answer is
 *    spoken, so it stays in `explanation` and never reaches the client with the
 *    question. A window that had to be interpolated is flagged `approx`.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, gte, inArray, notInArray, sql } from "drizzle-orm";
import { practiceSections, questionSets, questions } from "./schema";
import type { QuestionGroup, QuestionItem } from "../lib/question-content";

const SOURCE = "cambridge";

/**
 * The book's identity inside an external key.
 *
 * Cambridge books are numbered, and their keys already read "cambridge:11:...",
 * so a numbered book keeps its digits and every existing key stays byte for
 * byte the same — changing one would orphan the set it points at. A series with
 * no number in its name ("Barron's Practice Exams") would otherwise strip to an
 * empty string and collide with every other such series, so it slugs instead.
 */
function bookKey(book: string | null): string {
  const digits = (book ?? "").replace(/\D/g, "");
  if (digits) return digits;
  return (book ?? "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
const EXPL_PATH = join("tools", "cambridge", "explanations.json");
/** Char-offset -> seconds pins per part, from tools/cambridge/align.py. */
const TIMINGS_PATH = join("tools", "cambridge", "timings.json");

/* ------------------------------------------------------------------ *
 * Anchoring a listening question to its moment in the recording
 * ------------------------------------------------------------------ */

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Character offset of `explanation` in the normalised transcript, at/after `from`. */
function findAt(t: string, e: string, from: number): number {
  const words = e.split(" ");
  for (const len of [10, 8, 6, 5, 4]) {
    for (const skip of [0, 1, 2]) {
      if (skip + len > words.length) continue;
      const at = t.indexOf(words.slice(skip, skip + len).join(" "), from);
      if (at < 0) continue;
      // Step back over the words the probe skipped so the window opens where
      // the quoted line does, not mid-sentence.
      return Math.max(from, at - words.slice(0, skip).join(" ").length);
    }
  }
  return -1;
}

type Window = {
  /**
   * Real seconds, force-aligned. Present once align.py has measured the part;
   * the player prefers these and pads them tightly, because they are exact.
   */
  fromSec?: number;
  toSec?: number;
  /** Fraction of the TRANSCRIPT — see anchorPart. Kept as the fallback. */
  fromFrac: number;
  toFrac: number;
  approx?: true;
};

/** Seconds at a character offset, interpolated between two aligned pins. */
function secondsAt(pins: [number, number][], at: number): number {
  if (at <= pins[0][0]) return pins[0][1];
  const last = pins[pins.length - 1];
  if (at >= last[0]) return last[1];
  let lo = 0;
  let hi = pins.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pins[mid][0] <= at) lo = mid;
    else hi = mid;
  }
  const [a, ta] = pins[lo];
  const [b, tb] = pins[hi];
  return ta + ((tb - ta) * (at - a)) / Math.max(1, b - a);
}

/**
 * Anchor every question in one listening part to its moment in the recording.
 *
 * A candidate answers a part strictly in order, so each search starts where the
 * previous answer was found. Without that constraint a four-word probe happily
 * matches a phrase repeated later in the conversation and sends the learner to
 * the wrong end of the recording — which is exactly what three parts did.
 *
 * A line that still cannot be found is interpolated between its neighbours and
 * flagged `approx`, so the player can widen the window rather than pretend to
 * precision it does not have.
 */
function anchorPart(
  transcript: string,
  items: { n: number; explanation: string | null }[],
  pins: [number, number][] | null,
): Map<number, Window> {
  const t = normalise(transcript);
  const out = new Map<number, Window>();
  if (t.length < 40) return out;

  const found: (number | null)[] = [];
  let cursor = 0;
  for (const item of items) {
    const e = item.explanation ? normalise(item.explanation) : "";
    const at = e.length >= 12 ? findAt(t, e, cursor) : -1;
    if (at >= 0) {
      found.push(at);
      cursor = at;
    } else {
      found.push(null);
    }
  }

  for (let i = 0; i < items.length; i++) {
    const e = items[i].explanation ? normalise(items[i].explanation!) : "";
    let at = found[i];
    let approx = false;
    if (at === null) {
      approx = true;
      let prev = 0;
      for (let k = i - 1; k >= 0; k--) if (found[k] !== null) { prev = found[k]!; break; }
      let next = t.length;
      for (let k = i + 1; k < items.length; k++) if (found[k] !== null) { next = found[k]!; break; }
      at = Math.round(prev + (next - prev) / 2);
    }
    const span = Math.max(e.length, 90);
    const to = Math.min(t.length, at + span);
    out.set(items[i].n, {
      // Seconds where the recording has been aligned; the fraction stays as the
      // fallback for a part align.py has not measured, or could not.
      ...(pins && pins.length >= 2
        ? {
            fromSec: Number(secondsAt(pins, at).toFixed(2)),
            toSec: Number(secondsAt(pins, to).toFixed(2)),
          }
        : {}),
      fromFrac: Number((at / t.length).toFixed(5)),
      toFrac: Number((to / t.length).toFixed(5)),
      ...(approx ? { approx: true as const } : {}),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Shaping one group into sets of questions
 * ------------------------------------------------------------------ */

/**
 * The set renderer numbers questions positionally from `startNumber`, so a
 * group is only safe as one set when its items run 1, 2, 3 … A "Choose TWO
 * letters" item is worth two marks and swallows two numbers, which would push
 * everything after it one number early — so a group holding one becomes a set
 * per item. None of those groups carries a shared layout, so nothing is lost
 * by splitting them.
 */
function chunk(group: QuestionGroup): QuestionItem[][] {
  return group.items.some((i) => (i.marks ?? 1) > 1)
    ? group.items.map((i) => [i])
    : [group.items];
}

const LABEL: Record<string, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
};

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, {
    schema: { practiceSections, questionSets, questions },
    casing: "snake_case",
  });

  const explanations: Record<string, Record<string, string>> = JSON.parse(
    readFileSync(EXPL_PATH, "utf-8"),
  );
  // Optional: a part with no pins keeps its transcript-fraction window, so the
  // build works before align.py has been run and improves part by part after.
  let timings: Record<string, [number, number][]> = {};
  try {
    timings = JSON.parse(readFileSync(TIMINGS_PATH, "utf-8"));
  } catch {
    console.log("no timings.json yet - listening windows stay approximate");
  }

  const parts = await db.select().from(practiceSections);
  parts.sort(
    (a, b) =>
      (parseInt((a.book ?? "").replace(/\D/g, ""), 10) || 0) -
        (parseInt((b.book ?? "").replace(/\D/g, ""), 10) || 0) ||
      (a.testNumber ?? 0) - (b.testNumber ?? 0) ||
      a.sectionType.localeCompare(b.sectionType) ||
      (a.partNumber ?? 0) - (b.partNumber ?? 0),
  );

  const seenKeys: string[] = [];
  const pendingSets: (typeof questionSets.$inferInsert)[] = [];
  const pendingQuestions: (Omit<typeof questions.$inferInsert, "setId"> & { setId: string })[] = [];
  /** externalKey -> how many questions the paper produces for it. */
  const expected = new Map<string, number>();
  let setCount = 0;
  let qCount = 0;
  let withExpl = 0;
  let withAudio = 0;
  const builtSources = new Set<string>();

  for (const part of parts) {
    builtSources.add(part.source ?? SOURCE);
    const bookNo = parseInt((part.book ?? "").replace(/\D/g, ""), 10);
    const expl = explanations[`${bookNo}|${part.sectionType}|${part.testNumber}`] ?? {};
    const groups = (part.questions?.groups ?? []) as QuestionGroup[];
    const totalItems = groups.reduce((n, g) => n + g.items.length, 0) || 1;
    const anchors =
      part.sectionType === "listening" && part.transcript
        ? anchorPart(
            part.transcript,
            groups.flatMap((g) =>
              g.items.map((i) => ({
                n: i.n,
                explanation: i.explanation ?? expl[String(i.n)] ?? null,
              })),
            ),
            timings[`${bookNo}|${part.testNumber}|${part.partNumber}`] ?? null,
          )
        : new Map<number, Window>();

    for (const group of groups) {
      for (const items of chunk(group)) {
        if (!items.length) continue;
        const last = items[items.length - 1];
        const from = items[0].n;
        const to = last.n + ((last.marks ?? 1) - 1);
        // The module is part of the key: Academic and General Reading are
        // different papers under the same book, test and part, so without it
        // one silently overwrites the other. "both" is carried explicitly so
        // the key stays stable rather than depending on a default.
        const externalKey = [
          part.source ?? SOURCE,
          bookKey(part.book),
          part.sectionType,
          part.testNumber,
          part.partNumber,
          from,
          part.module,
        ].join(":");
        seenKeys.push(externalKey);

        const setValues = {
          module: part.module,
          section: part.sectionType,
          questionType: group.questionType as typeof questionSets.$inferInsert.questionType,
          // Speaking leads with its TOPIC. Forty-four sets titled "Cambridge 11
          // · Test 1 · Speaking Part 1" are indistinguishable in a library
          // list; what a candidate picks by is whether it asks about food or
          // photographs. The book and test stay on the end, because which paper
          // a set came from is still how people find one they have not sat.
          // Part 2 already titled itself with its cue card; Parts 1 and 3 now
          // carry a topic read off their own questions.
          title:
            part.sectionType === "speaking"
              ? `${part.title} · ${part.book} · Test ${part.testNumber}`
              : `${part.book} · Test ${part.testNumber} · ` +
                `${LABEL[part.sectionType]} Part ${part.partNumber}` +
                (part.sectionType === "listening" || part.sectionType === "reading"
                  ? ` · Q${from}${to > from ? `-${to}` : ""}`
                  : ""),
          instructions: group.instruction ?? part.instructions ?? null,
          difficulty: part.difficulty,
          // Each set is self-contained: the passage, recording and image travel
          // with it so one question can be practised on its own.
          passageText: part.passageText,
          audioUrl: part.audioUrl,
          transcript: part.transcript,
          imageUrl: part.imageUrl,
          layout: group.layout ?? null,
          partNumber: part.partNumber,
          startNumber: from,
          estimatedMinutes: part.estimatedMinutes
            ? Math.max(1, Math.round((part.estimatedMinutes * items.length) / totalItems))
            : null,
          tags: [...(part.tags ?? []), group.questionType],
          source: part.source ?? SOURCE,
          externalKey,
          isActive: part.isActive,
          updatedAt: new Date(),
        };

        pendingSets.push(setValues);
        setCount++;

        const rows = items.map((item, i) => {
          // The item now carries its own explanation (see
          // tools/cambridge/backfill_explanations.py); the extracted table is
          // only a fallback for content imported before that backfill.
          const explanation = item.explanation ?? expl[String(item.n)] ?? null;
          if (explanation) withExpl++;
          // Only the offsets travel. The anchor line was the explanation, and
          // for listening that line is where the answer is spoken — shipping it
          // in `content` handed the answer to the client before a single
          // question was answered. The text stays in `explanation`, which the
          // page projection never sends.
          const audio = anchors.get(item.n) ?? null;
          if (audio && !audio.approx) withAudio++;
          return {
            // The set's key for now — swapped for its uuid once the sets are in.
            setId: externalKey,
            section: part.sectionType,
            questionType: group.questionType as typeof questions.$inferInsert.questionType,
            orderIndex: i,
            prompt: item.prompt ?? null,
            content: {
              // The exam number, so nothing downstream has to infer it from the
              // row's position in the set.
              n: item.n,
              ...(item.options ? { options: item.options } : {}),
              ...(item.selectCount ? { selectCount: item.selectCount } : {}),
              ...(item.cueCard ? { cueCard: item.cueCard } : {}),
              ...(audio ? { audio } : {}),
            },
            correctAnswer: item.answer ?? null,
            explanation,
            marks: item.marks ?? 1,
            wordLimitMin: item.wordLimitMin ?? null,
            wordLimitMax: null,
            prepSeconds: item.prepSeconds ?? null,
            speakSeconds: item.speakSeconds ?? null,
            promptAudioUrl: item.promptAudioUrl ?? null,
            promptVoiceId: item.promptVoiceId ?? null,
            isActive: true,
          };
        });

        pendingQuestions.push(...rows);
        expected.set(externalKey, rows.length);
        qCount += rows.length;
      }
    }
  }

  /* ---------------------------------------------------------------- *
   * Write
   *
   * Batched, because this has to run against a REMOTE database as well as
   * localhost. Row-at-a-time upserts were ~5,500 sequential round trips: a
   * few seconds on a unix socket, but over ten minutes to Neon, where the
   * latency per statement dwarfs the work. Same statements, two orders of
   * magnitude fewer trips.
   * ---------------------------------------------------------------- */

  const chunks = <T,>(xs: T[], n: number) =>
    Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

  // Postgres caps a statement at 65535 bound parameters, so the chunk sizes
  // are columns-per-row times rows well inside that.
  const setId = new Map<string, string>();
  for (const batch of chunks(pendingSets, 300)) {
    const written = await db
      .insert(questionSets)
      .values(batch)
      .onConflictDoUpdate({
        target: questionSets.externalKey,
        set: {
          module: sql`excluded.module`,
          section: sql`excluded.section`,
          questionType: sql`excluded.question_type`,
          title: sql`excluded.title`,
          instructions: sql`excluded.instructions`,
          difficulty: sql`excluded.difficulty`,
          passageText: sql`excluded.passage_text`,
          audioUrl: sql`excluded.audio_url`,
          transcript: sql`excluded.transcript`,
          imageUrl: sql`excluded.image_url`,
          layout: sql`excluded.layout`,
          partNumber: sql`excluded.part_number`,
          startNumber: sql`excluded.start_number`,
          estimatedMinutes: sql`excluded.estimated_minutes`,
          tags: sql`excluded.tags`,
          source: sql`excluded.source`,
          isActive: sql`excluded.is_active`,
          updatedAt: sql`excluded.updated_at`,
        },
      })
      .returning({ id: questionSets.id, externalKey: questionSets.externalKey });
    for (const r of written) if (r.externalKey) setId.set(r.externalKey, r.id);
  }

  const questionRows = pendingQuestions.map((r) => ({ ...r, setId: setId.get(r.setId)! }));
  if (questionRows.some((r) => !r.setId)) throw new Error("a set failed to upsert");

  for (const batch of chunks(questionRows, 800)) {
    await db
      .insert(questions)
      .values(batch)
      .onConflictDoUpdate({
        target: [questions.setId, questions.orderIndex],
        set: {
          section: sql`excluded.section`,
          questionType: sql`excluded.question_type`,
          prompt: sql`excluded.prompt`,
          content: sql`excluded.content`,
          correctAnswer: sql`excluded.correct_answer`,
          explanation: sql`excluded.explanation`,
          marks: sql`excluded.marks`,
          wordLimitMin: sql`excluded.word_limit_min`,
          wordLimitMax: sql`excluded.word_limit_max`,
          prepSeconds: sql`excluded.prep_seconds`,
          speakSeconds: sql`excluded.speak_seconds`,
          promptAudioUrl: sql`excluded.prompt_audio_url`,
          promptVoiceId: sql`excluded.prompt_voice_id`,
          isActive: sql`excluded.is_active`,
        },
      });
  }

  // A group that lost an item leaves a row behind. One count query finds the
  // few sets that shrank instead of a delete per set on every run.
  const live = setId.size
    ? await db
        .select({ setId: questions.setId, n: sql<number>`count(*)::int` })
        .from(questions)
        .where(inArray(questions.setId, [...setId.values()]))
        .groupBy(questions.setId)
    : [];
  const byId = new Map([...setId].map(([k, v]) => [v, expected.get(k) ?? 0]));
  let trimmed = 0;
  for (const row of live) {
    const want = byId.get(row.setId) ?? 0;
    if (Number(row.n) > want) {
      await db
        .delete(questions)
        .where(and(eq(questions.setId, row.setId), gte(questions.orderIndex, want)));
      trimmed++;
    }
  }

  // Sets whose paper no longer produces them (a renamed part, a merged group).
  const stale = await db
    .delete(questionSets)
    .where(
      // Scoped to the sources this run actually rebuilt. Hardcoding "cambridge"
      // would leave another series' dropped sets behind forever, and widening it
      // to every source would delete the sets the user authored by hand.
      and(inArray(questionSets.source, [...builtSources]), notInArray(questionSets.externalKey, seenKeys)),
    )
    .returning({ id: questionSets.id });

  console.log(
    `\n${setCount} set(s), ${qCount} question(s)\n` +
      `  explanations attached: ${withExpl}/${qCount}\n` +
      `  listening audio windows: ${withAudio}\n` +
      `  stale sets removed: ${stale.length}`,
  );
  await client.end();
  process.exit(0);
}

main().catch((e) => {
  console.error("\n✗ " + (e instanceof Error ? e.message : e));
  process.exit(1);
});
