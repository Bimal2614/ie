/**
 * White label — how a partner's own name, logo, tagline and colours replace
 * IELTSVega's, and which host a partner answers on.
 *
 * EVERY PIECE IS OPTIONAL AND INDEPENDENT. A class with only a logo gets its
 * logo and IELTSVega's colours; a class with only a colour gets IELTSVega's
 * mark on its colour. Nothing here ever invents a value the admin did not set,
 * with one exception: the text colour, which is derived from the brand colour
 * when it is left empty, because text nobody can read is not a default anyone
 * would choose.
 *
 * PURE AND CLIENT-SAFE: the shells import the type and the admin form imports
 * the colour helpers. The server-only half (reading the request host, looking a
 * subdomain up) is src/lib/partner-tenant.ts.
 */

/** Everything a shell needs to draw a partner's chrome. */
export type PartnerBrand = {
  partnerId: string;
  name: string;
  subdomain: string | null;
  /** Same-origin URL of the logo, or null to draw the IELTSVega mark. */
  logoUrl: string | null;
  tagline: string | null;
  /** `#rrggbb` or null for the IELTSVega chrome. */
  color: string | null;
  /** Text on `color`. Always set when `color` is — see `readableOn`. */
  textColor: string | null;
};

/** The partner columns a brand is built from. */
export type BrandColumns = {
  id: string;
  name: string;
  subdomain: string | null;
  logoKey: string | null;
  tagline: string | null;
  brandColor: string | null;
  brandTextColor: string | null;
};

/**
 * The partner's brand, or null when the class has not been white-labelled.
 *
 * NOTHING SET MEANS NOTHING CHANGES. A class onboarded before white label
 * existed has a name and nothing else, and its students have only ever seen
 * IELTSVega; swapping the name in on its own would rebrand their app without
 * anyone having decided to. Setting any one of the fields — a subdomain, a
 * logo, a tagline, a colour — is that decision.
 */
export function brandFrom(p: BrandColumns): PartnerBrand | null {
  if (!p.subdomain && !p.logoKey && !p.tagline?.trim() && !isHexColor(p.brandColor)) return null;
  const color = isHexColor(p.brandColor) ? p.brandColor.toLowerCase() : null;
  const explicitText = isHexColor(p.brandTextColor) ? p.brandTextColor.toLowerCase() : null;
  return {
    partnerId: p.id,
    name: p.name,
    subdomain: p.subdomain,
    logoUrl: p.logoKey ? logoUrl(p.id, p.logoKey) : null,
    tagline: p.tagline?.trim() || null,
    color,
    // A text colour on its own has nothing to sit on, so it only counts with a
    // brand colour; without one the default chrome keeps its own text.
    textColor: color ? (explicitText ?? readableOn(color)) : null,
  };
}

/**
 * The logo's URL, versioned by the object key.
 *
 * Every upload writes a NEW key (a fresh uuid), so the key is a perfect cache
 * buster: the route can tell browsers to keep the bytes forever, and a new logo
 * is a new URL the moment the row changes.
 */
function logoUrl(partnerId: string, logoKey: string): string {
  const version = logoKey.split("/").pop()?.split(".")[0] ?? "0";
  return `/api/partner-logo/${partnerId}?v=${version}`;
}

/* ------------------------------------------------------------------ *
 * Colours
 * ------------------------------------------------------------------ */

const HEX_RE = /^#[0-9a-f]{6}$/i;

export function isHexColor(v: unknown): v is string {
  return typeof v === "string" && HEX_RE.test(v);
}

/** WCAG relative luminance of a `#rrggbb`. */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio between two `#rrggbb` colours, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Black or white, whichever reads better on `bg` — white on navy, black on
 * yellow or white. Picked by contrast ratio rather than a luminance cut-off, so
 * the mid-tones land on whichever side is genuinely more legible.
 */
export function readableOn(bg: string): "#000000" | "#ffffff" {
  return contrastRatio(bg, "#ffffff") >= contrastRatio(bg, "#000000") ? "#ffffff" : "#000000";
}

/* ------------------------------------------------------------------ *
 * Subdomains
 * ------------------------------------------------------------------ */

/** 2–40 chars, lowercase letters and digits, hyphens only inside. */
export const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

/**
 * Labels no class may take: our own hosts, and words a visitor would read as
 * IELTSVega itself.
 */
export const RESERVED_SUBDOMAINS = new Set([
  "www", "app", "api", "admin", "partner", "partners", "staging", "stage", "dev",
  "test", "preview", "mail", "email", "smtp", "ftp", "blog", "help", "support",
  "status", "docs", "cdn", "static", "assets", "auth", "login", "ielts", "ieltsvega",
  "vega", "whatsapp", "news",
]);

export function isAllowedSubdomain(v: string): boolean {
  return v.length >= 2 && SUBDOMAIN_RE.test(v) && !RESERVED_SUBDOMAINS.has(v);
}

/**
 * The domain partner subdomains hang off.
 *
 * Read from `process.env` directly rather than through src/lib/env.ts so the
 * proxy, which runs on every request, does not pull the whole env schema in.
 * Defaults: `ieltsvega.com` in production, `localhost` in dev — Chrome resolves
 * any `*.localhost` to 127.0.0.1, so `classx.localhost:3000` works with no
 * hosts-file editing.
 */
export function partnerRootDomain(): string {
  const configured = process.env.PARTNER_ROOT_DOMAIN?.trim().toLowerCase();
  if (configured) return configured;
  return process.env.NODE_ENV === "production" ? "ieltsvega.com" : "localhost";
}

/**
 * The partner subdomain a Host header names, or null for every other host —
 * the apex, `www`, a `*.vercel.app` preview, an IP.
 *
 * Exactly ONE label in front of the root counts: `a.b.ieltsvega.com` is not a
 * partner, so a host can never be dressed up to look like one.
 */
export function subdomainFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase().replace(/\.$/, "");
  const root = partnerRootDomain();
  if (!hostname.endsWith(`.${root}`)) return null;
  const label = hostname.slice(0, -(root.length + 1));
  return isAllowedSubdomain(label) ? label : null;
}

/* ------------------------------------------------------------------ *
 * Drawing helpers — plain functions, so server and client both call them
 * ------------------------------------------------------------------ */

/** The name a shell types beside the mark. */
export function brandName(brand: PartnerBrand | null | undefined): string {
  return brand?.name ?? "IELTSVega";
}

/**
 * `--chrome-bg` / `--chrome-fg` for a surface drawn in the partner's colour.
 * Undefined when there is no colour, so the stylesheet's own defaults apply.
 */
export function chromeStyle(brand: PartnerBrand | null | undefined): React.CSSProperties | undefined {
  if (!brand?.color || !brand.textColor) return undefined;
  return { "--chrome-bg": brand.color, "--chrome-fg": brand.textColor } as React.CSSProperties;
}

/**
 * An absolute URL on the host the browser actually asked for.
 *
 * A Route Handler's `request.url` is not that: Next builds it from the server's
 * own address in dev (`localhost:3000`), so a redirect built from it walks a
 * student off classx.localhost onto the main site — signed out, unbranded. The
 * Host header is what the browser connected to, here and on Vercel alike.
 */
export function sameHostUrl(path: string, request: Request): URL {
  const fallback = new URL(request.url);
  // Host first: it is what the browser connected to, and unlike a forwarded
  // header a client cannot add a second copy of it.
  const host = request.headers.get("host") ?? fallback.host;
  const proto = request.headers.get("x-forwarded-proto") ?? fallback.protocol.replace(":", "");
  return new URL(path, `${proto}://${host}`);
}
