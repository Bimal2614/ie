import { requireApiUser } from "@/lib/api/auth";
import { apiRoute, readQuery } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { guardGeneral } from "@/lib/security/rate-guard";
import { getSetPaginatedFor } from "@/app/actions/questions";
import { setPageQuery } from "@/lib/api/query-schemas";
import { notFound } from "@/lib/api/errors";

/**
 * GET /api/v1/practice/sets?section=&questionType=&page= — one full set.
 *
 * A "page" is one SET: a passage and every question on it, or one recording and
 * its questions. That is the unit a candidate works through, and it is why the
 * response carries `hasNextSet` rather than a total page count for the app to
 * do arithmetic on.
 *
 * Media (`audioUrl`, `imageUrl`, `promptAudioUrl`) comes back as OUR gated
 * paths, never as `s3://` or a presigned link. The app fetches them with the
 * same bearer token it used here — see /api/v1/media.
 */
export const dynamic = "force-dynamic";

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser(req);
  await guardGeneral(user.id);

  const q = readQuery(req, setPageQuery);
  const result = await getSetPaginatedFor(q.section, q.questionType, q.page);

  // An empty library for a section/type combination is a real 404: the app
  // asked for something that does not exist, and showing an empty player would
  // look like a set that failed to load.
  if (!result.set) {
    throw notFound("There are no sets for that section and question type yet.");
  }

  return ok(result);
});
