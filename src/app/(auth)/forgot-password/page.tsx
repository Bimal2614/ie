import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeader } from "@/components/auth/auth-ui";
import { ForgotPasswordForm } from "@/components/auth/recovery-forms";

export const metadata: Metadata = { title: "Forgot password · IELTSVega", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-5">
      <AuthHeader chip="Account recovery" title="Forgot your password?" subtitle="We'll email you a reset link." />
      <ForgotPasswordForm />
      <p className="text-center text-sm text-ink-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">Back to login</Link>
      </p>
    </div>
  );
}
