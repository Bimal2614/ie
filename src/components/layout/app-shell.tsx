"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

type ShellUser = { name: string; email: string; targetModule: "academic" | "general" };

interface AppShellProps {
  user: ShellUser;
  logoutAction: () => void | Promise<void>;
  children: ReactNode;
}

export function AppShell({ user, logoutAction, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
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
              showCloseButton
              onClose={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </>
      )}

      <div className="app-main">
        <Topbar user={user} onOpenSidebar={() => setMobileOpen(true)} logoutAction={logoutAction} />
        <main className="flex-1">
          <div className="app-page">{children}</div>
        </main>
      </div>
    </div>
  );
}
