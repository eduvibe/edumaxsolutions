import type { Metadata } from "next";
import { OrderStatusView } from "@/components/bravo/OrderStatusView";

export const metadata: Metadata = {
  title: "Payment status | Bravo CBT",
  robots: { index: false, follow: false },
};

export default function BravoActivateStatusPage() {
  return <OrderStatusView />;
}
