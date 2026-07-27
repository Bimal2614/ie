import Link from "next/link";
import { GraduationCap, ArrowRight } from "lucide-react";
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
      { label: "Writing templates", href: "/resources/writing" },
      { label: "Speaking guide", href: "/resources/speaking" },
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
    title: "Popular guides",
    links: [
      { label: "IELTS band scores", href: "/ielts-band-scores" },
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

export function LandingFooter() {
  return (
    <footer className="mt-8 overflow-hidden rounded-t-[2.5rem] bg-paper-strong text-white">
      {/* Dark CTA — the closing moment */}
      <Reveal className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-5 py-24 text-center">
        <h2 className="font-serif max-w-2xl text-3xl tracking-tight sm:text-5xl">
          Your target band is closer than the last attempt made it feel.
        </h2>
        <p className="max-w-xl text-white/55">Start free today — practise, get scored, and watch your band climb.</p>
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
            <span className="grid size-8 place-items-center rounded-lg bg-white/10"><GraduationCap className="size-5" /></span>
            IELTSAce
          </span>
          <p className="mt-3 max-w-xs text-sm text-white/45">
            The complete IELTS preparation platform — AI band scoring, mock tests, and 15,000+
            questions for Academic &amp; General Training.
          </p>
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
        <p className="font-serif select-none text-center leading-none tracking-tight text-white/[0.05]" style={{ fontSize: "clamp(3rem, 18vw, 16rem)" }}>IELTSAce</p>
        <p className="-mt-1 text-center text-[10px] uppercase tracking-[0.3em] text-white/30 sm:text-sm">The best way to practise IELTS online</p>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-white/35 sm:flex-row">
          <p>© {new Date().getFullYear()} IELTSAce · Practise IELTS online, smarter.</p>
          <p>IELTS is a trademark of its respective owners. This is an independent practice platform.</p>
        </div>
      </div>
    </footer>
  );
}
