import Link from "next/link";
import { GraduationCap, Check, Loader2, Headphones, BookOpen, PenLine, Mic, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Auth shell — split-screen, LIGHT form + DARK showcase, matching the marketing
 * pages' light/dark rhythm. Left is a calm paper-white form column; right is the
 * dark bento showcase (an amber accent card + a "pipeline" chip stack that
 * mirrors the product's real AI flow). Premium through restraint.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh bg-paper text-ink lg:grid-cols-[minmax(0,460px)_1fr]">
      {/* ── Form column (light) ── */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="mx-auto inline-flex w-fit items-center gap-2.5 lg:mx-0">
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-white">
            <GraduationCap className="size-5" strokeWidth={1.75} />
          </span>
          <span className="text-lg font-semibold tracking-tight">IELTSAce</span>
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        <p className="text-center text-xs text-ink-muted lg:text-left">
          Academic &amp; General Training · 2026 exam format
        </p>
      </div>

      {/* ── Showcase column (desktop) ── */}
      <aside className="relative hidden flex-col justify-between gap-6 overflow-hidden border-l border-white/[0.06] bg-[#0c0c0e] p-10 lg:flex xl:p-12">
        <Showcase />
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Showcase — a filled, aligned composition (no empty tiles).
 * ------------------------------------------------------------------ */

const SKILLS = [
  { label: "Listening", Icon: Headphones },
  { label: "Reading", Icon: BookOpen },
  { label: "Writing", Icon: PenLine },
  { label: "Speaking", Icon: Mic },
] as const;

function Showcase() {
  return (
    <>
      {/* Heading */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-white/40">
          AI-scored IELTS practice
        </p>
        <h2 className="font-serif mt-4 max-w-md text-[2.5rem] leading-[1.05] tracking-tight text-white">
          Band 9 starts with the right practice.
        </h2>
      </div>

      {/* Hero — the solid green accent card (design-token classes). */}
      <div className="rounded-3xl bg-green p-7 text-green-ink">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold leading-tight">AI Band Scoring</h3>
            <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-green-ink/75">
              Writing &amp; Speaking graded on all four IELTS criteria — in seconds, not days.
            </p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-green-ink/12">
            <ArrowUpRight className="size-5" />
          </span>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-green-ink/60">
              Target band
            </span>
            <p className="font-serif text-6xl leading-none tabular-nums">9.0</p>
          </div>
          {/* Pipeline chips — contained inside the card, not floating. */}
          <div className="space-y-1.5">
            <PipelineChip label="evaluate_writing" done />
            <PipelineChip label="score_speaking" done />
            <PipelineChip label="generate_band_report" active />
          </div>
        </div>
      </div>

      {/* Two aligned cards fill the rest — no blanks. */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <p className="text-base font-semibold text-white">Instant feedback</p>
          <p className="mt-1.5 text-sm leading-relaxed text-white/50">
            Every answer scored and every mistake explained the moment you finish.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">
            All four skills
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {SKILLS.map(({ label, Icon }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-white/75">
                <Icon className="size-3.5 shrink-0 text-white/45" strokeWidth={1.5} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer spec strip. */}
      <div
        className="font-mono flex items-center gap-4 text-[11px] uppercase tracking-wider text-white/35"
      >
        <span>15,000+ questions</span>
        <span className="text-white/15">/</span>
        <span>Full mocks</span>
        <span className="text-white/15">/</span>
        <span>Academic + General</span>
      </div>
    </>
  );
}

/** A mono "command" chip — done ones get a check, the active one a spinner. */
function PipelineChip({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div
      className={cn(
        "font-mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]",
        active ? "bg-green-ink text-green" : "bg-green-ink/10 text-green-ink/80",
      )}
    >
      {done ? <Check className="size-3" /> : <Loader2 className="size-3 animate-spin" />}
      {label}
    </div>
  );
}
