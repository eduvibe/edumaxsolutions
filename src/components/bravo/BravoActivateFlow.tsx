"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, ArrowLeft, CreditCard, Building2, MessageCircle, Mail, Info, Clock, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ApiRequestError,
  ORDER_REF_CLIENT_RE,
  bravoFetch,
  readStatusToken,
  storeStatusToken,
} from "@/lib/bravo/client-utils";
import { OnlinePaymentPanel, type ActivateOrder } from "@/components/bravo/OnlinePaymentPanel";

// Bank details. Shown only on the protected checkout page, after the order handoff has been validated.
const BANK = {
  name: "Kuda MFB",
  accountNumber: "3004434394",
  accountName: "Edumax Solutions",
};

const BANK_STEPS = [
  "Verify the beneficiary (see above), then transfer the exact amount: bank app, USSD, agent or counter.",
  "Use your Product ID as the narration or reference of the transfer.",
  "Send the receipt screenshot with your Product ID to WhatsApp +234 806 781 9642 or email edumaxsolutions.ng@gmail.com.",
  "Once we confirm the payment your activation key is sent to the same WhatsApp number or email, usually within minutes (9am to 7pm daily).",
  "Open Bravo CBT, go to Product → Activate, paste the key and press Activate. The app unlocks immediately.",
];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function BankRow({ label, value, copyable, bold }: { label: string; value: string; copyable?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium w-36 shrink-0">{label}</span>
      <span className={cn("text-sm text-foreground flex-1", bold && "font-bold")}>{value}</span>
      {copyable && <CopyButton value={value} />}
    </div>
  );
}

function Header() {
  return (
    <div className="border-b border-border bg-card">
      <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-foreground flex items-center justify-center overflow-hidden p-1.5 shrink-0">
            <Image src="/media/chtlogo.png" alt="Bravo CBT" width={36} height={36} className="object-contain invert" />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-tight text-foreground leading-none">Bravo CBT</div>
            <div className="text-xs text-muted-foreground mt-0.5">Offline exam simulator</div>
          </div>
        </div>
        <Link href="/bravo" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Bravo CBT
        </Link>
      </div>
    </div>
  );
}

/** Shown to anyone who opens the page without a valid order from the Bravo CBT app. No order data, no payment form. */
function StartFromAppView({ problem }: { problem: string | null }) {
  return (
    <div className="mx-auto max-w-xl space-y-6 py-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mb-1">Get your Bravo CBT activation key</h1>
        <p className="text-sm text-muted-foreground">
          Activation orders start inside the Bravo CBT app, so your Product ID and plan are checked before you pay.
        </p>
      </div>
      {problem && (
        <div role="alert" className="flex gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{problem}</span>
        </div>
      )}
      <ol className="space-y-3">
        {[
          "Open Bravo CBT on your device and go to Product → Activate.",
          "Choose New Activation or Renewal, then press Pay Online.",
          "Your browser opens this page with your order. Confirm the details and pay.",
          "Your key appears here and in the app automatically once payment is confirmed.",
        ].map((step, i) => (
          <li key={i} className="flex gap-3 text-sm text-foreground/75 leading-relaxed">
            <span className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center text-[11px] font-bold">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted-foreground">
        Need help? WhatsApp{" "}
        <a href="https://wa.me/2348067819642" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
          +234 806 781 9642
        </a>{" "}
        or email{" "}
        <a href="mailto:edumaxsolutions.ng@gmail.com" className="underline underline-offset-2 hover:text-foreground">
          edumaxsolutions.ng@gmail.com
        </a>
        .
      </p>
    </div>
  );
}

/** Beneficiary check the buyer should do before paying, by either method. */
function BeneficiaryCheck() {
  return (
    <div className="flex gap-3 rounded-xl border border-foreground/20 bg-foreground/[0.03] p-4 text-sm">
      <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="space-y-1.5 text-foreground/80">
        <p className="font-semibold text-foreground">Check the beneficiary before you pay</p>
        <p>
          <span className="font-medium">Bank transfer:</span> enter account number {BANK.accountNumber} ({BANK.name}) in your bank app.
          The account name must show <span className="font-semibold">{BANK.accountName}</span>. If it shows any other name, do not pay.
          Message us on WhatsApp instead.
        </p>
        <p>
          <span className="font-medium">Pay online:</span> the payment page must be at paystack.com, and the amount must match the
          order summary. Never pay through a link or account that was sent to you by someone else.
        </p>
      </div>
    </div>
  );
}

function ReadyView({ order, statusToken }: { order: ActivateOrder; statusToken: string }) {
  const planLabel = order.plan === "first" ? "New Activation" : "Renewal";
  const price = `₦${order.amountNaira.toLocaleString("en-NG")}`;
  return (
    <div className="grid lg:grid-cols-2 gap-10 xl:gap-16 items-start max-w-5xl mx-auto">
      <div className="space-y-7">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mb-1">Complete your order</h1>
          <p className="text-sm text-muted-foreground">
            Order <span className="font-mono text-foreground">{order.orderRef}</span>. Pay online with Paystack, or by bank transfer.
          </p>
        </div>

        <BeneficiaryCheck />

        <Separator />

        <Tabs defaultValue="online">
          <TabsList className="w-full grid grid-cols-2 mb-5">
            <TabsTrigger value="online" className="gap-1.5">
              <CreditCard className="h-4 w-4" />
              Pay Online
            </TabsTrigger>
            <TabsTrigger value="bank" className="gap-1.5">
              <Building2 className="h-4 w-4" />
              Bank Transfer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="online" className="space-y-4">
            <OnlinePaymentPanel order={order} statusToken={statusToken} />
          </TabsContent>

          <TabsContent value="bank" className="space-y-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-2 bg-muted/50 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transfer to</span>
              </div>
              <div className="px-4">
                <BankRow label="Bank" value={BANK.name} bold />
                <BankRow label="Account Number" value={BANK.accountNumber} copyable bold />
                <BankRow label="Account Name" value={BANK.accountName} bold />
                <BankRow label="Amount" value={price} bold />
                <BankRow label="Narration" value={order.productId} copyable bold />
              </div>
            </div>

            <ol className="space-y-3">
              {BANK_STEPS.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-foreground/75 leading-relaxed">
                  <span className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center text-[11px] font-bold">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <a
              href="https://wa.me/2348067819642"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-foreground/25 text-foreground bg-transparent hover:bg-foreground/5 px-4 py-3 text-sm font-medium transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              I&apos;ve completed the transfer — WhatsApp us
            </a>

            <div className="flex gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Keys are sent within minutes of confirmation —{" "}
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  9am – 7pm daily
                </span>
                .
              </span>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-6 lg:sticky lg:top-28">
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Order Summary</p>
            <p className="text-xl font-extrabold text-foreground">
              {planLabel} — {price}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Product ID <span className="font-mono text-foreground">{order.productId}</span>
            </p>
          </div>
          <div className="px-6 py-4 bg-foreground/[0.03] border-t border-border flex justify-between items-center">
            <span className="text-base font-bold text-foreground">Due today</span>
            <span className="text-2xl font-extrabold text-foreground">{price}</span>
          </div>
          <div className="px-6 pb-6 pt-3">
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Keys are issued only after payment is confirmed. The app activates automatically once your key is ready.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <a
            href="https://wa.me/2348067819642"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-muted px-4 py-3 text-sm font-medium text-foreground transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
          <a
            href="mailto:edumaxsolutions.ng@gmail.com"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-muted px-4 py-3 text-sm font-medium text-foreground transition-colors"
          >
            <Mail className="h-4 w-4" />
            Email
          </a>
        </div>
      </div>
    </div>
  );
}

type Phase = { kind: "loading" } | { kind: "start"; problem: string | null } | { kind: "ready"; order: ActivateOrder; statusToken: string };

/**
 * Protected checkout. The only way into the order views is a server-validated order reference and token from the Bravo CBT app
 * (token in the URL fragment, then this tab's sessionStorage). Every order view comes from GET /api/bravo/orders/{ref} with the token.
 */
export function BravoActivateFlow() {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderRef = params.get("order");
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const linkToken = fragment.get("t");

    if (!orderRef) {
      setPhase({ kind: "start", problem: null });
      return;
    }
    if (!ORDER_REF_CLIENT_RE.test(orderRef)) {
      setPhase({ kind: "start", problem: "This payment link is not valid. Start the purchase again from Bravo CBT." });
      return;
    }

    const token = linkToken ?? readStatusToken(orderRef);
    if (linkToken) {
      storeStatusToken(orderRef, linkToken);
      // Keep the token out of the address bar and browser history.
      window.history.replaceState(null, "", `${window.location.pathname}?order=${encodeURIComponent(orderRef)}`);
    }
    if (!token) {
      setPhase({
        kind: "start",
        problem: "Open this page from the Bravo CBT app, or from the same browser where you started this payment.",
      });
      return;
    }

    let cancelled = false;
    bravoFetch<ActivateOrder>(`/api/bravo/orders/${encodeURIComponent(orderRef)}`, { statusToken: token })
      .then((order) => {
        if (cancelled) return;
        if (order.status !== "pending_payment") {
          window.location.replace(`/bravo/activate/status?order=${encodeURIComponent(orderRef)}`);
          return;
        }
        setPhase({ kind: "ready", order, statusToken: token });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPhase({
          kind: "start",
          problem:
            err instanceof ApiRequestError && err.status === 404
              ? "We could not find this order for this browser. Check the link from Bravo CBT and try again."
              : "We could not load this order. Please try again from Bravo CBT.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 md:px-6 py-10 md:py-14">
        {phase.kind === "loading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your order…
          </div>
        )}
        {phase.kind === "start" && <StartFromAppView problem={phase.problem} />}
        {phase.kind === "ready" && <ReadyView order={phase.order} statusToken={phase.statusToken} />}
      </div>
    </div>
  );
}
