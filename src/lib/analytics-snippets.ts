/**
 * The inline analytics bootstraps, as the exact strings the page renders.
 *
 * They live here, not in the components, because TWO places need the same
 * bytes: src/components/analytics/analytics.tsx renders them, and src/proxy.ts
 * hashes them into the strict CSP it sends on the signed-in app routes. A hash
 * matches only the byte-identical script, so a copy retyped in either place
 * would block the tag silently — the page works, the reports read zero.
 *
 * Why hashes and not the nonce: public pages are prerendered once and served
 * from the CDN, so the root layout cannot read a per-request nonce (doing so
 * with `headers()` makes every route dynamic, which is what kept the marketing
 * site off the edge). The app routes still get a nonce for Next's own scripts;
 * these four are trusted by hash instead, and under `strict-dynamic` whatever
 * they insert (gtag.js, gtm.js, fbevents.js, the Clarity recorder) inherits it.
 *
 * Every loader INSERTS its external script rather than being a parser-inserted
 * `<script src>`: under strict-dynamic a parser-inserted external script needs
 * the nonce, and a static page has none to give it.
 *
 * GA4 is loaded directly; a GA4 tag inside the GTM container as well would
 * count every page view twice.
 */

const GA_ID = process.env.GA_MEASUREMENT_ID;
const CLARITY_ID = process.env.CLARITY_PROJECT_ID;

/** Public: the container id ships in the page source. */
export const GTM_ID = "GTM-TH9BSXRL";
export const META_PIXEL_ID = "1513171907515104";

export const GA_SNIPPET = GA_ID
  ? `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');(function(d){var s=d.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${GA_ID}';d.head.appendChild(s)})(document);`
  : null;

export const CLARITY_SNIPPET = CLARITY_ID
  ? `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${CLARITY_ID}");`
  : null;

export const GTM_SNIPPET = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;var n=d.querySelector('script[nonce]');if(n)j.setAttribute('nonce',n.nonce||n.getAttribute('nonce'));f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`;

export const META_PIXEL_SNIPPET = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`;

/** Every inline script the root layout renders — the list proxy.ts hashes. */
export const INLINE_ANALYTICS_SCRIPTS: string[] = [
  GTM_SNIPPET,
  META_PIXEL_SNIPPET,
  GA_SNIPPET,
  CLARITY_SNIPPET,
].filter((s): s is string => s !== null);
