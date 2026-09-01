import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowRight } from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { entitlements } from "@/lib/plans";
import { planUsage } from "@/lib/security/plan-guard";
import { cardClass } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { ProfileForm, PasswordForm } from "@/components/settings/settings-forms";
import { CancelSubscription } from "@/components/settings/cancel-subscription";
import { currentSubscription } from "@/lib/subscriptions";

export const metadata: Metadata = { title: "Settings · IELTSVega", robots: { index: false } };

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className={cn(cardClass, "p-6")}>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {desc && <p className="mt-1 text-sm text-ink-muted">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const NOTIFS = [
  { label: "Study reminders", desc: "Nudges to keep your streak going." },
  { label: "Score-ready alerts", desc: "When an AI band report is ready." },
  { label: "Product updates", desc: "Occasional news: no spam." },
];

export default async function SettingsPage() {
  const authed = await requireUser();
  const [u] = await db
    .select({
      name: users.name,
      email: users.email,
      phone: users.phone,
      country: users.country,
      targetModule: users.targetModule,
      targetBand: users.targetBand,
      examDate: users.examDate,
    })
    .from(users)
    .where(eq(users.id, authed.id))
    .limit(1);

  const examDate = u?.examDate ? u.examDate.toISOString().slice(0, 10) : "";

  // The card below used to say "Free plan" to everyone, including paying
  // customers. It now reads the same entitlements the gates enforce, so what a
  // candidate is told they have is what a submit will actually allow.
  const usage = await planUsage(authed);
  const plan = entitlements(authed.plan);
  const renews = authed.planExpiresAt
    ? authed.planExpiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  /*
   * The subscription behind the tier, which is what a cancel button acts on.
   *
   * Read separately from `authed.plan` because the two answer different
   * questions: the session says what the account is entitled to RIGHT NOW,
   * while this says whether there is a live billing arrangement to stop. An
   * account can be Premium with nothing to cancel — an admin grant, a comped
   * year — and offering a cancel button there would only fail at the gateway.
   */
  const subscription = await currentSubscription(authed.id);
  const ending = subscription?.cancelAtPeriodEnd === true;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">Manage your profile, goals, and account.</p>
      </div>

      <Card title="Profile & goals" desc="Your details and what you're working towards.">
        <ProfileForm
          initial={{
            name: u?.name ?? authed.name,
            email: u?.email ?? authed.email,
            phone: u?.phone ?? "",
            country: u?.country ?? "",
            targetModule: u?.targetModule ?? authed.targetModule,
            targetBand: u?.targetBand ?? "",
            examDate,
          }}
        />
      </Card>

      <Card title="Password" desc="Choose a strong password you don't use elsewhere.">
        <PasswordForm />
      </Card>

      <Card title="Subscription" desc="Your current plan.">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium text-ink">{plan.label} plan</p>
            <p className="text-sm text-ink-muted">
              {/* "Renews" is now a statement about a card, not about a window
                  running out, so a subscription on its way out must not keep
                  saying it — that reads as a charge the customer thought they
                  had stopped. */}
              {authed.plan === "free"
                ? "Reading and Listening practice, marked instantly. Upgrade for AI band scoring on Writing and Speaking, and full mock tests."
                : ending
                  ? renews
                    ? `Cancelled. Your access runs until ${renews}, and you won't be charged again.`
                    : "Cancelled. You won't be charged again."
                  : renews
                    ? `Renews automatically on ${renews}.`
                    : "Active."}
            </p>
            {/* Only a capped plan has a count worth showing. */}
            {usage.practiceLimit !== null && (
              <p className="mt-2 text-sm text-ink-soft">
                <span className="font-medium text-ink">
                  {usage.practiceUsed} of {usage.practiceLimit}
                </span>{" "}
                practice questions used this month
                {usage.practiceRemaining === 0 && " — your allowance resets on the 1st"}
              </p>
            )}
          </div>
          {/*
            Only a free account has somewhere to go. "Change plan" pointed a
            paying customer at a page whose every card they already own — an
            upsell with nothing to sell.
          */}
          {authed.plan === "free" && (
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105">
              View plans <ArrowRight className="size-4" />
            </Link>
          )}
        </div>

        {/* Only a live billing arrangement can be stopped. An admin grant has
            no mandate behind it, and a subscription already ending has nothing
            left to cancel. */}
        {subscription && !ending && (
          <div className="mt-5 border-t border-line pt-4">
            <CancelSubscription entitledUntil={renews} />
          </div>
        )}
      </Card>

      <Card title="Notifications" desc="Email preferences.">
        <ul className="divide-y divide-line">
          {NOTIFS.map((n) => (
            <li key={n.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-ink">{n.label}</p>
                <p className="text-xs text-ink-muted">{n.desc}</p>
              </div>
              {/* Disabled toggle — not wired to storage yet. */}
              <span aria-hidden className="relative h-5 w-9 shrink-0 rounded-full bg-line">
                <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm" />
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-ink-muted">Notification preferences are coming soon.</p>
      </Card>
    </div>
  );
}
