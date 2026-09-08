import { requireCandidate } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  /*
   * Authoritative auth gate for the whole candidate shell — and the role gate
   * with it. An admin or a partner arriving here is sent to their own panel:
   * this catches the ways in that do NOT pass through the login action, namely
   * a bookmark and the proxy's bounce off /login, which routes on cookie
   * presence alone and cannot know the role.
   */
  const user = await requireCandidate();

  return (
    <AppShell
      user={{ name: user.name, email: user.email, targetModule: user.targetModule }}
      plan={user.plan}
      needsPhone={!user.phone}
      logoutAction={logout}
    >
      {children}
    </AppShell>
  );
}
