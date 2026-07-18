"use client";

import { useEffect, useRef } from "react";

/**
 * A subtle premium cursor accent — a small ring that trails the pointer with a
 * little lag, growing over interactive elements. Keeps the native cursor
 * underneath (hiding it hurts click precision and accessibility); this is a
 * flourish layered on top, desktop-only, off for touch or reduced-motion.
 *
 * The ring element is ALWAYS in the DOM (hidden until activated) so its ref is
 * attached before the effect reads it — gating render on state left the ref
 * null and threw on the first mousemove.
 */
export function PremiumCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = ref.current;
    if (!fine || reduced || !el) return;

    // Reveal only once we know the device has a fine pointer.
    el.style.opacity = "0.7";

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      const interactive = (e.target as HTMLElement | null)?.closest?.(
        "a,button,summary,input,label,[role=button]",
      );
      el.dataset.active = interactive ? "1" : "0";
    };

    const tick = () => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[90] size-6 rounded-full border border-brand/40 opacity-0 transition-[width,height,opacity] duration-200 data-[active=1]:size-10 data-[active=1]:opacity-100"
      style={{ mixBlendMode: "multiply" }}
    />
  );
}
