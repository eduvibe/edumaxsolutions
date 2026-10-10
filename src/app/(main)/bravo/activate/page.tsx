"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Copy, Check, ArrowLeft, CreditCard, Building2,
  MessageCircle, Mail, Info, Clock, Loader2, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Plans ────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "first",
    kind: "new",
    label: "New Activation",
    price: 4000,
    priceDisplay: "₦4,000",
    description: "First time on this device — unlocks all questions and features.",
    includes: [
      "All past questions (JAMB & WAEC)",
      "Mock exams, practice mode and analytics",
      "Wrong-answer notebook",
    ],
  },
  {
    id: "renewal",
    kind: "renewal",
    label: "Renewal",
    price: 3000,
    priceDisplay: "₦3,000",
    description: "Already have Bravo CBT — renew to the latest edition, or install on another household device.",
    includes: [
      "Updated question bank",
      "All features continue",
      "History and notebook kept",
    ],
  },
] as const;

type PlanId = (typeof PLANS)[number]["id"];

// ─── Bank details ─────────────────────────────────────────────────────────────

const BANK = {
  name: "Kuda MFB",
  accountNumber: "3004434394",
  accountName: "Edumax Solutions",
};

const STEPS = [
  "Transfer the exact amount to the account above — bank app, USSD, agent or counter.",
  "Use your Product ID as the narration or reference of the transfer.",
  "Send the receipt screenshot with your Product ID to WhatsApp +234 806 781 9642 or email edumaxsolutions.ng@gmail.com.",
  "Once we confirm the payment your activation key is sent to the same WhatsApp number or email, usually within minutes (9am to 7pm daily).",
  "Open Bravo CBT, go to Product → Activate, paste the key and press Activate. The app unlocks immediately.",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted",
        className
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function BankRow({ label, value, copyable, bold }: {
  label: string; value: string; copyable?: boolean; bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium w-36 shrink-0">
        {label}
      </span>
      <span className={cn("text-sm text-foreground flex-1", bold && "font-bold")}>
        {value}
      </span>
      {copyable && <CopyButton value={value} />}
    </div>
  );
}

// ─── Key-ready panel (shown after successful payment) ─────────────────────────

function KeyReadyPanel({ activationKey, email }: { activationKey: string; email: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Green-ish header — monochrome success state */}
      <div className="px-6 py-5 bg-foreground border-b border-border flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-background shrink-0" />
        <div>
          <p className="text-sm font-bold text-background leading-none">Payment confirmed</p>
          <p className="text-xs text-background/60 mt-0.5">
            Key also sent to {email}
          </p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 block">
            Your Activation Key
          </Label>
          <div className="flex gap-2 items-start">
            <code className="flex-1 rounded-lg bg-muted border border-border px-4 py-3 text-sm font-mono break-all leading-relaxed text-foreground">
              {activationKey}
            </code>
          </div>
          <div className="mt-2 flex gap-2">
            <CopyButton value={activationKey} className="flex-1 justify-center" />
          </div>
        </div>

        <Separator />

        <div className="space-y-2 text-sm text-foreground/75">
          <p className="font-semibold text-foreground">To activate:</p>
          <ol className="space-y-1.5 list-none">
            {[
              "Open Bravo CBT on your device.",
              "Go to Product → Activate.",
              "Paste the key above and press Activate.",
              "The app unlocks immediately — no internet needed.",
            ].map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BravoActivatePage() {
  const searchParams = useSearchParams();
  const returnedOrderId = searchParams.get("order");

  const [selectedPlan, setSelectedPlan] = useState<PlanId>("first");
  const [productId, setProductId] = useState("");
  const [email, setEmail] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");

  // Polling state — used when buyer returns from Paystack
  const [pollingOrderId, setPollingOrderId] = useState<string | null>(returnedOrderId);
  const [pollStatus, setPollStatus] = useState<"polling" | "paid" | "failed" | null>(
    returnedOrderId ? "polling" : null
  );
  const [activationKey, setActivationKey] = useState("");
  const [activationEmail, setActivationEmail] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const plan = PLANS.find((p) => p.id === selectedPlan)!;

  // ── Polling logic ────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback((orderId: string) => {
    stopPolling();
    let attempts = 0;
    const MAX = 40; // ~2 minutes at 3s intervals

    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/bravo/orders?orderId=${orderId}`);
        if (!res.ok) { stopPolling(); setPollStatus("failed"); return; }
        const data = await res.json() as {
          status: string; activationKey?: string;
        };
        if (data.status === "paid" && data.activationKey) {
          stopPolling();
          setActivationKey(data.activationKey);
          setPollStatus("paid");
        } else if (data.status === "failed" || attempts >= MAX) {
          stopPolling();
          setPollStatus("failed");
        }
      } catch {
        if (attempts >= MAX) { stopPolling(); setPollStatus("failed"); }
      }
    }, 3000);
  }, [stopPolling]);

  useEffect(() => {
    if (returnedOrderId) {
      setPollingOrderId(returnedOrderId);
      setPollStatus("polling");
      startPolling(returnedOrderId);
    }
    return stopPolling;
  }, [returnedOrderId, startPolling, stopPolling]);

  // ── Pay Online handler ────────────────────────────────────────────────────────

  async function handlePayOnline() {
    setPayError("");

    if (!productId.trim()) {
      setPayError("Enter your Product ID — find it in Bravo CBT under Product → Activate.");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setPayError("Enter a valid email address — your activation key will be sent there.");
      return;
    }

    setPayLoading(true);
    try {
      const res = await fetch("/api/bravo/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: productId.trim().toUpperCase(),
          kind: plan.kind,
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json() as {
        orderId?: string; authorizationUrl?: string; error?: string;
      };

      if (!res.ok || !data.authorizationUrl) {
        setPayError(data.error ?? "Something went wrong. Try again or use bank transfer.");
        setPayLoading(false);
        return;
      }

      // Store email for the key-ready panel (returned after redirect)
      sessionStorage.setItem(`bravo_email_${data.orderId}`, email.trim().toLowerCase());

      // Redirect to Paystack hosted checkout
      window.location.href = data.authorizationUrl;
    } catch {
      setPayError("Network error. Check your connection and try again.");
      setPayLoading(false);
    }
  }

  // Restore email from sessionStorage after Paystack redirect
  useEffect(() => {
    if (returnedOrderId) {
      const stored = sessionStorage.getItem(`bravo_email_${returnedOrderId}`);
      if (stored) setActivationEmail(stored);
    }
  }, [returnedOrderId]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">

      {/* Page header */}
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

      <div className="container mx-auto px-4 md:px-6 py-10 md:py-14">
        <div className="grid lg:grid-cols-2 gap-10 xl:gap-16 items-start max-w-5xl mx-auto">

          {/* ── LEFT — form ── */}
          <div className="space-y-7">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mb-1">
                Get Bravo CBT
              </h1>
              <p className="text-sm text-muted-foreground">
                Choose a plan, pay online or by bank transfer, and receive your activation key.
              </p>
            </div>

            {/* Plan selector */}
            <div className="space-y-2.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Select plan
              </Label>
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition-all duration-150 flex items-start justify-between gap-4",
                    selectedPlan === p.id
                      ? "border-foreground bg-foreground shadow-md"
                      : "border-border bg-card hover:border-foreground/35"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-sm font-bold leading-none mb-1",
                      selectedPlan === p.id ? "text-background" : "text-foreground")}>
                      {p.label}
                    </div>
                    <div className={cn("text-xs leading-snug",
                      selectedPlan === p.id ? "text-background/60" : "text-muted-foreground")}>
                      {p.description}
                    </div>
                  </div>
                  <div className={cn("text-lg font-extrabold tabular-nums shrink-0",
                    selectedPlan === p.id ? "text-background" : "text-foreground")}>
                    {p.priceDisplay}
                  </div>
                </button>
              ))}
            </div>

            {/* Product ID */}
            <div className="space-y-2">
              <Label htmlFor="product-id" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Your Product ID
              </Label>
              <div className="flex gap-2">
                <Input
                  id="product-id"
                  placeholder="e.g. BCBT-YDR9-G5WQ-0860"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value.toUpperCase())}
                  className="font-mono tracking-widest text-sm"
                  spellCheck={false}
                />
                {productId && <CopyButton value={productId} />}
              </div>
              <p className="text-xs text-muted-foreground">
                Open Bravo CBT → <strong>Product → Activate</strong> to find your ID.
              </p>
            </div>

            <Separator />

            {/* Payment tabs */}
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Payment method
              </Label>
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

                {/* ── Online tab ── */}
                <TabsContent value="online" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-sm"
                      spellCheck={false}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your activation key will be sent here after payment.
                    </p>
                  </div>

                  {payError && (
                    <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                      <Info className="h-4 w-4 shrink-0 mt-0.5" />
                      {payError}
                    </div>
                  )}

                  <Button
                    size="lg"
                    className="w-full bg-foreground hover:bg-foreground/85 text-background font-semibold"
                    onClick={handlePayOnline}
                    disabled={payLoading}
                  >
                    {payLoading
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redirecting to Paystack…</>
                      : <><CreditCard className="h-4 w-4 mr-2" />Pay {plan.priceDisplay} with Card or Transfer</>
                    }
                  </Button>

                  <div className="flex gap-3 rounded-xl border border-border bg-muted/30 p-3.5 text-xs text-muted-foreground">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Secured by <strong className="text-foreground">Paystack</strong> — pay with card,
                      bank transfer, or USSD. You&apos;ll be redirected back here with your key once payment clears.
                    </span>
                  </div>
                </TabsContent>

                {/* ── Bank Transfer tab ── */}
                <TabsContent value="bank" className="space-y-4">
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2 bg-muted/50 border-b border-border">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transfer to</span>
                    </div>
                    <div className="px-4">
                      <BankRow label="Bank" value={BANK.name} bold />
                      <BankRow label="Account Number" value={BANK.accountNumber} copyable bold />
                      <BankRow label="Account Name" value={BANK.accountName} bold />
                      <BankRow label="Amount" value={plan.priceDisplay} bold />
                      {productId && <BankRow label="Narration" value={productId} copyable bold />}
                    </div>
                  </div>

                  <ol className="space-y-3">
                    {STEPS.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-foreground/75 leading-relaxed">
                        <span className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center text-[11px] font-bold">
                          {i + 1}
                        </span>
                        <span dangerouslySetInnerHTML={{
                          __html: step
                            .replace("+234 806 781 9642",
                              '<a href="https://wa.me/2348067819642" class="underline underline-offset-2 hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">+234 806 781 9642</a>')
                            .replace("edumaxsolutions.ng@gmail.com",
                              '<a href="mailto:edumaxsolutions.ng@gmail.com" class="underline underline-offset-2 hover:text-foreground transition-colors">edumaxsolutions.ng@gmail.com</a>'),
                        }} />
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
                        <Clock className="h-3.5 w-3.5" />9am – 7pm daily
                      </span>.
                    </span>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* ── RIGHT — order summary / polling / key ── */}
          <div className="space-y-6 lg:sticky lg:top-28">

            {/* Polling state */}
            {pollStatus === "polling" && (
              <div className="rounded-2xl border border-border bg-card p-8 flex flex-col items-center gap-4 text-center shadow-sm">
                <Loader2 className="h-8 w-8 animate-spin text-foreground/40" />
                <div>
                  <p className="font-semibold text-foreground">Waiting for payment confirmation</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This updates automatically — usually within seconds.
                  </p>
                </div>
              </div>
            )}

            {/* Key ready */}
            {pollStatus === "paid" && (
              <KeyReadyPanel
                activationKey={activationKey}
                email={activationEmail}
              />
            )}

            {/* Poll failed */}
            {pollStatus === "failed" && (
              <div className="rounded-2xl border border-border bg-card p-6 space-y-3 shadow-sm">
                <p className="font-semibold text-foreground">Payment not confirmed yet</p>
                <p className="text-sm text-muted-foreground">
                  If you completed payment, your key will be sent to your email shortly.
                  Contact us if it doesn&apos;t arrive within 10 minutes.
                </p>
                <a
                  href="https://wa.me/2348067819642"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-foreground underline underline-offset-4"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp us
                </a>
              </div>
            )}

            {/* Default order summary — hidden while polling or paid */}
            {!pollStatus && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Order Summary</p>
                  <p className="text-xl font-extrabold text-foreground">{plan.label} — {plan.priceDisplay}</p>
                </div>

                <div className="px-6 py-4 space-y-3">
                  {plan.includes.map((item) => (
                    <div key={item} className="flex items-center justify-between text-sm gap-3">
                      <span className="text-foreground/75">{item}</span>
                      <span className="text-xs font-semibold text-foreground border border-foreground/15 rounded-full px-2 py-0.5 shrink-0">
                        Included
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="px-6 py-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{plan.priceDisplay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium">₦0</span>
                  </div>
                </div>

                <div className="px-6 py-4 bg-foreground/[0.03] border-t border-border flex justify-between items-center">
                  <span className="text-base font-bold text-foreground">Due today</span>
                  <span className="text-2xl font-extrabold text-foreground">{plan.priceDisplay}</span>
                </div>
              </div>
            )}

            {/* Support — always visible */}
            <div className="grid grid-cols-2 gap-3">
              <a href="https://wa.me/2348067819642" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-muted px-4 py-3 text-sm font-medium text-foreground transition-colors">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              <a href="mailto:edumaxsolutions.ng@gmail.com"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-muted px-4 py-3 text-sm font-medium text-foreground transition-colors">
                <Mail className="h-4 w-4" />
                Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
