"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LogOut, UserPlus, Users } from "lucide-react";

import { BrandDocument, BrandLogo } from "@/components/ui/brand-mark";
import { brandName, chromeStyle, type PartnerBrand } from "@/lib/partner-brand";
import { cn } from "@/lib/utils";

/**
 * The partner panel's own chrome.
 *
 * NOT the candidate `AppShell`. That shell's nav is Practice, Mock Tests,
 * Results — a class has none of those, and showing them would offer an
 * institution a locked upsell for a product it is buying on someone else's
 * behalf. Three links is the whole panel.
 */

const LINKS = [
  { href: "/partner", label: "Students", icon: Users, exact: true },
  { href: "/partner/students/new", label: "Enrol a student", icon: UserPlus },
] as const;

export function PartnerShell({
  partnerName,
  brand,
  loginName,
  suspended,
  logoutAction,
  children,
}: {
  partnerName: string;
  /** The class's own white label. Null keeps the IELTSVega header. */
  brand: PartnerBrand | null;
  loginName: string;
  /** Read-only mode. The banner is the only warning a class gets. */
  suspended: boolean;
  logoutAction: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-paper">
      <BrandDocument brand={brand} />
      {/* The header takes the class's colour when it set one. The nav strip
          below stays on paper so the active tab's brand-blue underline reads. */}
      <div
        style={chromeStyle(brand)}
        className={brand?.color ? "bg-(--chrome-bg) text-(--chrome-fg)" : "bg-paper-elev"}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/partner" className={cn("flex min-w-0 items-center gap-2", !brand?.color && "text-ink")}>
            <BrandLogo brand={brand} className="size-7" />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{brandName(brand)}</span>
              {brand?.tagline && (
                <span className={cn("block truncate text-xs", brand.color ? "text-(--chrome-fg)/85" : "text-ink-muted")}>
                  {brand.tagline}
                </span>
              )}
            </span>
          </Link>
          {!brand && (
            <span className="hidden items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand sm:inline-flex">
              <GraduationCap className="size-3.5" /> Partner
            </span>
          )}

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              {/* The class name is already the header's title when branded. */}
              {!brand && <p className="text-sm font-semibold leading-tight text-ink">{partnerName}</p>}
              <p className={cn("text-xs", brand?.color ? "text-(--chrome-fg)/70" : "text-ink-muted")}>{loginName}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  brand?.color
                    ? "border-(--chrome-fg)/25 text-(--chrome-fg) hover:bg-(--chrome-fg)/10"
                    : "border-line text-ink-soft hover:bg-paper-sunken hover:text-ink",
                )}
              >
                <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </div>
      <header className="border-b border-line bg-paper-elev">

        <nav className="mx-auto flex max-w-6xl gap-1 px-4 sm:px-6">
          {LINKS.map(({ href, label, icon: Icon, ...rest }) => {
            const active = "exact" in rest && rest.exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-brand text-brand"
                    : "border-transparent text-ink-soft hover:text-ink",
                )}
              >
                <Icon className="size-4" /> {label}
              </Link>
            );
          })}
        </nav>
      </header>

      {suspended && (
        <div className="border-b border-warning bg-warning-soft px-4 py-2.5 text-center text-sm text-ink sm:px-6">
          This account is suspended, so new students and payments are paused. Students already
          enrolled keep their access. Please get in touch and we&apos;ll sort it out.
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
