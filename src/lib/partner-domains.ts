import "server-only";

import { env } from "@/lib/env";
import { partnerRootDomain } from "@/lib/partner-brand";

/**
 * Wiring a partner's subdomain up for real, from the admin panel, with no
 * dashboard clicks: the domain is added to the Vercel project (which issues its
 * certificate) and its CNAME is written at Hostinger, where ieltsvega.com's DNS
 * lives.
 *
 * ONE RECORD PER CLASS, NOT A WILDCARD. A `*` record would answer every typo
 * with a Vercel error page and need Vercel's nameservers for its certificate;
 * one CNAME per class means only real classes resolve, and Hostinger keeps the
 * zone — mail included — exactly as it is.
 *
 * NOTHING HERE IS LOAD-BEARING FOR THE APP. The subdomain is saved on the row
 * first; these calls only make the name reachable. If a token is missing or a
 * call fails, the admin screen says so and the same button retries — Vercel's
 * add and Hostinger's overwrite are both safe to repeat.
 */

const VERCEL_API = "https://api.vercel.com";
const HOSTINGER_API = "https://developers.hostinger.com";
/** Vercel's generic target, used only if it will not tell us the project's own. */
const FALLBACK_CNAME = "cname.vercel-dns.com";

export type DomainState =
  /** Resolves, verified, certificate on the way or issued. */
  | "live"
  /** Added on both sides; DNS or the certificate has not caught up yet. */
  | "pending"
  /** Not on the Vercel project. */
  | "missing"
  /** Running locally (`*.localhost`), where there is nothing to wire. */
  | "local"
  /** The tokens are not set, so this has to be done by hand. */
  | "unmanaged";

export type DomainResult = { state: DomainState; host: string; detail?: string };

export function partnerHost(subdomain: string): string {
  return `${subdomain}.${partnerRootDomain()}`;
}

function vercelConfigured(): boolean {
  return Boolean(env.VERCEL_API_TOKEN && env.VERCEL_PROJECT_ID);
}

function isLocalRoot(): boolean {
  return partnerRootDomain() === "localhost";
}

async function vercel(path: string, init?: RequestInit): Promise<Response> {
  const url = new URL(path, VERCEL_API);
  if (env.VERCEL_TEAM_ID) url.searchParams.set("teamId", env.VERCEL_TEAM_ID);
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.VERCEL_API_TOKEN}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
}

async function hostinger(method: "PUT" | "DELETE", body: unknown): Promise<Response> {
  return fetch(`${HOSTINGER_API}/api/dns/v1/zones/${partnerRootDomain()}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.HOSTINGER_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

async function errorText(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: { message?: string }; message?: string };
    return j.error?.message ?? j.message ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

/**
 * The CNAME target Vercel wants for this host. Projects now get their own
 * (`<hash>.vercel-dns-017.com`, which is what www points at); the generic one
 * still works but is the legacy answer.
 */
async function recommendedCname(host: string): Promise<string> {
  try {
    const res = await vercel(`/v6/domains/${host}/config`);
    if (!res.ok) return FALLBACK_CNAME;
    const j = (await res.json()) as { recommendedCNAME?: { rank: number; value: string }[] };
    const best = [...(j.recommendedCNAME ?? [])].sort((a, b) => a.rank - b.rank)[0]?.value;
    return best?.replace(/\.$/, "") || FALLBACK_CNAME;
  } catch {
    return FALLBACK_CNAME;
  }
}

/** Add the subdomain to the Vercel project and point its DNS at it. */
export async function attachSubdomain(subdomain: string): Promise<DomainResult> {
  const host = partnerHost(subdomain);
  if (isLocalRoot()) return { state: "local", host };
  if (!vercelConfigured()) {
    return { state: "unmanaged", host, detail: "VERCEL_API_TOKEN / VERCEL_PROJECT_ID are not set." };
  }

  const added = await vercel(`/v10/projects/${env.VERCEL_PROJECT_ID}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: host }),
  });
  // 409/400 "already exists on this project" is the retry case, and fine.
  if (!added.ok) {
    const message = await errorText(added);
    if (!/already/i.test(message)) return { state: "missing", host, detail: `Vercel: ${message}` };
  }

  if (!env.HOSTINGER_API_TOKEN) {
    return { state: "pending", host, detail: "HOSTINGER_API_TOKEN is not set; add the CNAME by hand." };
  }
  const target = await recommendedCname(host);
  const dns = await hostinger("PUT", {
    // Replaces only records with this name AND type, so a retry is harmless and
    // nothing else in the zone is touched.
    overwrite: true,
    zone: [{ name: subdomain, type: "CNAME", ttl: 300, records: [{ content: `${target}.` }] }],
  });
  if (!dns.ok) return { state: "pending", host, detail: `Hostinger: ${await errorText(dns)}` };

  return domainStatus(subdomain);
}

/** Take a subdomain off the project and out of DNS — on rename or removal. */
export async function detachSubdomain(subdomain: string): Promise<void> {
  const host = partnerHost(subdomain);
  if (isLocalRoot() || !vercelConfigured()) return;
  await vercel(`/v9/projects/${env.VERCEL_PROJECT_ID}/domains/${host}`, { method: "DELETE" }).catch(
    () => null,
  );
  if (env.HOSTINGER_API_TOKEN) {
    await hostinger("DELETE", { filters: [{ name: subdomain, type: "CNAME" }] }).catch(() => null);
  }
}

/** Where a subdomain stands, for the admin screen. */
export async function domainStatus(subdomain: string): Promise<DomainResult> {
  const host = partnerHost(subdomain);
  if (isLocalRoot()) return { state: "local", host };
  if (!vercelConfigured()) return { state: "unmanaged", host };

  const res = await vercel(`/v9/projects/${env.VERCEL_PROJECT_ID}/domains/${host}`);
  if (res.status === 404) return { state: "missing", host };
  if (!res.ok) return { state: "pending", host, detail: `Vercel: ${await errorText(res)}` };
  const domain = (await res.json()) as { verified?: boolean };

  const config = await vercel(`/v6/domains/${host}/config`);
  const misconfigured = config.ok
    ? Boolean(((await config.json()) as { misconfigured?: boolean }).misconfigured)
    : true;

  return domain.verified && !misconfigured
    ? { state: "live", host }
    : { state: "pending", host, detail: "Waiting for DNS to reach Vercel. Usually a few minutes." };
}
