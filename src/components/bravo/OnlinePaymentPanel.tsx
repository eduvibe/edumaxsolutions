"use client";

import { useState } from "react";
import { CreditCard, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bravoFetch, isPaystackCheckoutUrl } from "@/lib/bravo/client-utils";

/** Order fields the protected checkout page is allowed to show. Never contains the full email. */
export type ActivateOrder = {
  orderRef: string;
  status: "pending_payment" | "paid" | "fulfilled" | "needs_review";
  productId: string;
  plan: "first" | "renewal";
  amountNaira: number;
  /** Masked address, for display only. */
  email: string | null;
  /** True when the server already holds an email for this order (from the Bravo app or typed earlier). */
  emailOnFile: boolean;
  /** True when the 30-minute checkout-start window closed before Paystack was started. */
  checkoutExpired: boolean;
};

type Props = {
  order: ActivateOrder;
  statusToken: string;
};

const EMAIL_CLIENT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Pay Online for a validated order handed over from the Bravo app.
 *  - With a saved email (emailOnFile) the browser sends nothing but the token. The server uses the stored address.
 *  - Without one, the buyer enters an email once, and the server stores it before Paystack starts.
 * The amount, edition and plan are never sent from here. The server computes them.
 */
export function OnlinePaymentPanel({ order, statusToken }: Props) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = `₦${order.amountNaira.toLocaleString("en-NG")}`;
  const planLabel = order.plan === "first" ? "New Activation" : "Renewal";

  async function payOnline() {
    setError(null);
    let body: { email?: string } = {};
    if (!order.emailOnFile) {
      const normalized = email.trim().toLowerCase();
      if (!EMAIL_CLIENT_RE.test(normalized)) {
        setError("Enter the email address where your activation key should be sent.");
        return;
      }
      body = { email: normalized };
    }

    setBusy(true);
    try {
      const checkout = await bravoFetch<{ authorizationUrl: string }>(
        `/api/bravo/orders/${encodeURIComponent(order.orderRef)}/checkout`,
        { body, statusToken }
      );
      if (!isPaystackCheckoutUrl(checkout.authorizationUrl)) {
        throw new Error("Unexpected payment link. Please try again.");
      }
      window.location.assign(checkout.authorizationUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment. Please try again.");
      setBusy(false);
    }
  }

  if (order.checkoutExpired) {
    return (
      <div role="alert" className="flex gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Checkout can only be started within 30 minutes of the order being created, and this order is now past that limit. Go back
          to Bravo CBT and choose Pay Online again to start a new order. If you already started a payment on Paystack from this order,
          that payment is still processed and your key will be issued. Bank transfer details are still available below.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Product ID</span>
          <span className="font-mono font-semibold tracking-wider break-all text-right">{order.productId}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Plan</span>
          <span className="font-semibold text-right">{planLabel}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-bold">{price}</span>
        </div>
        {order.emailOnFile && order.email && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Key emailed to</span>
            <span className="font-mono text-right">{order.email}</span>
          </div>
        )}
      </div>

      {!order.emailOnFile && (
        <div className="space-y-2">
          <Label htmlFor="pay-email" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Email for your activation key
          </Label>
          <Input
            id="pay-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
          <p className="text-xs text-muted-foreground">Your Bravo CBT order has no email yet. Enter one to continue to payment.</p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <Button size="lg" className="w-full" onClick={payOnline} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
        {busy ? "Starting secure payment…" : `Pay ${price} online`}
      </Button>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        You will be taken to Paystack to pay by card or bank transfer. Confirm the page is hosted at paystack.com before you enter
        payment details. Your activation key appears on the next page as soon as the payment is confirmed, and it is also emailed to you.
      </p>
    </div>
  );
}
