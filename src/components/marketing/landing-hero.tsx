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

/**
 * Transform only, no opacity — same reasoning as Reveal in ./motion.
 *
 * This one mattered most: `initial: { opacity: 0 }` put the page's H1, its
 * lead paragraph and both calls to action into the server HTML at
 * `style="opacity:0"`. The H1 is the single strongest on-page ranking signal a
 * document has, and shipping it invisible to any crawler that respects inline
 * opacity is not a risk worth carrying for a fade. The copy now renders fully
 * opaque and slides 18px into place.
 */
const rise = (delay: number) => ({
  initial: { y: 18 },
  animate: { y: 0 },
  transition: { duration: 0.7, ease: EASE, delay },
});

export function LandingHero() {
  return (
    <section className="relative isolate flex flex-col overflow-hidden bg-paper-strong text-white sm:min-h-[88vh] sm:flex-row sm:items-center">
      {/* The photo's subject sits right of centre and its right half is bright,
          so a portrait crop puts her face behind the headline. On phones the
          image drops below the copy as a banner; from sm up it is the
          full-bleed background. One <Image> either way, so one download. */}
      <div className="relative order-last aspect-[4/3] w-full sm:absolute sm:inset-0 sm:order-none sm:aspect-auto">
        <Image
          src="/hero-imgs.png"
          alt=""
          aria-hidden
          fill
          priority
          // A `fill` image with no `sizes` makes Next assume 100vw at every
          // breakpoint and serve the largest variant to phones too. This IS a
          // full-bleed background, so 100vw is right — declaring it silences the
          // warning and lets the browser pick the smallest sufficient variant.
          // The hero is the LCP element, so this is the page's biggest CWV lever.
          sizes="100vw"
          className="object-cover object-[78%_center] sm:object-center"
        />
        {/* Phones: blend the banner's top edge into the copy above it. */}
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-paper-strong to-transparent sm:hidden" />
        {/* Legibility wash — light enough that the WHOLE image reads; slightly
            stronger on the left behind the copy. */}
        <div className="absolute inset-0 hidden bg-gradient-to-r from-paper-strong/85 via-paper-strong/35 to-paper-strong/10 sm:block" />
        {/* Bottom fade blends into the next section. */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-paper-strong to-transparent sm:h-40" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-6 pt-24 sm:py-28">
        <motion.p
          {...rise(0)}
          className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50 sm:text-xs sm:tracking-[0.22em]"
        >
          <span className="h-px w-8 shrink-0 bg-white/30" /> AI-scored IELTS practice ·
          Academic &amp; General
        </motion.p>

        <motion.h1
          {...rise(0.08)}
          className="font-serif mt-5 max-w-3xl text-[2.5rem] leading-[1.05] tracking-tight sm:mt-6 sm:text-6xl sm:leading-[1.03] lg:text-7xl"
        >
          The IELTS band you&apos;re{" "}
          <span className="italic text-brand-soft">truly capable of.</span>
        </motion.h1>

        <motion.p
          {...rise(0.18)}
          className="mt-5 max-w-xl text-base text-white/65 sm:mt-6 sm:text-lg"
        >
          Instant AI band scores for Writing &amp; Speaking, full mock tests, and 15,000+ questions. Practise the way examiners actually mark.
        </motion.p>

        <motion.div
          {...rise(0.28)}
          className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center"
        >
          <Link
            href="/signup"
            className="group inline-flex items-center justify-center gap-2 rounded-lg bg-green px-6 py-3.5 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105"
          >
            Start practising free{" "}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#results"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            See real results <ArrowUpRight className="size-4" />
          </a>
        </motion.div>

        <motion.p {...rise(0.4)} className="mt-6 text-center text-sm text-white/45 sm:mt-8 sm:text-left">
          No card required · free to start · scored in seconds.
        </motion.p>
      </div>
    </section>
  );
}
