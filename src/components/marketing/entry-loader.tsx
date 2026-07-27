"use client";

import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";

/**
 * A brief, premium entry overlay — dark, centred mark, a filling bar, and mono
 * sub-steps. It sits ON TOP of the already server-rendered page (the content is
 * in the DOM for crawlers regardless), shows once per browser session, respects
 * reduced-motion, and fades out. Never a hard gate.
 */
const STEPS = ["Loading question bank", "Calibrating AI scoring", "Preparing your workspace"];

export function EntryLoader() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Once per session, and never for people who prefer reduced motion.
    const seen = sessionStorage.getItem("ielts_entry_seen");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduced) return;

    setShow(true);
    sessionStorage.setItem("ielts_entry_seen", "1");
    document.body.style.overflow = "hidden";

    const stepTimers = STEPS.map((_, i) => setTimeout(() => setStep(i), i * 450));
    const leave = setTimeout(() => setLeaving(true), 1500);
    const done = setTimeout(() => {
      setShow(false);
      document.body.style.overflow = "";
    }, 1900);

    return () => {
      stepTimers.forEach(clearTimeout);
      clearTimeout(leave);
      clearTimeout(done);
      document.body.style.overflow = "";
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center bg-paper-strong transition-opacity duration-400 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden
    >
      <div className="flex w-full max-w-xs flex-col items-center px-6 text-center">
        <span className="grid size-12 animate-pulse place-items-center rounded-2xl border border-white/10 bg-white/5">
          <GraduationCap className="size-6 text-white" strokeWidth={1.5} />
        </span>

        <p className="mt-6 text-lg font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
          Preparing your IELTS workspace
        </p>
        <p className="mt-1 text-xs text-white/40">The complete practice platform</p>

        {/* Progress bar */}
        <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-green" style={{ animation: "ielts-load 1.6s ease-out forwards" }} />
        </div>

        <p className="mt-6 h-4 text-[11px] uppercase tracking-wider text-white/35">
          {STEPS[step]}
        </p>
      </div>

      <style>{`@keyframes ielts-load { from { width: 4% } to { width: 100% } }`}</style>
    </div>
  );
}
