import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BravoActivateFlow } from "@/components/bravo/BravoActivateFlow";

// Protected checkout. The page shows nothing about an order until the browser presents a valid,
// server-issued order reference and token from the Bravo CBT app. Keep it out of search results.
export const metadata: Metadata = {
  title: "Bravo CBT | EduMax Solutions",
  robots: { index: false, follow: false, nocache: true },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function BravoActivatePage({ searchParams }: PageProps) {
  const params = await searchParams;
  // Visits without an app order handoff go to the public page. The app always sends ?order=...
  if (typeof params.order !== "string" || params.order.length === 0) {
    redirect("/bravo");
  }
  return <BravoActivateFlow />;
}
