import { requireApiCandidate } from "@/lib/api/auth";
import { apiRoute } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { getDashboardStatsFor } from "@/app/actions/dashboard";
import { planUsage } from "@/lib/security/plan-guard";
import { recommendFocus } from "@/lib/dashboard";
import { toEntitlementsDto } from "@/lib/api/dto";

/**
 * GET /api/v1/dashboard — everything the app's home screen draws.
 *
 * ONE request, not five. The web version assembles this from a server component
 * that can await several queries without the user watching; an app doing the
 * same over a mobile network pays a full round trip for each, and shows a
 * different spinner finishing at a different time for each. The queries here
 * already run in parallel server-side (see `getDashboardStatsFor`), so bundling
 * them costs nothing and turns five ragged loads into one.
 *
 * Candidates only: an admin or a partner has no streak, no plan and no practice
 * history, and would get a convincing-looking screen full of zeroes.
 */
export const dynamic = "force-dynamic";

export const GET = apiRoute(async (req) => {
  const user = await requireApiCandidate(req);

  const [stats, usage] = await Promise.all([
    getDashboardStatsFor(user.id),
    planUsage(user),
  ]);

  return ok({
    stats,
    usage,
    entitlements: toEntitlementsDto(user.plan),
    /**
     * What to practise next, computed from the same section accuracy the web
     * dashboard uses. Sent as data rather than as a rendered string so the app
     * can style it — and so changing the wording does not need an app release.
     */
    focus: recommendFocus(stats, { targetBand: user.targetBand }),
  });
});
