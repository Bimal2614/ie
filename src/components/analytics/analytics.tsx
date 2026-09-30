import {
  CLARITY_SNIPPET,
  GA_SNIPPET,
  GTM_ID,
  GTM_SNIPPET,
  META_PIXEL_ID,
  META_PIXEL_SNIPPET,
} from "@/lib/analytics-snippets";

/**
 * Third-party analytics tags — GA4, Microsoft Clarity, GTM and the Meta Pixel.
 *
 * GA4 and Clarity are OPTIONAL and driven purely by env vars: with neither set
 * nothing renders, so local dev and preview deploys stay clean and no
 * half-configured tag ever fires.
 *
 * NO NONCE, AND NO `headers()`
 * ----------------------------
 * These render inside the root layout, which also wraps the public pages. Those
 * are prerendered and served from the CDN, so there is no per-request nonce to
 * read — and reading one with `headers()` would make every route dynamic again.
 * Instead:
 *   - public pages send a CSP that allows inline scripts (src/proxy.ts);
 *   - the signed-in app routes send the strict nonce CSP, with a SHA-256 of each
 *     snippet below added to it, so these exact scripts are trusted there too.
 * The strings come from src/lib/analytics-snippets.ts so the rendered bytes and
 * the hashed bytes cannot drift. Retype one here and the tag is blocked silently
 * on every app page — the page works and the reports read zero.
 *
 * The matching `connect-src` / `img-src` entries live in proxy.ts. Both halves
 * are required; the script-src lets the tag load, the connect-src lets it report.
 */

function InlineScript({ code }: { code: string }) {
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export function Analytics() {
  return (
    <>
      {GA_SNIPPET ? <InlineScript code={GA_SNIPPET} /> : null}
      {CLARITY_SNIPPET ? <InlineScript code={CLARITY_SNIPPET} /> : null}
    </>
  );
}

/*
 * Google Tag Manager, in its two halves: the loader goes as high in <head> as
 * possible, the noscript iframe immediately after <body> opens. The iframe
 * needs `frame-src` in proxy.ts.
 */
export function GoogleTagManager() {
  return <InlineScript code={GTM_SNIPPET} />;
}

export function GoogleTagManagerNoScript() {
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}

/*
 * Meta (Facebook) Pixel. Same shape as GTM: the loader in <head>; its
 * connect-src / img-src origins are in proxy.ts. The noscript <img> goes in
 * <body> — an <img> inside a <head> noscript is invalid HTML, and the parser
 * would move it there anyway.
 */
export function MetaPixel() {
  return <InlineScript code={META_PIXEL_SNIPPET} />;
}

export function MetaPixelNoScript() {
  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element -- a tracking beacon, not content */}
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        alt=""
        src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
      />
    </noscript>
  );
}
