import { requireUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function PracticeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell
      user={{ name: user.name, email: user.email, targetModule: user.targetModule }}
      isAdmin={user.role === "admin"}
      plan={user.plan}
      needsPhone={!user.phone}
      logoutAction={logout}
    >
      {children}
    </AppShell>
  );
}
