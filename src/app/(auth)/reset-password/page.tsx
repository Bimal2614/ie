import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeader } from "@/components/auth/auth-ui";
import { ResetPasswordForm } from "@/components/auth/recovery-forms";

export const metadata: Metadata = { title: "Reset password · IELTSVega", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  return (
    <div className="space-y-5">
      <AuthHeader chip="Account recovery" title="Set a new password" subtitle="Choose a strong new password." />
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger">
          This reset link is missing its token. Please request a new one from the forgot-password page.
        </p>
      )}
      <p className="text-center text-sm text-ink-muted">
        <Link href="/login" className="font-medium text-brand hover:underline">Back to login</Link>
      </p>
    </div>
  );
}
