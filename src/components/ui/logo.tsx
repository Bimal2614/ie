import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The IELTSVega mark — the Vega star with the dove flying out of it.
 *
 * Defined once here so every header, sidebar, footer and loader draws the same
 * asset: swapping the logo later is a one-line change instead of a hunt through
 * seven files (which is exactly what the lucide GraduationCap placeholder this
 * replaced had become).
 *
 * The PNG is transparent and carries its own contrast — a bright dove over a
 * deep-navy star — so it sits directly on light and dark surfaces without a
 * tinted tile behind it. The wordmark is NOT part of this component: each
 * surface types it with its own font/size/stack, so forcing one here would
 * fight the layouts.
 */

/** Public path of the mark. 128px source: crisp at every size we render it. */
export const LOGO_SRC = "/brand/logo-128.png";

export function LogoMark({
  className,
  priority = false,
}: {
  /** Sizes the mark — pass a Tailwind size utility. Defaults to `size-8`. */
  className?: string;
  /** Set on above-the-fold marks (nav, sidebar, auth) to skip lazy-loading. */
  priority?: boolean;
}) {
  return (
    <Image
      src={LOGO_SRC}
      // Decorative: every call site puts the brand name in text beside it, so
      // announcing the image too would just repeat "IELTSVega" twice.
      alt=""
      aria-hidden
      width={128}
      height={128}
      priority={priority}
      className={cn("size-8 shrink-0 object-contain", className)}
    />
  );
}
