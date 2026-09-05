import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { DevtoolsGuard } from "@/components/security/devtools-guard";
import { Analytics } from "@/components/analytics/analytics";
import { SITE_URL } from "@/lib/site";
import { BRAND, DEFAULT_DESCRIPTION, DEFAULT_TITLE, KEYWORDS } from "@/lib/seo";
import { LONG_TAIL, metaKeywordSlice } from "@/lib/keywords";

// One typeface for the entire app — Inter. The theme maps heading/body/mono/
// serif tokens all to this, so landing, auth and dashboard share a single font.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Our nonce-based CSP (see src/proxy.ts) injects a fresh script nonce per
// request. That only works if pages render per-request, so opt the entire app
// into dynamic rendering — otherwise statically-prerendered pages ship scripts
// without a nonce and the browser's CSP blocks hydration.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // Pages set their own full title; this default (used when a page doesn't)
    // still leads with the query people search, not the brand name.
    default: DEFAULT_TITLE,
    template: "%s",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: BRAND,
  // Baseline terms only. Pages layer their own clusters on via pageMeta().
  keywords: metaKeywordSlice([...KEYWORDS.core, ...KEYWORDS.ai, ...LONG_TAIL.aiTools, BRAND]),

  /**
   * NO site-wide `alternates` — deliberately.
   *
   * A layout-level `canonical: "/"` is inherited by every page that does not
   * set its own, and the only pages in that position here are the noindex ones
   * (/login, /signup and the gated app routes). That combination — `noindex` on
   * page A plus a canonical from A to B — is a documented way to lose page B:
   * Google consolidates A into B and can carry the noindex across with it. The
   * B in question would have been the home page.
   *
   * Every indexable route already emits its own self-referencing canonical and
   * hreflang through pageMeta(), so there is nothing for a default to cover.
   * Noindex pages correctly emit no canonical at all.
   */
  authors: [{ name: BRAND, url: SITE_URL }],
  creator: BRAND,
  publisher: BRAND,
  category: "education",

  /**
   * The permissive default every indexable page inherits. The googleBot block is
   * the part that matters commercially: without max-image-preview:large, Google
   * will not show a large thumbnail beside the result, and max-snippet:-1 lifts
   * the description-length cap. Gated pages override this with index:false via
   * pageMeta({ index: false }).
   */
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: BRAND,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },

  // Phone-number auto-linking mangles band scores and dates on mobile Safari.
  formatDetection: { telephone: false, date: false, address: false },

  /**
   * Search Console / Bing ownership. Set the env vars once in Vercel and the
   * verification tags appear site-wide — no HTML file upload or DNS record needed.
   */
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      {/* Browser extensions (password managers, etc.) inject attributes onto
          <body> before React hydrates, causing a benign attribute mismatch.
          suppressHydrationWarning silences it for this element only — not the
          tree — which is the documented fix for extension-injected attributes. */}
      <body className="min-h-full" suppressHydrationWarning>
        {/* Open DevTools and the whole tree below unmounts, then the tab leaves
            for about:blank. Development builds, crawlers and holders of the
            bypass token are exempt — see src/lib/devtools-watch.ts. */}
        <DevtoolsGuard>
          {/* One auth probe for the whole app; consumed via useAuth() everywhere. */}
          <AuthProvider>{children}</AuthProvider>
        </DevtoolsGuard>
        {/* Outside DevtoolsGuard on purpose: the guard unmounts its subtree
            when DevTools opens, and analytics must not be torn down with it. */}
        <Analytics />
      </body>
    </html>
  );
}
