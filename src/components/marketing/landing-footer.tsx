import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { SOCIAL_PROFILES, SUPPORT_EMAIL } from "@/lib/brand-links";
import { Reveal, Magnetic } from "./motion";

/**
 * Shared marketing footer — dark rounded slab with the closing CTA, link
 * columns, and the oversized wordmark. Reused across landing, pricing, etc.
 */

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Practice",
    links: [
      { label: "Listening practice", href: "/practice/listening" },
      { label: "Reading practice", href: "/practice/reading" },
      { label: "Writing practice", href: "/practice/writing" },
      { label: "Speaking practice", href: "/practice/speaking" },
      { label: "Full mock tests", href: "/mock-tests" },
    ],
  },
  {
    title: "Study materials",
    links: [
      { label: "Listening strategies", href: "/resources/listening" },
      { label: "Reading strategies", href: "/resources/reading" },
      { label: "Writing guide", href: "/resources/writing" },
      { label: "Speaking guide", href: "/resources/speaking" },
      { label: "Sentence banks & templates", href: "/templates" },
      { label: "All study materials", href: "/resources" },
    ],
  },
  {
    title: "Product",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "AI band scoring", href: "/#features" },
      { label: "Results", href: "/#results" },
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/signup" },
    ],
  },
  {
    // Sitewide footer links are how the newer SEO pages get discovered and how
    // link equity reaches them — without a link on every page they are orphans.
    title: "Guides & tools",
    links: [
      { label: "Band score calculator", href: "/ielts-band-score-calculator" },
      { label: "IELTS band scores", href: "/ielts-band-scores" },
      { label: "IELTS 2026 changes", href: "/ielts-2026-changes" },
      { label: "How to get Band 7", href: "/ielts-band/7" },
      { label: "How to get Band 8", href: "/ielts-band/8" },
      { label: "How to get Band 9", href: "/ielts-band/9" },
      { label: "IELTS blog", href: "/blog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Terms of use", href: "/terms" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Refund policy", href: "/refunds" },
    ],
  },
];

/**
 * Brand marks, inlined.
 *
 * lucide-react v1 dropped every brand glyph (they are trademarks, not UI
 * icons), so importing Instagram/Facebook/Linkedin/Youtube from it fails to
 * compile. These are the Simple Icons paths — CC0, 24x24, single path, drawn in
 * `currentColor` so they inherit the link's hover colour like the lucide icons
 * beside them.
 */
const BRAND_ICON_PATHS: Record<string, string> = {
  Instagram:
    "M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z",
  X: "M18.9 2H22l-6.8 7.8L23 22h-6.3l-4.9-6.4L6.2 22H3l7.3-8.3L2.3 2h6.5l4.4 5.8L18.9 2Zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20Z",
  Facebook:
    "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
  LinkedIn:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  YouTube:
    "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
};

function BrandIcon({ name, className }: { name: string; className?: string }) {
  const d = BRAND_ICON_PATHS[name];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d={d} />
    </svg>
  );
}

export function LandingFooter() {
  return (
    <footer className="mt-8 overflow-hidden rounded-t-[2.5rem] bg-paper-strong text-white">
      {/* Dark CTA — the closing moment */}
      <Reveal className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-5 py-24 text-center">
        <h2 className="font-serif max-w-2xl text-3xl tracking-tight sm:text-5xl">
          Your target band is closer than the last attempt made it feel.
        </h2>
        <p className="max-w-xl text-white/55">Start free today: practise, get scored, and watch your band climb.</p>
        <Magnetic>
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-green px-6 py-3.5 text-sm font-semibold text-green-ink transition-colors hover:brightness-105">
            Start practising free <ArrowRight className="size-4" />
          </Link>
        </Magnetic>
      </Reveal>

      {/* Link columns */}
      <div className="mx-auto grid w-full max-w-6xl gap-8 border-t border-white/10 px-5 py-14 sm:grid-cols-3 lg:grid-cols-[1.6fr_repeat(5,1fr)]">
        <div className="md:col-span-1">
          <span className="flex items-center gap-2 font-semibold">
            <LogoMark className="size-8" />
            IELTSVega
          </span>
          <p className="mt-3 max-w-xs text-sm text-white/45">
            The complete IELTS preparation platform: AI band scoring, mock tests, and 15,000+ questions for Academic &amp; General Training.
          </p>

          {/* Contact — the crawlable, machine-readable one. Mirrors the email on
              the Organization contactPoint so the two never disagree. */}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-4 inline-flex items-center gap-2 text-sm text-white/45 transition-colors hover:text-white"
          >
            <Mail className="size-4" aria-hidden />
            {SUPPORT_EMAIL}
          </a>

          {/* Social row. These are the outbound half of the sameAs handshake —
              the profile links back here, this links to the profile, and Google
              resolves both to one brand entity. rel="me" states the ownership
              claim explicitly; noopener is the standard safety on target=_blank. */}
          <ul className="mt-5 flex items-center gap-2">
            {SOCIAL_PROFILES.map((p) => (
                <li key={p.name}>
                  <a
                    href={p.url}
                    rel="me noopener noreferrer"
                    target="_blank"
                    aria-label={`${p.name}: @${p.handle}`}
                    title={`IELTSVega on ${p.name}`}
                    className="grid size-9 place-items-center rounded-lg border border-white/10 text-white/50 transition-colors hover:border-white/30 hover:text-white"
                  >
                    <BrandIcon name={p.name} className="size-4" />
                  </a>
                </li>
              ))}
          </ul>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="text-sm font-semibold text-white">{c.title}</p>
            <ul className="mt-3 space-y-2 text-sm text-white/45">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="transition-colors hover:text-white">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Oversized wordmark */}
      <div className="overflow-hidden border-t border-white/10 px-4 pb-8 pt-10">
        <p className="font-serif select-none text-center text-[clamp(3rem,18vw,16rem)] leading-none tracking-tight text-white/[0.05]">IELTSVega</p>
        <p className="-mt-1 text-center text-[10px] uppercase tracking-[0.3em] text-white/30 sm:text-sm">The best way to practise IELTS online</p>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-white/35 sm:flex-row">
          <p>© {new Date().getFullYear()} IELTSVega · Practise IELTS online, smarter.</p>
          <p>IELTS is a trademark of its respective owners. This is an independent practice platform.</p>
        </div>
      </div>
    </footer>
  );
}
