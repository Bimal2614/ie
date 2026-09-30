import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { questionSets, userResponses } from "@/db/schema";

/**
 * Which sets of one task type a candidate has already worked through.
 *
 * `server-only` rather than `"use server"` for the reason given in
 * src/lib/section-grading.ts: a user id in the signature of a Server Action is
 * a user id the client chooses.
 */

/**
 * The zero-based indices, in PAGING ORDER, of the sets this candidate has
 * answered — what the set palette ticks.
 *
 * One query: number the sets in the order the player pages through them, then
 * keep those with a response. The alternative pulls every set AND every
 * response for the type and intersects them in JavaScript — two unbounded reads
 * to produce a handful of integers.
 *
 * The ordering must stay in step with `getSetPaginatedFor`, which pages by
 * (created_at, id); if the two disagree, the palette ticks the wrong squares.
 */
export async function attemptedSetIndexesFor(
  userId: string,
  section: string,
  questionType: string,
): Promise<number[]> {
  const rows = await db.execute<{ idx: number }>(sql`
    WITH ordered AS (
      SELECT id,
             (row_number() OVER (ORDER BY created_at, id) - 1)::int AS idx
      FROM ${questionSets}
      WHERE section = ${section}
        AND question_type = ${questionType}
        AND is_active = true
    )
    SELECT DISTINCT o.idx
    FROM ordered o
    JOIN ${userResponses} r ON r.set_id = o.id
    WHERE r.user_id = ${userId}
    ORDER BY o.idx
  `);

  return rows.map((r) => Number(r.idx));
}
