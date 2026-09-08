import type { Metadata } from "next";

import { logout } from "@/app/actions/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Admin · IELTSVega",
  robots: { index: false, follow: false },
};

/**
 * `requireAdmin` is the authoritative gate — the proxy only checks that a
 * session cookie exists, so a signed-in candidate who guesses the URL is
 * bounced to /dashboard from here.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <AdminShell email={user.email} logoutAction={logout}>
      {children}
    </AdminShell>
  );
}
