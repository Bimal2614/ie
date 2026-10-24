"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { LogoMark } from "@/components/ui/logo";
import type { PartnerBrand } from "@/lib/partner-brand";
import { cn } from "@/lib/utils";

/**
 * The mark in a shell's corner: the partner's logo when it uploaded one, the
 * IELTSVega mark otherwise. Every white-labelled surface draws it through here
 * so "which logo?" is answered in one place, the way LogoMark answers "which
 * file?".
 */
export function BrandLogo({
  brand,
  className,
  priority = false,
}: {
  brand: PartnerBrand | null | undefined;
  /** Sizes the mark — pass a Tailwind size utility. Defaults to `size-8`. */
  className?: string;
  priority?: boolean;
}) {
  if (!brand?.logoUrl) return <LogoMark className={className} priority={priority} />;
  return (
    // A plain <img>: the logo is already a small, cached, same-origin file, and
    // next/image would need every query-string version allow-listed.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brand.logoUrl}
      // Decorative, as with LogoMark: the name is always typed beside it.
      alt=""
      aria-hidden
      fetchPriority={priority ? "high" : undefined}
      className={cn("size-8 shrink-0 object-contain", className)}
    />
  );
}

/**
 * Puts the partner's name in the browser tab and its logo in the favicon.
 *
 * Page titles are written as "Practice · IELTSVega" in some forty files; this
 * rewrites the brand half on the client rather than threading a name through
 * every one of their `metadata` exports. It re-applies on navigation and
 * whenever Next swaps the <title>, which it does after the route change lands.
 */
export function BrandDocument({ brand }: { brand: PartnerBrand | null | undefined }) {
  const pathname = usePathname();
  const name = brand?.name;
  const logo = brand?.logoUrl;

  useEffect(() => {
    if (!name) return;
    const apply = () => {
      if (document.title.includes("IELTSVega")) {
        document.title = document.title.replaceAll("IELTSVega", name);
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [name, pathname]);

  useEffect(() => {
    if (!logo) return;
    document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]').forEach((link) => {
      link.href = logo;
    });
  }, [logo, pathname]);

  return null;
}
