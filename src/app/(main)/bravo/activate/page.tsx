"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Copy,
  Check,
  ArrowLeft,
  CreditCard,
  Building2,
  MessageCircle,
  Mail,
  Info,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OnlinePaymentPanel } from "@/components/bravo/OnlinePaymentPanel";

// ─── Plans — matches data/store-config.json priceNaira / renewalPriceNaira ────

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
    description: "Already have Bravo CBT — renew to the latest edition or install on another device in the same household.",
    includes: [
      "Updated question bank",
      "All features continue",
      "History and notebook kept",
    ],
  },
] as const;

type PlanId = (typeof PLANS)[number]["id"];

// ─── Bank details ──────────────────────────────────────────────────────────────

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

function BankRow({
  label,
  value,
  copyable,
  bold,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  bold?: boolean;
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BravoActivatePage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("first");
  const [productId, setProductId] = useState("");

  // Deep links from the Bravo app: /bravo/activate?productId=...&plan=first|renewal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get("productId");
    if (pid) setProductId(pid.trim().toUpperCase());
    const plan = params.get("plan");
    if (plan === "first" || plan === "renewal") setSelectedPlan(plan);
  }, []);

  const plan = PLANS.find((p) => p.id === selectedPlan)!;

  return (
    <div className="min-h-screen bg-background">

      {/* ── Page header ── */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-foreground flex items-center justify-center overflow-hidden p-1.5 shrink-0">
              <Image
                src="/media/chtlogo.png"
                alt="Bravo CBT"
                width={36}
                height={36}
                className="object-contain invert"
              />
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-tight text-foreground leading-none">
                Bravo CBT
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Offline exam simulator</div>
            </div>
          </div>
          <Link
            href="/bravo"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Bravo CBT
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-10 md:py-14">
        <div className="grid lg:grid-cols-2 gap-10 xl:gap-16 items-start max-w-5xl mx-auto">

          {/* ── LEFT — plan selector + payment ── */}
          <div className="space-y-7">

            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mb-1">
                Get Bravo CBT
              </h1>
              <p className="text-sm text-muted-foreground">
                Choose the plan that applies to you, pay online with Paystack or by bank transfer, and receive your activation key.
              </p>
            </div>

            {/* Plan selector — 3 options stacked for clarity */}
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
                    <div className={cn(
                      "text-sm font-bold leading-none mb-1",
                      selectedPlan === p.id ? "text-background" : "text-foreground"
                    )}>
                      {p.label}
                    </div>
                    <div className={cn(
                      "text-xs leading-snug",
                      selectedPlan === p.id ? "text-background/60" : "text-muted-foreground"
                    )}>
                      {p.description}
                    </div>
                  </div>
                  <div className={cn(
                    "text-lg font-extrabold tabular-nums shrink-0",
                    selectedPlan === p.id ? "text-background" : "text-foreground"
                  )}>
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
                Open Bravo CBT → <strong>Product → Activate</strong> to find your ID. Use it as the bank transfer narration.
              </p>
            </div>

            <Separator />

            {/* Payment tabs */}
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Payment method
              </Label>
              <Tabs defaultValue="bank">
                <TabsList className="w-full grid grid-cols-2 mb-5">
                  <TabsTrigger value="bank" className="gap-1.5">
                    <Building2 className="h-4 w-4" />
                    Bank Transfer
                  </TabsTrigger>
                  <TabsTrigger value="online" className="gap-1.5">
                    <CreditCard className="h-4 w-4" />
                    Pay Online
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="online" className="space-y-4">
                  <OnlinePaymentPanel productId={productId} planId={selectedPlan} priceDisplay={plan.priceDisplay} />
                </TabsContent>

                <TabsContent value="bank" className="space-y-4">

                  {/* Bank detail block */}
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2 bg-muted/50 border-b border-border">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Transfer to
                      </span>
                    </div>
                    <div className="px-4">
                      <BankRow label="Bank" value={BANK.name} bold />
                      <BankRow label="Account Number" value={BANK.accountNumber} copyable bold />
                      <BankRow label="Account Name" value={BANK.accountName} bold />
                      <BankRow label="Amount" value={plan.priceDisplay} bold />
                      {productId && (
                        <BankRow label="Narration" value={productId} copyable bold />
                      )}
                    </div>
                  </div>

                  {/* Steps */}
                  <ol className="space-y-3">
                    {STEPS.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-foreground/75 leading-relaxed">
                        <span className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center text-[11px] font-bold">
                          {i + 1}
                        </span>
                        <span
                          dangerouslySetInnerHTML={{
                            __html: step
                              .replace(
                                "+234 806 781 9642",
                                '<a href="https://wa.me/2348067819642" class="underline underline-offset-2 hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">+234 806 781 9642</a>'
                              )
                              .replace(
                                "edumaxsolutions.ng@gmail.com",
                                '<a href="mailto:edumaxsolutions.ng@gmail.com" class="underline underline-offset-2 hover:text-foreground transition-colors">edumaxsolutions.ng@gmail.com</a>'
                              ),
                          }}
                        />
                      </li>
                    ))}
                  </ol>

                  {/* WhatsApp confirm */}
                  <a
                    href="https://wa.me/2348067819642"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-xl border border-foreground/25 text-foreground bg-transparent hover:bg-foreground/5 px-4 py-3 text-sm font-medium transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    I&apos;ve completed the transfer — WhatsApp us
                  </a>

                  {/* Notice */}
                  <div className="flex gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Prefer to pay by bank transfer? Keys are sent within minutes of confirmation —{" "}
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
          </div>

          {/* ── RIGHT — order summary + activation key ── */}
          <div className="space-y-6 lg:sticky lg:top-28">

            {/* Order summary */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Order Summary
                </p>
                <p className="text-xl font-extrabold text-foreground">
                  {plan.label} — {plan.priceDisplay}
                </p>
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

              <div className="px-6 pb-6 pt-3 space-y-2.5">
                <p className="text-center text-xs text-muted-foreground">
                  Pay online with card or bank transfer (Paystack), or use bank transfer on the left. Keys are issued only after payment is confirmed.
                </p>
              </div>
            </div>

            {/* Support */}
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
      </div>
    </div>
  );
}
