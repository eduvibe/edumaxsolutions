"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Mail, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ORDER_REF_CLIENT_RE,
  ApiRequestError,
  bravoFetch,
  readStatusToken,
  storeStatusToken,
} from "@/lib/bravo/client-utils";

type OrderStatus = {
  orderRef: string;
  status: "pending_payment" | "paid" | "fulfilled" | "needs_review";
  productId: string;
  plan: "first" | "renewal";
  amountNaira: number;
  email: string | null;
  emailSent: boolean;
  activationKey: string | null;
  message: string;
};

const POLL_MS = 4000;
const MAX_POLL_MS = 15 * 60 * 1000;

export function OrderStatusView() {
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const startedAt = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("order");
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const linkToken = fragment.get("t");

    if (!ref || !ORDER_REF_CLIENT_RE.test(ref)) {
      setProblem("This status link is missing an order reference. Open the link from Bravo CBT or from your payment page.");
      return;
    }
    if (linkToken) {
      storeStatusToken(ref, linkToken);
      window.history.replaceState(null, "", `${window.location.pathname}?order=${encodeURIComponent(ref)}`);
    }
    setOrderRef(ref);
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (!orderRef) return;
    const token = readStatusToken(orderRef);
    if (!token) {
      setProblem("Open this page in the same browser where you started the payment, or use the status link from Bravo CBT.");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const next = await bravoFetch<OrderStatus>(`/api/bravo/orders/${encodeURIComponent(orderRef)}`, { statusToken: token });
        if (cancelled) return;
        setOrder(next);
        setProblem(null);
        if (next.status === "fulfilled" || next.status === "needs_review") return;
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiRequestError && err.status === 404) {
          setProblem("We could not find this order for this browser. Use the status link from Bravo CBT.");
          return;
        }
        if (err instanceof ApiRequestError && err.status === 429) {
          // Back off on rate limits instead of stopping.
        } else {
          setProblem("We could not reach the server just now. We will keep trying.");
        }
      }
      if (Date.now() - startedAt.current > MAX_POLL_MS) {
        setTimedOut(true);
        return;
      }
      timer = setTimeout(poll, POLL_MS);
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderRef]);

  async function copyKey() {
    if (!order?.activationKey) return;
    await navigator.clipboard.writeText(order.activationKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mb-1">Payment status</h1>
          {orderRef && (
            <p className="text-sm text-muted-foreground">
              Order reference <span className="font-mono text-foreground">{orderRef}</span>
            </p>
          )}
        </div>

        {problem && (
          <div role="alert" className="flex gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{problem}</span>
          </div>
        )}

        {!problem && !order && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your payment…
          </div>
        )}

        {order && order.status === "pending_payment" && (
          <div className="flex gap-3 rounded-xl border border-border bg-card p-4 text-sm">
            <Clock className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Waiting for payment confirmation</p>
              <p className="text-muted-foreground">If you have just paid, this page updates automatically. Do not pay twice.</p>
            </div>
          </div>
        )}

        {order && order.status === "paid" && (
          <div className="flex gap-3 rounded-xl border border-border bg-card p-4 text-sm">
            <Loader2 className="h-4 w-4 shrink-0 mt-0.5 animate-spin" />
            <div>
              <p className="font-medium text-foreground">Payment received</p>
              <p className="text-muted-foreground">Your activation key is being prepared. This usually takes a few seconds.</p>
            </div>
          </div>
        )}

        {order && order.status === "needs_review" && (
          <div className="flex gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">We are checking this payment</p>
              <p className="text-muted-foreground">
                Your payment needs a manual check before a key can be issued. Contact EduMax Solutions with your order reference
                above and we will resolve it.
              </p>
            </div>
          </div>
        )}

        {order && order.status === "fulfilled" && order.activationKey && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Your activation key</p>
              <p className="text-sm text-muted-foreground">
                Product ID <span className="font-mono text-foreground">{order.productId}</span>
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4 font-mono text-sm break-all select-all">{order.activationKey}</div>
            <Button onClick={copyKey} variant="outline" className="w-full">
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied" : "Copy key"}
            </Button>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
              <li>Open Bravo CBT and go to Product → Activate.</li>
              <li>Paste the key and press Activate. The app unlocks immediately.</li>
            </ol>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {order.emailSent && order.email
                ? `A copy was sent to ${order.email}.`
                : "We could not send an email copy. Keep this key somewhere safe."}
            </p>
          </div>
        )}

        {timedOut && order?.status === "pending_payment" && (
          <p className="text-sm text-muted-foreground">
            Still waiting for payment. Refresh this page later, or contact EduMax Solutions with your order reference.
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-2 text-sm">
          <Link href="/bravo/activate" className="underline underline-offset-2 text-muted-foreground hover:text-foreground">
            Back to activation
          </Link>
        </div>
      </div>
    </div>
  );
}
