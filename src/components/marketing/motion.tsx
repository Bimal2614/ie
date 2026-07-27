"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useMotionValue,
  useSpring,
  type MotionValue,
} from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Reveal — content rises/slides into place when scrolled into view, once.
 * Direction and delay are props, so sections get *varied* motion instead of the
 * same fade everywhere (which reads as AI-generated). Fully static under
 * reduced-motion.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  x = 0,
  duration = 0.7,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  x?: number;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * ScrollWords — the narrative reveals word-by-word as it scrolls through the
 * viewport (the signature editorial motion). Each word fades from faint to full
 * across the section's scroll progress.
 */
export function ScrollWords({ text, className }: { text: string; className?: string }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "start 0.3"] });
  const words = text.split(" ");

  if (reduced) return <p className={className}>{text}</p>;

  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
          {w}
        </Word>
      ))}
    </p>
  );
}

function Word({
  children,
  progress,
  range,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.15, 1]);
  return (
    <motion.span style={{ opacity }} className="mr-[0.28em] inline-block">
      {children}
    </motion.span>
  );
}

/** Magnetic — the child drifts toward the cursor, springs back on leave. */
export function Magnetic({ children, strength = 0.35 }: { children: React.ReactNode; strength?: number }) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.4 });

  if (reduced) return <span className="inline-block">{children}</span>;

  const onMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };

  return (
    <motion.span
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      className="inline-block"
    >
      {children}
    </motion.span>
  );
}
