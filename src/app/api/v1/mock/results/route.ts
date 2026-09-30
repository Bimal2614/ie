import { requireApiCandidate } from "@/lib/api/auth";
import { apiRoute } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { guardGeneral } from "@/lib/security/rate-guard";
import { mockResultsFor } from "@/lib/mock-review";

/**
 * GET /api/v1/mock/results — every paper this candidate has handed in, newest
 * first.
 *
 * The Results tab. Distinct from /api/v1/history, which lists practice ATTEMPTS
 * — a mock is one sitting with four bands, not a run of graded gaps, and
 * flattening the two into one feed would bury a full paper among the dozen
 * short attempts around it.
 *
 * An `overallBand` of null means the paper is still being marked: the objective
 * bands are written at hand-in and the overall is recomputed once Writing and
 * Speaking arrive. The card links to ./result, which carries `pending` and can
 * say which of the two it is.
 *
 * Deliberately unpaginated. A candidate accumulates papers at the rate they can
 * sit three-hour exams, so this is a list of tens at the very most — and a
 * cursor would cost a round trip on a screen that opens with nothing else to
 * draw.
 */
export const dynamic = "force-dynamic";

export const GET = apiRoute(async (req) => {
  const user = await requireApiCandidate(req);
  await guardGeneral(user.id);

  return ok({ results: await mockResultsFor(user.id) });
});
