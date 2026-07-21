import type { Metadata } from "next";
import Link from "next/link";
import { Mail, LifeBuoy, BookOpen, Clock } from "lucide-react";
import { MarketingShell, PageHead } from "@/components/marketing/marketing-shell";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contact IELTSAce — Support & Enquiries",
  description: "Get in touch with the IELTSAce team for support, billing questions, or feedback. We typically reply within one business day.",
  alternates: { canonical: "/contact" },
};

const SUPPORT_EMAIL = "support@ieltsace.com";

const CHANNELS = [
  { Icon: Mail, title: "Email us", body: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  { Icon: Clock, title: "Response time", body: "Within 1 business day" },
  { Icon: LifeBuoy, title: "Account & billing", body: "Include your account email so we can help faster." },
  { Icon: BookOpen, title: "Quick answers", body: "Check the study materials & FAQ first.", href: "/resources" },
];

export default function ContactPage() {
  return (
    <MarketingShell>
      <PageHead
        eyebrow="Contact"
        title="We're here to help."
        lead="Questions about practice, mock tests, billing, or feedback on the platform — send us a message and we'll get back to you, usually within one business day."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Form */}
        <div className="rounded-2xl border border-line bg-paper-elev p-6 sm:p-7">
          <h2 className="text-lg font-semibold text-ink">Send a message</h2>
          <p className="mt-1 text-sm text-ink-muted">This opens a pre-filled email in your mail app.</p>
          <div className="mt-5">
            <ContactForm to={SUPPORT_EMAIL} />
          </div>
        </div>

        {/* Channels */}
        <div className="space-y-4">
          {CHANNELS.map((c) => {
            const inner = (
              <div className="flex gap-3 rounded-2xl border border-line bg-paper-elev p-5 transition-colors hover:bg-paper-sunken">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper-sunken text-ink-soft"><c.Icon className="size-5" /></span>
                <div>
                  <p className="text-sm font-semibold text-ink">{c.title}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">{c.body}</p>
                </div>
              </div>
            );
            return c.href ? (
              <Link key={c.title} href={c.href} className="block">{inner}</Link>
            ) : (
              <div key={c.title}>{inner}</div>
            );
          })}
        </div>
      </div>
    </MarketingShell>
  );
}
