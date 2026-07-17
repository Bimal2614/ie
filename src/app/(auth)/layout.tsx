import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-[var(--primary)] p-10 text-[var(--primary-foreground)] lg:flex">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <GraduationCap className="size-6" />
          IELTSAce
        </Link>
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold leading-tight">
            Band 9 starts with the right practice.
          </h2>
          <p className="max-w-md text-sm opacity-90">
            AI-scored Writing &amp; Speaking, full Academic and General Training banks, real exam
            timing, and a dashboard that knows exactly where your band is leaking.
          </p>
        </div>
        <p className="text-xs opacity-75">Academic &amp; General Training • 2026 format</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
