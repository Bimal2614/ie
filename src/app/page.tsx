import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function Home() {
  // Logged-in users skip the marketing page.
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <span className="flex items-center gap-2 font-semibold">
          <GraduationCap className="size-6 text-[var(--primary)]" />
          IELTSAce
        </span>
        <nav className="flex items-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Sign in
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: "sm" }))}>
            Get started
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <span className="mb-4 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
          Academic &amp; General Training · 2026 exam format
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Train smarter. <span className="text-[var(--primary)]">Score higher.</span>
        </h1>
        <p className="mt-4 max-w-xl text-[var(--muted-foreground)]">
          AI-scored Writing and Speaking, real exam timing across all four sections, and a
          personalized dashboard that tracks your band day by day.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
            Start free <ArrowRight />
          </Link>
          <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            I have an account
          </Link>
        </div>
      </main>
    </div>
  );
}
