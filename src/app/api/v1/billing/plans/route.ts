import { requireApiUser } from "@/lib/api/auth";
import { apiRoute } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { OFFERED_PLANS, PLANS } from "@/lib/plans";
import { appleProductFor, googleProductFor, isAppleIapConfigured, isGoogleIapConfigured } from "@/lib/env";
import { clientFrom } from "@/lib/api/auth";
import { toEntitlementsDto } from "@/lib/api/dto";

/**
 * GET /api/v1/billing/plans — what the app may sell, and under what id.
 *
 * THE PRICE HERE IS NOT THE PRICE THE CANDIDATE PAYS. On iOS and Android the
 * store owns pricing: products sit on fixed price tiers that differ by
 * storefront, and the figure shown on the paywall must come from the store SDK
 * (`ProductDetails` / `SKProduct`), never from us. What this endpoint provides
 * is the PRODUCT ID to look up and the entitlements that come with it; the
 * amounts are included only as a fallback for a store lookup that fails, and
 * are labelled as such.
 *
 * `purchasable` is the field the app should gate its buttons on. A tier with no
 * product id configured for this platform cannot be bought there, and showing a
 * button that cannot complete is worse than showing nothing.
 */
export const dynamic = "force-dynamic";

export const GET = apiRoute(async (req) => {
  const user = await requireApiUser(req);
  const platform = clientFrom(req);

  const storeConfigured =
    platform === "ios" ? isAppleIapConfigured() : platform === "android" ? isGoogleIapConfigured() : false;

  const plans = OFFERED_PLANS.map((plan) => {
    const productId =
      platform === "ios"
        ? appleProductFor(plan)
        : platform === "android"
          ? googleProductFor(plan)
          : undefined;

    return {
      plan,
      label: PLANS[plan].label,
      entitlements: toEntitlementsDto(plan),
      /** Look this up with the store SDK — that is where the real price is. */
      productId: productId ?? null,
      purchasable: Boolean(productId) && storeConfigured,
      /** Fallback only. See the note above before rendering this anywhere. */
      listPrice: PLANS[plan].prices,
      billingMonths: PLANS[plan].billingMonths,
    };
  });

  return ok({
    platform,
    plans,
    /** What they are on now, so the app can mark the current tier and not offer it. */
    currentPlan: user.plan,
    /**
     * A plan bought ANYWHERE — the website included — counts. The app must not
     * show a purchase button to someone already entitled: charging twice for
     * the same tier through a second provider is a refund request and, on iOS,
     * a review rejection.
     */
    alreadySubscribed: user.plan !== "free",
  });
});
