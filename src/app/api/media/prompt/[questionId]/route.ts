import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { getCurrentUser } from "@/lib/dal";
import { serveProtectedAudio } from "@/lib/protected-media";

/**
 * Auth-gated audio of the examiner asking ONE speaking question.
 *
 * WHY NOT /api/media/[setId]. That route answers with `question_sets.audioUrl`
 * — ONE recording for a whole listening part. A speaking part is a run of
 * separate questions carrying a clip each, so the address has to be the
 * question, not the set.
 *
 * WHY A SIBLING OF /api/practice/prompt. Same clip, different table: this reads
 * `questions`, that reads the `practice_sections` document. `question_sets` has
 * no foreign key to `practice_sections` — only a string `external_key` — so
 * neither can serve the other without parsing that key and joining on it. The
 * listening routes are split down exactly this seam for exactly this reason.
 *
 * Everything the two have in common — session, rate limit, id shape, 404 on a
 * row with no media — now lives in `serveProtectedAudio`, so what is left here
 * is the one thing that is actually this route's own: the lookup.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Backstop against a stalled client; each response is capped at one chunk. */
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const [user, { questionId }] = await Promise.all([getCurrentUser(), params]);

  return serveProtectedAudio(req, {
    userId: user?.id ?? null,
    uuids: [questionId],
    locate: async () => {
      const [row] = await db
        .select({ promptAudioUrl: questions.promptAudioUrl })
        .from(questions)
        .where(and(eq(questions.id, questionId), eq(questions.isActive, true)))
        .limit(1);
      return row?.promptAudioUrl;
    },
  });
}
