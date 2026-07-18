import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { AuthHeader } from "@/components/auth/auth-ui";

export const metadata: Metadata = {
  title: "Sign in · IELTS Ace",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <AuthHeader
        chip="Welcome back"
        title="Sign in"
        subtitle="Sign in to continue your IELTS prep."
      />
      <LoginForm />
    </div>
  );
}
