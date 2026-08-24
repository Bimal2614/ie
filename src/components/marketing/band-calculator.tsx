"use client";

import { useState } from "react";
import { rawToBand, overallBand } from "@/lib/ielts";

/**
 * The interactive half of /ielts-band-score-calculator.
 *
 * Two modes, because the query "IELTS band score calculator" covers two different
 * jobs: converting a raw /40 practice score into a band (before the test), and
 * averaging four skill bands into the overall band (after it). Splitting them
 * keeps each form to a handful of inputs instead of one eight-field monster.
 *
 * Everything runs locally in state — no network call, so the result is instant and
 * nothing about a learner's score leaves their browser.
 */

const SKILL_BANDS = [0, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

type Mode = "raw" | "overall";

export function BandCalculator() {
  const [mode, setMode] = useState<Mode>("raw");

  return (
    <div className="rounded-2xl border border-line bg-paper-elev p-5 sm:p-7">
      {/* Mode switch */}
      <div
        role="tablist"
        aria-label="Calculator mode"
        className="inline-flex rounded-xl border border-line bg-paper-sunken p-1"
      >
        {(
          [
            ["raw", "Raw score → band"],
            ["overall", "Four bands → overall"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={
              mode === key
                ? "rounded-lg bg-paper px-4 py-2 text-sm font-semibold text-ink shadow-sm"
                : "rounded-lg px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">{mode === "raw" ? <RawScoreForm /> : <OverallForm />}</div>
    </div>
  );
}

/* ─────────────────── Raw /40 → band (Listening & Reading) ─────────────────── */

function RawScoreForm() {
  const [section, setSection] = useState<"listening" | "reading">("listening");
  const [module, setModule] = useState<"academic" | "general">("academic");
  const [correct, setCorrect] = useState(30);

  const band = rawToBand(section, correct, module);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Section">
          <Select value={section} onChange={(v) => setSection(v as "listening" | "reading")}>
            <option value="listening">Listening</option>
            <option value="reading">Reading</option>
          </Select>
        </Field>

        {/* Listening uses one table for both modules; Reading does not. */}
        <Field label={section === "reading" ? "Module" : "Module (Listening is the same for both)"}>
          <Select
            value={module}
            disabled={section === "listening"}
            onChange={(v) => setModule(v as "academic" | "general")}
          >
            <option value="academic">Academic</option>
            <option value="general">General Training</option>
          </Select>
        </Field>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="correct" className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Correct answers
          </label>
          <span className="font-serif text-2xl tabular-nums text-ink">{correct} / 40</span>
        </div>
        <input
          id="correct"
          type="range"
          min={0}
          max={40}
          step={1}
          value={correct}
          onChange={(e) => setCorrect(Number(e.target.value))}
          className="mt-3 w-full accent-brand"
        />
      </div>

      <Result
        band={band}
        caption={`${correct}/40 in ${section === "listening" ? "Listening" : `${module === "general" ? "General Training" : "Academic"} Reading`}`}
      />
    </div>
  );
}

/* ─────────────────── Four skill bands → overall band ─────────────────── */

function OverallForm() {
  const [bands, setBands] = useState<[number, number, number, number]>([7, 6.5, 6, 6.5]);
  const labels = ["Listening", "Reading", "Writing", "Speaking"] as const;

  const overall = overallBand(bands);
  const average = bands.reduce((a, b) => a + b, 0) / 4;
  /** Surface the rounding, because it is the single most misunderstood rule. */
  const rounded = Math.abs(average - overall) > 1e-9;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {labels.map((label, i) => (
          <Field key={label} label={label}>
            <Select
              value={String(bands[i])}
              onChange={(v) => {
                const next = [...bands] as [number, number, number, number];
                next[i] = Number(v);
                setBands(next);
              }}
            >
              {SKILL_BANDS.map((b) => (
                <option key={b} value={b}>
                  {b.toFixed(1)}
                </option>
              ))}
            </Select>
          </Field>
        ))}
      </div>

      <Result
        band={overall}
        caption={
          rounded
            ? `Average ${average.toFixed(2)}, rounded to the nearest half band`
            : `Average ${average.toFixed(2)}, no rounding needed`
        }
      />
    </div>
  );
}

/* ─────────────────────────────── Shared bits ─────────────────────────────── */

function Result({ band, caption }: { band: number; caption: string }) {
  return (
    <div
      aria-live="polite"
      className="mt-6 flex items-center gap-5 rounded-xl border-2 border-green bg-green-soft/30 p-5"
    >
      <span className="font-serif text-5xl tabular-nums leading-none text-ink">{band.toFixed(1)}</span>
      <span className="text-sm">
        <span className="block font-semibold text-ink">Estimated band</span>
        <span className="block text-ink-soft">{caption}</span>
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function Select({
  value,
  onChange,
  disabled,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink disabled:opacity-50"
    >
      {children}
    </select>
  );
}
