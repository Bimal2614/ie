import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";
import { AuthHeader } from "@/components/auth/auth-ui";

export const metadata: Metadata = {
  title: "Create account · IELTS Ace",
  robots: { index: false },
};

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <AuthHeader
        chip="Your path to Band 9"
        title="Create account"
        subtitle="Enter your details to start practising."
      />
      <SignupForm />
    </div>
  );
}
