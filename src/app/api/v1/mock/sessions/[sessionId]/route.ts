import { requireApiCandidate } from "@/lib/api/auth";
import { apiRoute } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { conflict, notFound } from "@/lib/api/errors";
import { abandonMockFor, getMockSitting } from "@/app/actions/mock";

/**
 * GET    /api/v1/mock/sessions/{id} — the sitting, as the player needs it.
 * DELETE /api/v1/mock/sessions/{id} — abandon it so the paper can be restarted.
 *
 * THE CLOCK IS THE SERVER'S. The response carries the module's `endsAt` and the
 * `remainingSeconds` left in it, both computed here from the stored timeline —
 * the app renders a countdown against them and must never keep its own
 * authoritative clock. A device clock can be changed from the settings screen,
 * and a timed exam that trusts it is not a timed exam.
 *
 * `lapsedIndexes` names the modules whose bell went while the candidate was
 * away — backgrounded app, dead signal, a phone that slept. They are closed,
 * not resumable, which is exactly what happens in the hall.
 */
export const dynamic = "force-dynamic";

export const GET = apiRoute(async (req, ctx: { params: Promise<{ sessionId: string }> }) => {
  await requireApiCandidate(req);
  const { sessionId } = await ctx.params;

  const state = await getMockSitting(sessionId);

  // "Missing" covers both a sitting that does not exist and one belonging to
  // somebody else — the read is owner-scoped, so the two are indistinguishable
  // from here, which is the intent.
  if (state.status === "missing") throw notFound("No such sitting.");

  // Already handed in. A conflict rather than a 404: the resource is real and
  // the app should send the candidate to the result screen, not to an error.
  if (state.status === "finished") {
    throw conflict("That paper has already been handed in.");
  }

  return ok(state.data);
});

export const DELETE = apiRoute(async (req, ctx: { params: Promise<{ sessionId: string }> }) => {
  const user = await requireApiCandidate(req);
  const { sessionId } = await ctx.params;

  // `false` means nothing was in progress to abandon — already handed in,
  // already abandoned, or never theirs. Reported rather than thrown: an app
  // that asks twice has the outcome it wanted both times.
  const abandoned = await abandonMockFor(user.id, sessionId);

  return ok({ sessionId, abandoned });
});
