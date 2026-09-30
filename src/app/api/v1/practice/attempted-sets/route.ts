import { z } from "zod";
import { requireApiUser } from "@/lib/api/auth";
import { apiRoute, readQuery } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { guardGeneral } from "@/lib/security/rate-guard";
import { questionTypeParam, sectionParam } from "@/lib/api/query-schemas";
import { attemptedSetIndexesFor } from "@/lib/practice-progress";

/**
 * GET /api/v1/practice/attempted-sets?section=&questionType= — which sets of
 * this task type the candidate has already worked through.
 *
 * What the set palette ticks. Indices are ZERO-BASED AND IN PAGING ORDER — the
 * same order /api/v1/practice/sets pages by — so the app can mark square N
 * without a second lookup per set. Sending ids instead would make the client
 * join them back against a page it has not fetched yet.
 *
 * A short list of integers rather than a list of sets: the palette needs to
 * know which squares are done, and nothing else about them.
 */
export const dynamic = "force-dynamic";

const query = z.object({
  section: sectionParam,
  questionType: questionTypeParam,
});

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser(req);
  await guardGeneral(user.id);

  const q = readQuery(req, query);

  return ok({
    setIndices: await attemptedSetIndexesFor(user.id, q.section, q.questionType),
  });
});
