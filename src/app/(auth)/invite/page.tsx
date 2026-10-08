import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { logout } from "@/app/actions/auth";
import { AuthHeader, authButton } from "@/components/auth/auth-ui";
import { AcceptInvite } from "@/components/auth/accept-invite";
import { getCurrentUser } from "@/lib/dal";
import { INVITE_COOKIE, inviteeHasAccount, openInvite } from "@/lib/partner-invites";

export const metadata: Metadata = {
  title: "Class invitation · IELTSVega",
  robots: { index: false },
};

/**
 * Where a partner's invitation email lands (via /invite/<token>, which parks
 * the token in a cookie and redirects here).
 *
 * READ-ONLY. Every branch below only decides what to SHOW; the one write — the
 * Join button — goes through `acceptPartnerInviteAction`, which re-checks all
 * of it. Showing a state is never what makes it true.
 */
export default async function InvitePage() {
  const token = (await cookies()).get(INVITE_COOKIE)?.value;
  const [invite, me] = await Promise.all([openInvite(token), getCurrentUser()]);

  if (!invite) {
    return (
      <Notice title="Invitation expired">
        This invitation has expired or has already been used. Ask your institute to send you a new
        one.
        <Link href={me ? "/dashboard" : "/login"} className={`${authButton} mt-4`}>
          {me ? "Go to my dashboard" : "Sign in"}
        </Link>
      </Notice>
    );
  }

  const hasAccount = await inviteeHasAccount(invite.email);

  // Nobody signed in: send them to the right form, and back here afterwards.
  if (!me) redirect(hasAccount ? "/login?next=/invite" : "/signup");

  if (me.email.trim().toLowerCase() !== invite.email) {
    return (
      <Notice title="Wrong account">
        This invitation from <b className="text-ink">{invite.partnerName}</b> was sent to a different
        email address than the one you&apos;re signed in with ({me.email}). Sign out, then open the
        link from your email again and{" "}
        {hasAccount ? "sign in with the address it was sent to." : "create an account with that address."}
        <form action={logout} className="mt-4">
          <button type="submit" className={authButton}>
            Sign out
          </button>
        </form>
      </Notice>
    );
  }

  if (me.partnerId === invite.partnerId) {
    return (
      <Notice title="You're already in">
        Your account is already part of <b className="text-ink">{invite.partnerName}</b>.
        <Link href="/dashboard" className={`${authButton} mt-4`}>
          Go to my dashboard
        </Link>
      </Notice>
    );
  }

  if (me.role !== "user" || me.partnerId) {
    return (
      <Notice title="Can't join this class">
        Your account is already linked to another institute, so it can&apos;t join{" "}
        <b className="text-ink">{invite.partnerName}</b>. If you want to switch, contact us and
        we&apos;ll help.
        <Link href={me.role === "partner" ? "/partner" : "/dashboard"} className={`${authButton} mt-4`}>
          Continue
        </Link>
      </Notice>
    );
  }

  return (
    <div className="space-y-4">
      <AuthHeader title="Class invitation" subtitle="" />
      <div className="rounded-xl border border-green/30 bg-green-soft px-3.5 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-green-ink">
          <GraduationCap className="size-4 shrink-0" />
          {invite.partnerName} invited you to join their class
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          If you join, <span className="font-medium text-ink">{invite.partnerName}</span> will be able
          to see your progress, scores and feedback, and can buy a plan for you. Your account and
          practice stay yours. Signed in as {me.email}.
        </p>
      </div>
      <AcceptInvite partnerName={invite.partnerName} />
      <Link
        href="/dashboard"
        className="block text-center text-sm text-ink-muted transition-colors hover:text-ink"
      >
        Not now
      </Link>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <AuthHeader title={title} subtitle="" />
      <div className="text-center text-sm leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}
