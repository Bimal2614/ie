import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowRight } from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { cardClass } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { ProfileForm, PasswordForm, DangerZone } from "@/components/settings/settings-forms";

export const metadata: Metadata = { title: "Settings · IELTSAce", robots: { index: false } };

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
  { label: "Product updates", desc: "Occasional news — no spam." },
];

export default async function SettingsPage() {
  const authed = await requireUser();
  const [u] = await db
    .select({
      name: users.name,
      email: users.email,
      country: users.country,
      targetModule: users.targetModule,
      targetBand: users.targetBand,
      examDate: users.examDate,
    })
    .from(users)
    .where(eq(users.id, authed.id))
    .limit(1);

  const examDate = u?.examDate ? u.examDate.toISOString().slice(0, 10) : "";

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
            <p className="font-medium text-ink">Free plan</p>
            <p className="text-sm text-ink-muted">Upgrade for unlimited AI band scoring and mock tests.</p>
          </div>
          <Link href="/pricing" className="inline-flex items-center gap-2 rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105">
            View plans <ArrowRight className="size-4" />
          </Link>
        </div>
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

      <Card title="Danger zone" desc="Permanent and irreversible.">
        <DangerZone />
      </Card>
    </div>
  );
}
