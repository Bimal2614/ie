import { requireCandidate } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function MockTestsLayout({ children }: { children: React.ReactNode }) {
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
