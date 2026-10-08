import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SignupForm } from "@/components/auth/signup-form";
import { AuthHeader } from "@/components/auth/auth-ui";
import { GoogleButton } from "@/components/auth/google-button";
import { PartnerWelcome } from "@/components/auth/partner-welcome";
import { parseReferral } from "@/lib/partner-referral";
import { INVITE_COOKIE, openInvite } from "@/lib/partner-invites";

export const metadata: Metadata = {
  title: "Create account · IELTSVega",
  robots: { index: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  /*
   * Arrived through a class's invite link. Read from the URL and NOT looked up:
   * the whole point of the link is that opening it asks us nothing (see
   * src/lib/partner-referral.ts). The id is checked against `partners` later,
   * once — at the moment the account is actually created.
   */
  const referral = parseReferral(params);
  /*
   * Arrived through an emailed invitation (src/lib/partner-invites.ts). Unlike
   * the link above, this one IS looked up — the partner name below is read from
   * `partners`, not from the URL — and it wins over a `ref` if both are present.
   * It only takes effect if the account is created with the invited address.
   */
  const invite = await openInvite((await cookies()).get(INVITE_COOKIE)?.value);

  return (
    <div className="space-y-4">
      <AuthHeader
        title="Create account"
        subtitle="Enter your details to start practising."
      />
      {invite ? (
        <PartnerWelcome name={invite.partnerName} invitedEmail={invite.email} />
      ) : (
        referral && <PartnerWelcome name={referral.name} />
      )}
      <GoogleButton
        label="Sign up with Google"
        position="top"
        referral={invite ? null : referral}
      />
      <SignupForm
        next={next}
        referral={invite ? null : referral}
        defaultEmail={invite?.email}
      />
    </div>
  );
}
