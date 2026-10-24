import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { partners } from "@/db/schema";
import { env } from "@/lib/env";
import { brandFrom, partnerRootDomain, subdomainFromHost, type PartnerBrand } from "@/lib/partner-brand";

/**
 * Which partner, if any, THIS request's host belongs to.
 *
 * READ FROM THE REQUEST'S OWN HOST HEADERS, NOT FROM ANYTHING THE PROXY SETS.
 * The proxy is skipped for prefetches and /api, so a header it stamped would be
 * missing on exactly the requests a client controls most.
 *
 * `x-forwarded-host` FIRST, then `host`. When a Server Action redirects (sign
 * out → /login), Next renders the target in an internal request whose `host`
 * is the server's own address (`localhost:3000`) — only `x-forwarded-host`
 * still names classx.localhost, so reading `host` alone painted IELTSVega's
 * sign-in page on the class's URL until a refresh. On Vercel the platform sets
 * `x-forwarded-host` to the domain it routed by, overwriting any sent by the
 * browser.
 */
export async function requestSubdomain(): Promise<string | null> {
  const h = await headers();
  return subdomainFromHost(h.get("x-forwarded-host") ?? h.get("host"));
}

/**
 * The brand of the partner whose subdomain this request arrived on.
 *
 * Null on www and on a subdomain no partner holds (the proxy has already sent
 * the latter to www, so it only reaches here through /api). Memoised for the
 * render, so the layout and the page share one lookup.
 */
export const requestTenant = cache(async (): Promise<PartnerBrand | null> => {
  const subdomain = await requestSubdomain();
  if (!subdomain) return null;
  const [row] = await db
    .select({
      id: partners.id,
      name: partners.name,
      subdomain: partners.subdomain,
      logoKey: partners.logoKey,
      tagline: partners.tagline,
      brandColor: partners.brandColor,
      brandTextColor: partners.brandTextColor,
    })
    .from(partners)
    .where(eq(partners.subdomain, subdomain))
    .limit(1);
  return row ? brandFrom(row) : null;
});

/**
 * The origin links for this partner's people should point at: its subdomain
 * when it has one, the main site otherwise.
 *
 * `https://classx.ieltsvega.com` in production, built from APP_URL. On a
 * laptop the root is `localhost` and APP_URL usually still names production,
 * so the dev server's own scheme and port are used instead —
 * `http://classx.localhost:3000`.
 */
export function partnerOrigin(subdomain: string | null | undefined): string {
  const base = (env.APP_URL ?? "https://ieltsvega.com").replace(/\/+$/, "");
  if (!subdomain) return base;
  if (partnerRootDomain() === "localhost") {
    return `http://${subdomain}.localhost:${process.env.PORT ?? "3000"}`;
  }
  const url = new URL(base);
  url.hostname = `${subdomain}.${partnerRootDomain()}`;
  return url.origin;
}
