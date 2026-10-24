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
 *
 * ONLY TITLES NEXT WROTE ARE REWRITTEN. A class called "Test IELTSVega" still
 * contains the word after the swap, and the observer fires on our own write —
 * so without remembering what we set, it rewrote its own output forever
 * ("Test Test Test …") and the tab never finished loading.
 *
 * The favicon links are Next's own (favicon.ico, icon.png, apple-icon), so they
 * are re-pointed in place rather than removed — React owns those nodes — and
 * re-pointed again whenever Next puts them back.
 */
export function BrandDocument({ brand }: { brand: PartnerBrand | null | undefined }) {
  const pathname = usePathname();
  const name = brand?.name;
  const logo = brand?.logoUrl;

  useEffect(() => {
    if (!name) return;
    let written: string | null = null;
    const apply = () => {
      if (document.title === written || !document.title.includes("IELTSVega")) return;
      written = document.title.replaceAll("IELTSVega", name);
      document.title = written;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [name, pathname]);

  useEffect(() => {
    if (!logo) return;
    const apply = () => {
      document.head
        .querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="apple-touch-icon"]')
        .forEach((link) => {
          if (link.getAttribute("href") === logo) return;
          link.href = logo;
          // The sizes and type described IELTSVega's files, not the class's logo.
          link.removeAttribute("sizes");
          link.removeAttribute("type");
        });
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
    return () => observer.disconnect();
  }, [logo, pathname]);

  return null;
}
