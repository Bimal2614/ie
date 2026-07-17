import type { Metadata } from "next";
import { HistoryView } from "@/components/history/history-view";

export const metadata: Metadata = { title: "History · IELTSAce", robots: { index: false } };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  // The day shown depends on the viewer's timezone, which only the browser
  // knows — so the client picks the initial date and asks the server for it.
  return <HistoryView initialDate={typeof date === "string" ? date : null} />;
}
