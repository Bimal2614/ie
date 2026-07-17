import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// PTEAce typography: Inter for UI + headings, JetBrains Mono for timers/numerics.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  display: "swap",
});

// Our nonce-based CSP (see src/proxy.ts) injects a fresh script nonce per
// request. That only works if pages render per-request, so opt the entire app
// into dynamic rendering — otherwise statically-prerendered pages ship scripts
// without a nonce and the browser's CSP blocks hydration.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "IELTSAce — AI-scored IELTS practice",
    template: "%s",
  },
  description:
    "Practice IELTS Academic & General Training with AI band scoring, real exam timing, and a personalized progress dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
