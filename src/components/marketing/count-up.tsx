"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts up to a target when scrolled into view — a purposeful, one-time motion
 * (not the generic fade-in-everything). Honours reduced-motion by rendering the
 * final value immediately. Formats with a prefix/suffix and thousands grouping.
 */
export function CountUp({
  to,
  from = 0,
  duration = 1400,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  to: number;
  from?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(from);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || done.current) return;
        done.current = true;
        io.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          // easeOutCubic — decelerates into the final number.
          const eased = 1 - Math.pow(1 - t, 3);
          setValue(from + (to - from) * eased);
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, from, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
