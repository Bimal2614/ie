import { LandingNav } from "./landing-nav";
import { LandingFooter } from "./landing-footer";
import { cn } from "@/lib/utils";

/**
 * Shared shell for standalone marketing pages (about, contact, legal, blog) —
 * the sticky nav, a padded main that clears the fixed header, and the footer.
 * Keeps every static page consistent without repeating the scaffold.
 */
export function MarketingShell({
  children,
  width = "prose",
}: {
  children: React.ReactNode;
  width?: "prose" | "wide";
}) {
  return (
    <div className="min-h-svh bg-paper text-ink">
      <LandingNav alwaysSolid />
      <main className={cn("mx-auto w-full px-5 pb-20 pt-28 sm:pt-32", width === "wide" ? "max-w-6xl" : "max-w-3xl")}>
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}

/** A page heading block used across the static pages. */
export function PageHead({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <header className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>
      <h1 className="font-serif mt-3 text-4xl tracking-tight sm:text-5xl">{title}</h1>
      {lead && <p className="mt-4 text-ink-soft">{lead}</p>}
    </header>
  );
}
