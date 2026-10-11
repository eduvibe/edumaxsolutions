import type { Metadata } from "next";
import { BravoActivateFlow } from "@/components/bravo/BravoActivateFlow";

// Protected checkout. The page shows nothing about an order until the browser presents a valid,
// server-issued order reference and token from the Bravo CBT app. Keep it out of search results.
export const metadata: Metadata = {
  title: "Get Bravo CBT | EduMax Solutions",
  robots: { index: false, follow: false, nocache: true },
};

export default function BravoActivatePage() {
  return <BravoActivateFlow />;
}
