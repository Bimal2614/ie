import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LegalDocView } from "@/components/marketing/legal-doc";
import { REFUNDS } from "@/lib/legal-content";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Refund Policy for IELTSVega Subscriptions",
  description: "A full refund within 7 days of your first payment if you have barely used the plan: what qualifies, what does not, and how to request one.",
  path: "/refunds",
});

export default function RefundsPage() {
  return (
    <MarketingShell>
      <LegalDocView doc={REFUNDS} />
    </MarketingShell>
  );
}
