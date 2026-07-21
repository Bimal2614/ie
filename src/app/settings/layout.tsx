import { requireUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell
      user={{ name: user.name, email: user.email, targetModule: user.targetModule }}
      logoutAction={logout}
    >
      {children}
    </AppShell>
  );
}
