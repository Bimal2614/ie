import { z } from "zod";
import { requireApiCandidate } from "@/lib/api/auth";
import { apiRoute, readJson, readQuery } from "@/lib/api/handler";
import { ok, created } from "@/lib/api/respond";
import { conflict, notFound, planRequired } from "@/lib/api/errors";
import { getMockCatalogue, startMockFor } from "@/app/actions/mock";
import { moduleParam } from "@/lib/api/query-schemas";

/**
 * GET  /api/v1/mock  — the catalogue of full papers.
 * POST /api/v1/mock  — open a sitting (or resume the one in progress).
 *
 * The catalogue is filtered to the candidate's own module by default; the
 * `module` parameter only lets the app look at the other one deliberately.
 */
export const dynamic = "force-dynamic";

export const GET = apiRoute(async (req) => {
  await requireApiCandidate(req);
  const q = readQuery(req, z.object({ module: moduleParam }));

  return ok(await getMockCatalogue(q.module ?? null));
});

const startSchema = z.object({
  mockTestId: z.string().uuid("Not a valid mock test id"),
});

export const POST = apiRoute(async (req) => {
  const user = await requireApiCandidate(req);
  const body = await readJson(req, startSchema);

  const result = await startMockFor(user, body.mockTestId);

  if (!result.ok) {
    // Full papers are a paid feature — 402 with the block, so the app shows the
    // paywall naming the tier rather than a generic failure.
    if (result.reason === "blocked") throw planRequired(result.block);
    if (result.reason === "no_modules") {
      throw conflict("That paper has no modules set up yet.");
    }
    throw notFound("No such mock test.");
  }

  /**
   * RESUMING RETURNS 200, STARTING RETURNS 201.
   *
   * Not decoration: a candidate who already has this paper open gets their
   * existing sitting back rather than a second one, and the app needs to know
   * which happened so it can say "resuming where you left off" instead of
   * dropping them into what looks like a fresh paper with answers already in it.
   */
  const body_out = { sessionId: result.sessionId, resumed: result.resumed };
  return result.resumed ? ok(body_out) : created(body_out);
});
