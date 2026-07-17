"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, ChevronRight, User as UserIcon, Settings as SettingsIcon, LogOut, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

type TopbarUser = { name: string; email: string; targetModule: "academic" | "general" };

const ROUTE_LABELS: { match: RegExp; label: (m: RegExpMatchArray) => string }[] = [
  { match: /^\/dashboard/, label: () => "Dashboard" },
  { match: /^\/practice\/([^/]+)/, label: (m) => `Practice · ${cap(m[1])}` },
  { match: /^\/practice/, label: () => "Practice" },
  { match: /^\/mock-tests/, label: () => "Mock Tests" },
  { match: /^\/results/, label: () => "Results" },
  { match: /^\/study-guide\/([^/]+)/, label: (m) => `Study Guide · ${cap(m[1])}` },
  { match: /^\/study-guide/, label: () => "Study Guide" },
  { match: /^\/pricing/, label: () => "Plans & Pricing" },
  { match: /^\/settings/, label: () => "Settings" },
  { match: /^\/blog/, label: () => "Blog" },
];
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function pageLabelFor(path: string): string {
  for (const r of ROUTE_LABELS) {
    const m = path.match(r.match);
    if (m) return r.label(m);
  }
  return "";
}

interface TopbarProps {
  user: TopbarUser;
  onOpenSidebar: () => void;
  logoutAction: () => void | Promise<void>;
}

export function Topbar({ user, onOpenSidebar, logoutAction }: TopbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const pageLabel = pageLabelFor(pathname);
  const initial = (user.name?.[0] || user.email?.[0] || "U").toUpperCase();

  return (
    <header className="topbar">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open navigation"
          className="grid h-9 w-9 place-items-center rounded-md text-ink-soft hover:bg-paper-sunken lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden min-w-0 items-center gap-2 text-sm text-ink-muted sm:flex">
          <Link href="/dashboard" className="flex items-center gap-1.5 hover:text-ink-soft">
            <GraduationCap className="h-5 w-5 text-brand" />
            <span className="font-semibold text-ink-strong" style={{ fontFamily: "var(--font-heading)" }}>
              IELTSAce
            </span>
          </Link>
          {pageLabel && (
            <>
              <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              <span className="truncate font-medium text-ink-soft">{pageLabel}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden h-8 items-center gap-1.5 rounded-full border border-line bg-paper-sunken px-3 text-xs font-medium text-ink-soft sm:inline-flex">
          <span className={cn("h-1.5 w-1.5 rounded-full", user.targetModule === "general" ? "bg-accent" : "bg-brand")} />
          {user.targetModule === "general" ? "General Training" : "Academic"}
        </span>

        <Link
          href="/pricing"
          className="hidden h-8 items-center rounded-full bg-accent px-4 text-xs font-semibold text-accent-foreground hover:bg-accent-hover sm:inline-flex"
        >
          Upgrade
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Open user menu"
            aria-expanded={menuOpen}
            className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand"
          >
            {initial}
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div className="surface absolute right-0 z-50 mt-2 w-56 p-1.5 shadow-lg">
                <div className="px-2 py-1.5">
                  <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                  <p className="truncate text-xs text-ink-muted">{user.email}</p>
                </div>
                <div className="my-1 h-px bg-line" />
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-soft hover:bg-paper-sunken hover:text-ink"
                >
                  <UserIcon className="h-4 w-4" /> Dashboard
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-soft hover:bg-paper-sunken hover:text-ink"
                >
                  <SettingsIcon className="h-4 w-4" /> Settings
                </Link>
                <div className="my-1 h-px bg-line" />
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-danger hover:bg-danger-soft"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
