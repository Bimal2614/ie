import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in · IELTS Ace",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Sign in to continue your IELTS prep.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
