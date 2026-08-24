import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { AuthHeader } from "@/components/auth/auth-ui";
import { GoogleButton } from "@/components/auth/google-button";

const OAUTH_ERROR: Record<string, string> = {
  unavailable: "Google sign-in isn't available right now. Please use your email and password.",
  failed: "Google sign-in didn't complete. Please try again.",
  deactivated: "This account has been deactivated. Contact support if you think this is a mistake.",
};

export const metadata: Metadata = {
  title: "Sign in · IELTSVega",
  robots: { index: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ verified?: string; verify?: string; oauth?: string; signedout?: string }> }) {
  const { verified, verify, oauth, signedout } = await searchParams;
  const oauthError = oauth ? OAUTH_ERROR[oauth] : null;
  return (
    <div className="space-y-6">
      <AuthHeader
        chip="Welcome back"
        title="Sign in"
        subtitle="Sign in to continue your IELTS prep."
      />
      {/* Reached via /logout: the session was revoked or idled out. The most
          common cause by far is a sign-in elsewhere (one device at a time). */}
      {signedout && (
        <p className="rounded-lg border border-info/25 bg-info-soft px-3 py-2 text-sm text-info">
          You&apos;ve been signed out. Signing in on another device ends the session here. Only one device can be signed in at a time.
        </p>
      )}
      {verified === "1" && (
        <p className="rounded-lg border border-green/30 bg-green-soft px-3 py-2 text-sm text-green-ink">
          Email verified: you can sign in now.
        </p>
      )}
      {verify === "invalid" && (
        <p className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger">
          That verification link is invalid or has expired. Sign in and we&apos;ll help you resend it.
        </p>
      )}
      {oauthError && (
        <p className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger">{oauthError}</p>
      )}
      <LoginForm />
      <GoogleButton />
    </div>
  );
}
