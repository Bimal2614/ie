import { requireApiUser } from "@/lib/api/auth";
import { apiRoute, readQuery } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { guardGeneral } from "@/lib/security/rate-guard";
import { getRecentAttemptsFor } from "@/app/actions/history";
import { historyQuery } from "@/lib/api/query-schemas";

/**
 * GET /api/v1/history?limit= — recent attempts, newest first.
 *
 * The app's history tab. Deliberately NOT the website's shape: the web browses
 * a day at a time from a calendar, which suits a wide screen and a candidate
 * looking for a particular session. A phone opens on "what have I been doing"
 * and scrolls, so this is a flat reverse-chronological list and the day view is
 * something the app can build on top of it.
 *
 * One row per ATTEMPT, not per answer — a thirteen-gap passage is one entry
 * reading "9 / 13", which is the unit a candidate remembers sitting.
 */
export const dynamic = "force-dynamic";

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser(req);
  await guardGeneral(user.id);

  const q = readQuery(req, historyQuery);

  return ok({ attempts: await getRecentAttemptsFor(user.id, q.limit) });
});
