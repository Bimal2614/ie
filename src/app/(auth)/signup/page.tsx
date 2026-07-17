import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create account · IELTS Ace",
  robots: { index: false },
};

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Start practicing in minutes. No card required.
        </p>
      </div>
      <SignupForm />
    </div>
  );
}
