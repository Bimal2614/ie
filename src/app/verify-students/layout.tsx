import { requireAdmin } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Admin-only shell. `requireAdmin` is the authoritative gate — the proxy only
 * checks that a session cookie exists, so a signed-in candidate who guesses the
 * URL is bounced to /dashboard from here.
 *
 * Deliberately does NOT pass `needsPhone`: the phone prompt blocks the whole
 * shell, and an admin account created straight in the database has no number,
 * which would lock the only person who can grant access out of the screen that
 * grants it.
 */
export default async function VerifyStudentsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <AppShell
      user={{ name: user.name, email: user.email, targetModule: user.targetModule }}
      isAdmin
      plan={user.plan}
      logoutAction={logout}
    >
      {children}
    </AppShell>
  );
}
