import type { Metadata } from "next";

import { logout } from "@/app/actions/auth";
import { PartnerShell } from "@/components/partner/partner-shell";
import { partnerContext } from "@/lib/partners";

export const metadata: Metadata = {
  title: "Partner panel · IELTSVega",
  robots: { index: false, follow: false },
};

/**
 * The partner panel's gate.
 *
 * `partnerContext()` is authoritative — the proxy routes on cookie presence
 * alone, so a signed-in candidate who guesses the URL is bounced to /dashboard
 * from here. Deliberately does NOT prompt for a phone number the way the
 * candidate shell does: an institution's login is created by an admin and may
 * have none, and that prompt blocks the whole shell.
 */
export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { user, partner } = await partnerContext();

  return (
    <PartnerShell
      partnerName={partner.name}
      loginName={user.name}
      suspended={partner.status !== "active"}
      logoutAction={logout}
    >
      {children}
    </PartnerShell>
  );
}
