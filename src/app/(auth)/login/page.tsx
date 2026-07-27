import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { AuthHeader } from "@/components/auth/auth-ui";

export const metadata: Metadata = {
  title: "Sign in · IELTS Ace",
  robots: { index: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ verified?: string; verify?: string }> }) {
  const { verified, verify } = await searchParams;
  return (
    <div className="space-y-6">
      <AuthHeader
        chip="Welcome back"
        title="Sign in"
        subtitle="Sign in to continue your IELTS prep."
      />
      {verified === "1" && (
        <p className="rounded-lg border border-green/30 bg-green-soft px-3 py-2 text-sm text-green-ink">
          Email verified — you can sign in now.
        </p>
      )}
      {verify === "invalid" && (
        <p className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger">
          That verification link is invalid or has expired. Sign in and we&apos;ll help you resend it.
        </p>
      )}
      <LoginForm />
    </div>
  );
}
