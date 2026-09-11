"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BadgeCheck,
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Ticket,
  Wallet,
  X,
} from "lucide-react";

import { LogoMark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

/**
 * The admin console's chrome.
 *
 * NOT `AppShell`. That is the candidate's shell — Practice, Mock Tests,
 * Results, a plan badge and an Upgrade button — and running the admin screens
 * inside it meant whoever runs this business browsed their own operations
 * behind a nav built for someone studying for an exam, and got upsold a plan
 * by their own product. Nothing here mentions plans, practice or pricing.
 */

const LINKS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/partners", label: "Partners", icon: Building2 },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/students", label: "Students", icon: BadgeCheck },
  { href: "/admin/payments", label: "Payments", icon: Receipt },
  { href: "/admin/transactions", label: "Transactions", icon: Wallet },
] as const;

export function AdminShell({
  email,
  logoutAction,
  children,
}: {
  email: string;
  logoutAction: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-0.5 p-3">
      {LINKS.map(({ href, label, icon: Icon, ...rest }) => {
        const active =
          "exact" in rest && rest.exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand-soft text-brand" : "text-ink-soft hover:bg-paper-sunken hover:text-ink",
            )}
          >
            <Icon className="size-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-paper lg:flex">
      <aside className="hidden w-56 shrink-0 border-r border-line bg-paper-elev lg:block">
        <Link href="/admin" className="flex items-center gap-2 px-4 py-4 text-ink">
          <LogoMark className="size-7" />
          <span className="font-semibold">Admin</span>
        </Link>
        {nav}
      </aside>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-60 border-r border-line bg-paper-elev lg:hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <span className="font-semibold text-ink">Admin</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="size-5 text-ink-soft" />
              </button>
            </div>
            {nav}
          </aside>
        </>
      )}

      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 border-b border-line bg-paper-elev px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            className="lg:hidden"
          >
            <Menu className="size-5 text-ink-soft" />
          </button>
          <span className="ml-auto text-sm text-ink-muted">{email}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink"
            >
              <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
