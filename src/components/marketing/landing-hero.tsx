"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";

/**
 * LandingHero — calm, confident, dark. One statement, a single quiet entrance,
 * a background image (swap /test-7.png for the real shot). Nav is separate
 * (LandingNav) and floats over the top. All colours/fonts from the theme:
 * `bg-paper-strong` surface, `.font-serif` display face.
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const rise = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: EASE, delay },
});

export function LandingHero() {
  return (
    <section className="relative isolate flex min-h-[88vh] items-center overflow-hidden bg-paper-strong text-white">
      {/* Background image — drop the real shot at public/hero.png. */}
      <Image
        src="/hero-imgs.png"
        alt=""
        aria-hidden
        fill
        priority
        className="object-cover"
      />
      {/* Legibility wash — light enough that the WHOLE image reads; slightly
          stronger on the left behind the copy. Bottom fade blends into the next section. */}
      <div className="absolute inset-0 bg-gradient-to-r from-paper-strong/85 via-paper-strong/35 to-paper-strong/10" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-paper-strong to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-28">
        <motion.p
          {...rise(0)}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/50"
        >
          <span className="h-px w-8 bg-white/30" /> AI-scored IELTS practice ·
          Academic &amp; General
        </motion.p>

        <motion.h1
          {...rise(0.08)}
          className="font-serif mt-6 max-w-3xl text-[3rem] leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl"
        >
          The IELTS band you&apos;re{" "}
          <span className="italic text-brand-soft">truly capable of.</span>
        </motion.h1>

        <motion.p
          {...rise(0.18)}
          className="mt-6 max-w-xl text-lg text-white/65"
        >
          Instant AI band scores for Writing &amp; Speaking, full mock tests,
          and 15,000+ questions — practise the way examiners actually mark.
        </motion.p>

        <motion.div
          {...rise(0.28)}
          className="mt-9 flex flex-wrap items-center gap-3"
        >
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-lg bg-green px-6 py-3.5 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105"
          >
            Start practising free{" "}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#results"
            className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            See real results <ArrowUpRight className="size-4" />
          </a>
        </motion.div>

        <motion.p {...rise(0.4)} className="mt-8 text-sm text-white/45">
          No card required · free to start · scored in seconds.
        </motion.p>
      </div>
    </section>
  );
}
