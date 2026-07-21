"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * LandingNav — the one sticky header for the marketing landing. Reusable and
 * self-contained: it starts transparent over the dark hero (light text) and,
 * once scrolled past the hero, turns into a solid theme surface (ink text +
 * hairline border). No glass, all colours from the theme tokens.
 */

// In-page anchors (#) scroll; routes (/) navigate. Pricing & Resources are
// real pages to be built — the header structure is ready for them.
const LINKS = [
  { label: "Method", href: "#method" },
  { label: "Results", href: "#results" },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/resources" },
  { label: "FAQ", href: "#faq" },
];

export function LandingNav({ alwaysSolid = false }: { alwaysSolid?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const solid = alwaysSolid || scrolled;

  useEffect(() => {
    // Pages with a dark hero start transparent; flip to solid past the hero.
    // Pages passing `alwaysSolid` (light pages, no hero) skip the listener.
    if (alwaysSolid) return;
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [alwaysSolid]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        // On scroll the bar detaches from the edges so it can read as a pill.
        solid ? "px-3 pt-3 sm:px-5" : "px-0 pt-0",
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl items-center justify-between transition-all duration-300",
          // Rounds into a floating pill once scrolled; flush + transparent at top.
          solid ? "rounded-full border border-line bg-paper px-5 py-2.5 shadow-lg" : "px-5 py-3.5",
        )}
      >
        <Link href="/" className={cn("flex items-center gap-2 font-semibold transition-colors", solid ? "text-ink" : "text-white")}>
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-white">
            <GraduationCap className="size-5" />
          </span>
          IELTSAce
        </Link>

        <nav className="hidden items-center gap-8 text-[13px] font-medium md:flex">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className={cn("transition-colors", solid ? "text-ink-soft hover:text-ink" : "text-white/70 hover:text-white")}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={cn("hidden rounded-lg px-3.5 py-2 text-sm font-medium transition-colors sm:block", solid ? "text-ink-soft hover:text-ink" : "text-white/70 hover:text-white")}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105"
          >
            Get started <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
