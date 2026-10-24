import Link from "next/link";
import { Check, Loader2, Headphones, BookOpen, PenLine, Mic, ArrowUpRight } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { BrandDocument, BrandLogo } from "@/components/ui/brand-mark";
import { cn } from "@/lib/utils";
import { DeviceSignals } from "@/components/auth/device-signals";
import { chromeStyle, type PartnerBrand } from "@/lib/partner-brand";
import { requestTenant } from "@/lib/partner-tenant";

/**
 * Auth shell — split-screen, LIGHT form + DARK showcase, matching the landing's
 * exact light/dark language: the dark panel is the theme's `bg-paper-strong`
 * surface (same as the landing hero/method/footer), with the green accent card
 * and a "pipeline" chip stack mirroring the product's real AI flow.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  /*
   * On a class's subdomain these are the class's sign-in pages: its name and
   * logo in the corner, its colour on the showcase, and no link "back" to an
   * IELTSVega marketing site the class's students never came from.
   */
  const tenant = await requestTenant();

  // Fixed to the viewport — the auth pages never scroll; content fits.
  return (
    <div className="grid h-svh overflow-hidden bg-paper text-ink lg:grid-cols-[minmax(0,460px)_1fr]">
      <DeviceSignals />
      {tenant && <BrandDocument brand={tenant} />}
      {/*
        ── Form column (light). Slim top bar: logo (home) + back-to-site. ──

        The vertical rhythm here is deliberately tight. The signup form is the
        tallest thing either auth page renders, and at a 695px viewport — an
        ordinary laptop with browser chrome — the column was overflowing by
        131px and showing its own scrollbar beside the fixed dark panel, which
        looked broken rather than scrollable.

        `overflow-y-auto` stays as a safety valve: it is what keeps the form
        reachable on a genuinely short window (a 500px-tall browser, a phone in
        landscape) instead of clipping the submit button off the bottom. It
        simply no longer engages at normal heights.
      */}
      <div className="flex h-full flex-col overflow-y-auto px-6 py-3 sm:px-12">
        {tenant ? (
          <div className="flex items-center gap-2.5 py-1">
            <BrandLogo brand={tenant} className="size-9" priority />
            <span className="truncate text-lg font-semibold tracking-tight">{tenant.name}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex w-fit items-center gap-2.5">
              <LogoMark className="size-9" priority />
              <span className="text-lg font-semibold tracking-tight">IELTSVega</span>
            </Link>
            <Link href="/" className="text-xs font-medium text-ink-muted transition-colors hover:text-ink">
              ← Back to site
            </Link>
          </div>
        )}

        <div className="flex flex-1 items-center justify-center py-2 lg:py-0">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        <p className="text-center text-xs text-ink-muted lg:text-left">
          {tenant ? "IELTS practice · Powered by IELTSVega" : "Academic & General Training · 2026 exam format"}
        </p>
      </div>

      {/* ── Showcase column (desktop) ── */}
      {tenant ? (
        <PartnerShowcase brand={tenant} />
      ) : (
        <aside className="relative hidden flex-col justify-between gap-6 overflow-hidden border-l border-white/10 bg-paper-strong p-10 lg:flex xl:p-12">
          <Showcase />
        </aside>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Partner showcase — the class's own panel on its subdomain.
 *
 * Drawn entirely in the class's two colours (or IELTSVega's slate and white
 * when it set none), so whatever it chose, the text on it is readable: every
 * tint below is the text colour at an opacity, never a fixed white.
 * ------------------------------------------------------------------ */

function PartnerShowcase({ brand }: { brand: PartnerBrand }) {
  return (
    <aside
      style={chromeStyle(brand)}
      className="relative hidden flex-col justify-between gap-6 overflow-hidden bg-(--chrome-bg,hsl(var(--surface-strong))) p-10 text-(--chrome-fg,#ffffff) lg:flex xl:p-12"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.24em] opacity-50">
        IELTS preparation
      </p>

      <div className="max-w-lg">
        <BrandLogo brand={brand} className="size-20" priority />
        <h2 className="font-serif mt-6 text-[2.75rem] leading-[1.05] tracking-tight">{brand.name}</h2>
        {brand.tagline && <p className="mt-4 text-lg leading-relaxed opacity-75">{brand.tagline}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {SKILLS.map(({ label, Icon }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 rounded-2xl border border-current/15 px-4 py-3 text-sm font-medium"
          >
            <Icon className="size-4 shrink-0 opacity-60" strokeWidth={1.5} />
            {label}
          </div>
        ))}
      </div>

      <p className="font-mono text-[11px] uppercase tracking-wider opacity-40">Powered by IELTSVega</p>
    </aside>
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
          <span className="italic text-brand-soft">Band 9</span> starts with the right practice.
        </h2>
      </div>

      {/* Hero — the solid green accent card (design-token classes). */}
      <div className="rounded-3xl bg-green p-7 text-green-ink">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold leading-tight">AI Band Scoring</h3>
            <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-green-ink/75">
              Writing &amp; Speaking graded on all four IELTS criteria, in seconds, not days.
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
