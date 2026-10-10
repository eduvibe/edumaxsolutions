"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ORDER_REF_CLIENT_RE,
  bravoFetch,
  isPaystackCheckoutUrl,
  readStatusToken,
  storeStatusToken,
  ApiRequestError,
} from "@/lib/bravo/client-utils";

type PlanId = "first" | "renewal";

type ResumedOrder = {
  orderRef: string;
  status: string;
  productId: string;
  plan: PlanId;
  amountNaira: number;
  email: string | null;
};

type Props = {
  productId: string;
  planId: PlanId;
  priceDisplay: string;
};

const PRODUCT_ID_CLIENT_RE = /^BCBT-[A-Z0-9]{4}(?:-[A-Z0-9]{4}){1,3}$/;
const EMAIL_CLIENT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Pay Online panel for /bravo/activate.
 *
 * Two entry points:
 *  - Direct: the buyer enters an email; we create the order and start checkout.
 *  - From the Bravo app: /bravo/activate?order=BCBT_...#t=<statusToken>. The order was already
 *    created by the app, so we resume it, confirm Product ID and plan, and ask only for email.
 *
 * Amounts are never sent from here. The server uses its own price list.
 */
export function OnlinePaymentPanel({ productId, planId, priceDisplay }: Props) {
  const [email, setEmail] = useState("");
  const [resumed, setResumed] = useState<ResumedOrder | null>(null);
  const [linkChecked, setLinkChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resume an order handed over by the Bravo app.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderRef = params.get("order");
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const linkToken = fragment.get("t");

    if (!orderRef) {
      setLinkChecked(true);
      return;
    }
    if (!ORDER_REF_CLIENT_RE.test(orderRef)) {
      setError("This payment link is not valid. Start the purchase again from Bravo CBT.");
      setLinkChecked(true);
      return;
    }

    const token = linkToken ?? readStatusToken(orderRef);
    if (linkToken) storeStatusToken(orderRef, linkToken);
    // Keep the token out of the address bar and history once it has been stored.
    if (linkToken) window.history.replaceState(null, "", `${window.location.pathname}?order=${encodeURIComponent(orderRef)}`);

    if (!token) {
      setError("Open this page from the Bravo CBT app, or from the browser where you started this payment.");
      setLinkChecked(true);
      return;
    }

    bravoFetch<ResumedOrder & { message?: string }>(`/api/bravo/orders/${encodeURIComponent(orderRef)}`, { statusToken: token })
      .then((order) => {
        if (order.status !== "pending_payment") {
          window.location.replace(`/bravo/activate/status?order=${encodeURIComponent(orderRef)}`);
          return;
        }
        setResumed(order);
        setEmail(order.email ?? "");
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiRequestError && err.status === 404
          ? "We could not find this order. Check the link from Bravo CBT and try again."
          : "We could not load this order. Please try again.");
      })
      .finally(() => setLinkChecked(true));
  }, []);

  const activeProductId = resumed?.productId ?? productId;
  const activePlan: PlanId = resumed?.plan ?? planId;
  const activePrice = resumed ? `₦${resumed.amountNaira.toLocaleString("en-NG")}` : priceDisplay;

  async function payOnline() {
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_CLIENT_RE.test(normalizedEmail)) {
      setError("Enter the email address where your activation key should be sent.");
      return;
    }
    if (!resumed && !PRODUCT_ID_CLIENT_RE.test(activeProductId.trim().toUpperCase())) {
      setError("Enter your Product ID exactly as shown in Bravo CBT (for example BCBT-XXXX-XXXX-XXXX).");
      return;
    }

    setBusy(true);
    try {
      let orderRef = resumed?.orderRef;
      let token = orderRef ? readStatusToken(orderRef) : null;

      if (!orderRef || !token) {
        const created = await bravoFetch<{ orderRef: string; statusToken: string }>("/api/bravo/orders", {
          body: { productId: activeProductId.trim().toUpperCase(), plan: activePlan, email: normalizedEmail },
        });
        orderRef = created.orderRef;
        token = created.statusToken;
        storeStatusToken(orderRef, token);
      }

      const checkout = await bravoFetch<{ authorizationUrl: string }>(
        `/api/bravo/orders/${encodeURIComponent(orderRef)}/checkout`,
        { body: { email: normalizedEmail }, statusToken: token }
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

  if (!linkChecked) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your order…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Product ID</span>
          <span className="font-mono font-semibold tracking-wider break-all text-right">{activeProductId || "—"}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Plan</span>
          <span className="font-semibold text-right">{activePlan === "first" ? "New Activation" : "Renewal"}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-bold">{activePrice}</span>
        </div>
      </div>

      {resumed && (
        <p className="text-xs text-muted-foreground">
          Your order <span className="font-mono">{resumed.orderRef}</span> was started from Bravo CBT. Confirm your email to continue to payment.
        </p>
      )}

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
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <Button size="lg" className="w-full" onClick={payOnline} disabled={busy || !linkChecked || (!resumed && !productId)}>
        {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
        {busy ? "Starting secure payment…" : `Pay ${activePrice} online`}
      </Button>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        You will be taken to Paystack to pay by card or bank transfer. Your activation key appears on the next page as soon as
        the payment is confirmed, and it is also emailed to you.
      </p>
    </div>
  );
}
