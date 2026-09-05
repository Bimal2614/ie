import { headers } from "next/headers";

/**
 * Third-party analytics tags — Google Analytics 4 and Microsoft Clarity.
 *
 * Both are OPTIONAL and driven purely by env vars: with neither set this
 * component renders nothing at all, so local dev and preview deploys stay clean
 * and no half-configured tag ever fires. Set the id and the tag appears; unset
 * it and it is gone. There is no other switch.
 *
 * WHY THE NONCE MATTERS HERE
 * --------------------------
 * src/proxy.ts emits a per-request nonce-based CSP with `strict-dynamic`. Under
 * strict-dynamic the browser IGNORES host allowlists in `script-src` — a script
 * is trusted because it carries the request's nonce, or because trusted code
 * inserted it, never because of where it came from. So both tags below must
 * carry `nonce`, and the loaders they inject afterwards (gtag.js pulling its
 * collect endpoints, clarity.ms pulling its recorder) inherit that trust
 * automatically.
 *
 * Get this wrong and the failure is SILENT: the page renders perfectly, no
 * error is visible, and the only trace is a CSP refusal in a console nobody is
 * reading — while the reports sit at zero and look like "we have no traffic".
 *
 * The matching `connect-src` / `img-src` entries live in proxy.ts. Both halves
 * are required; the nonce lets the tag load, the connect-src lets it report.
 */

const GA_ID = process.env.GA_MEASUREMENT_ID;
const CLARITY_ID = process.env.CLARITY_PROJECT_ID;

export async function Analytics() {
  if (!GA_ID && !CLARITY_ID) return null;

  // Set by the proxy on every request. `headers()` is async in Next 15+, and
  // the app is already `force-dynamic` for exactly this reason, so reading it
  // costs nothing extra here.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      {GA_ID ? (
        <>
          <script async nonce={nonce} src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');`,
            }}
          />
        </>
      ) : null}

      {CLARITY_ID ? (
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${CLARITY_ID}");`,
          }}
        />
      ) : null}
    </>
  );
}
