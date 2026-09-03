import { eq } from "drizzle-orm";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { getCurrentUser } from "@/lib/dal";
import { serveProtectedImage } from "@/lib/protected-media";

/**
 * Auth-gated image for ONE question.
 *
 * WHY NOT /api/media/[setId]/image. That answers with the SET's figure — one
 * map for a whole labelling task. This is the other shape: "Which chart shows
 * the percentage of cinema seats?" where the options are only the words
 * "Chart A/B/C" and the next question in the same set has a different chart.
 * One imageUrl on the set cannot hold three, so the address is the question.
 *
 * Exactly the reasoning that already split /api/media/prompt/[questionId]
 * from /api/media/[setId] for speaking audio.
 */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  const [user, { questionId }] = await Promise.all([getCurrentUser(), params]);

  return serveProtectedImage({
    userId: user?.id ?? null,
    uuids: [questionId],
    locate: async () => {
      const [row] = await db
        .select({ content: questions.content })
        .from(questions)
        .where(eq(questions.id, questionId))
        .limit(1);
      const img = (row?.content as { imageUrl?: string } | null)?.imageUrl;
      return typeof img === "string" ? img : null;
    },
  });
}
