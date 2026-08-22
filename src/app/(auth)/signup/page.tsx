import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";
import { AuthHeader } from "@/components/auth/auth-ui";
import { GoogleButton } from "@/components/auth/google-button";

export const metadata: Metadata = {
  title: "Create account · IELTSVega",
  robots: { index: false },
};

export default function SignupPage() {
  return (
    <div className="space-y-5">
      <AuthHeader
        chip="Your path to Band 9"
        title="Create account"
        subtitle="Enter your details to start practising."
      />
      <SignupForm />
      <GoogleButton label="Sign up with Google" />
    </div>
  );
}
