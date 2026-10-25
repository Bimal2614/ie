import Link from "next/link";
import { LogoMark } from "@/components/ui/logo";
import { BrandDocument, BrandLogo } from "@/components/ui/brand-mark";
import { DeviceSignals } from "@/components/auth/device-signals";
import { FactDeck } from "@/components/auth/fact-deck";
import { chromeStyle, contrastRatio, type PartnerBrand } from "@/lib/partner-brand";
import { requestTenant } from "@/lib/partner-tenant";

/**
 * Auth shell — two equal halves: the LIGHT form on the left, and on the right
 * a showcase panel holding one card that walks through IELTS facts, each with
 * its own drawing (see FactDeck).
 *
 * On www the panel is the theme's dark `bg-paper-strong` with IELTSVega green
 * on the card. On a class's subdomain it is the class's own colour, with its
 * logo, name and tagline above the card, and the card's accent and the form's
 * main button in that colour too.
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
    <div
      // On a class's subdomain the form's main button takes the class's colour (see authButton).
      style={tenant?.color ? ({ "--cta-bg": tenant.color, "--cta-fg": tenant.textColor } as React.CSSProperties) : undefined}
      className="grid h-svh overflow-hidden bg-paper text-ink lg:grid-cols-2"
    >
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
      {tenant ? <PartnerShowcase brand={tenant} /> : <Showcase />}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The two showcase panels. Both are a header, the fact card, a footer.
 * ------------------------------------------------------------------ */

const PANEL =
  "relative isolate hidden flex-col items-center justify-between gap-5 overflow-hidden px-10 py-8 lg:flex xl:px-14";

/** A dot grid and a soft light from the top corner, tinted with the panel's text colour. */
function PanelTexture() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        backgroundImage:
          "radial-gradient(55% 45% at 90% 0%, color-mix(in srgb, var(--fg) 16%, transparent), transparent 70%), radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--fg) 13%, transparent) 1px, transparent 0)",
        backgroundSize: "auto, 22px 22px",
      }}
    />
  );
}

/** IELTSVega's own panel on www: slate, with the green accent. */
function Showcase() {
  return (
    <aside
      className={`${PANEL} bg-paper-strong text-white`}
      style={
        {
          "--fg": "#ffffff",
          "--deck-card": "hsl(var(--bg-elev))",
          "--deck-ink": "hsl(var(--ink))",
          "--deck-muted": "hsl(var(--ink-muted))",
          "--deck-soft": "hsl(var(--bg-sunken))",
          "--deck-track": "hsl(var(--line))",
          "--deck-accent": "hsl(var(--green))",
          "--deck-accent-ink": "hsl(var(--green-ink))",
        } as React.CSSProperties
      }
    >
      <PanelTexture />
      <div className="w-full max-w-[30rem]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">AI-scored IELTS practice</p>
        <h2 className="mt-2 text-[2rem] font-semibold leading-[1.1] tracking-tight xl:text-[2.25rem]">
          Know the exam <span className="text-green">before</span> it tests you.
        </h2>
      </div>

      <FactDeck />

      <div className="flex w-full max-w-[30rem] items-center justify-between gap-4 text-[11px] font-medium uppercase tracking-wider text-white/45">
        <span>15,000+ questions</span>
        <span>Full mocks</span>
        <span>Academic + General</span>
      </div>
    </aside>
  );
}

/**
 * The class's panel on its subdomain, in its two colours (or IELTSVega's slate
 * and white when it set none).
 *
 * The card's accent is the class colour, unless that colour would vanish on
 * the white card (a white or pale-yellow brand) — then it falls back to ink,
 * so the drawings never lose their highlights.
 */
function PartnerShowcase({ brand }: { brand: PartnerBrand }) {
  const accentShows = brand.color ? contrastRatio(brand.color, "#ffffff") >= 1.6 : false;
  const accent = brand.color && accentShows ? brand.color : brand.color ? "hsl(var(--ink))" : "hsl(var(--green))";
  const accentInk = brand.color && accentShows ? brand.textColor! : brand.color ? "#ffffff" : "hsl(var(--green-ink))";

  return (
    <aside
      className={`${PANEL} bg-(--chrome-bg,hsl(var(--surface-strong))) text-(--chrome-fg,#ffffff)`}
      style={
        {
          ...chromeStyle(brand),
          "--fg": "var(--chrome-fg, #ffffff)",
          "--deck-card": "hsl(var(--bg-elev))",
          "--deck-ink": "hsl(var(--ink))",
          "--deck-muted": "hsl(var(--ink-muted))",
          "--deck-soft": "hsl(var(--bg-sunken))",
          "--deck-track": "hsl(var(--line))",
          "--deck-accent": accent,
          "--deck-accent-ink": accentInk,
        } as React.CSSProperties
      }
    >
      <PanelTexture />
      <div className="flex w-full max-w-[30rem] items-center gap-4">
        <span
          className="size-14 shrink-0 overflow-hidden rounded-2xl"
          style={{ boxShadow: "0 0 0 1px color-mix(in srgb, var(--fg) 25%, transparent), 0 14px 30px -12px rgb(0 0 0 / 0.4)" }}
        >
          <BrandLogo brand={brand} className="size-full object-cover" priority />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-[1.75rem] font-semibold leading-tight tracking-tight">{brand.name}</h2>
          <p
            className="truncate text-sm font-medium"
            style={{ color: "color-mix(in srgb, var(--fg) 85%, transparent)" }}
          >
            {brand.tagline ?? "IELTS preparation"}
          </p>
        </div>
      </div>

      <FactDeck />

      <div
        className="flex w-full max-w-[30rem] items-center justify-between gap-4 text-[11px] font-medium uppercase tracking-wider"
        style={{ color: "color-mix(in srgb, var(--fg) 65%, transparent)" }}
      >
        <span>Student portal</span>
        <span>Powered by IELTSVega</span>
      </div>
    </aside>
  );
}
