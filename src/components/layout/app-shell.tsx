"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { PhonePrompt } from "@/components/auth/phone-prompt";

import { type PlanKey } from "@/lib/plans";

type ShellUser = { name: string; email: string; targetModule: "academic" | "general" };

interface AppShellProps {
  user: ShellUser;
  /**
   * Reveals the admin group in the nav. Cosmetic only — every admin route
   * gates itself with `requireAdmin()`, so a forged `true` here shows a link
   * that redirects straight back to /dashboard.
   */
  isAdmin?: boolean;
  /**
   * The tier this session is entitled to, straight from `requireUser()`. The
   * shell takes it from the server rather than from `useAuth()` — these routes
   * are already rendered per-request, so there is no reason to make an
   * authenticated user wait on a probe to find out they are not being upsold.
   */
  plan?: PlanKey | null;
  /**
   * The account has no phone number on file — i.e. a Google sign-in, since
   * email signup collects one. Blocks the shell with a prompt until it's given.
   * Lives here rather than in each layout so every authed route inherits it.
   */
  needsPhone?: boolean;
  logoutAction: () => void | Promise<void>;
  children: ReactNode;
}

export function AppShell({ user, isAdmin, plan, needsPhone, logoutAction, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar isAdmin={isAdmin} plan={plan} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[280px] lg:hidden">
            <Sidebar
              isAdmin={isAdmin}
              plan={plan}
              showCloseButton
              onClose={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </>
      )}

      {needsPhone && <PhonePrompt />}

      <div className="app-main">
        <Topbar
          user={user}
          plan={plan}
          onOpenSidebar={() => setMobileOpen(true)}
          logoutAction={logoutAction}
        />
        <main className="flex-1">
          <div className="app-page">{children}</div>
        </main>
      </div>
    </div>
  );
}
