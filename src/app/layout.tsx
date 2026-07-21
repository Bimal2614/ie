import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
  metadataBase: new URL(process.env.APP_URL ?? "https://ieltsace.com"),
  title: {
    // Pages set their own full title; this default (used when a page doesn't)
    // still leads with the query people search, not the brand name.
    default: "IELTS Practice Online — AI Band Scoring & Mock Tests | IELTSAce",
    template: "%s",
  },
  description:
    "Practise IELTS online with instant AI band scores for Writing & Speaking, full-length mock tests, and 15,000+ Academic and General Training questions.",
  applicationName: "IELTSAce",
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
        {children}
      </body>
    </html>
  );
}
