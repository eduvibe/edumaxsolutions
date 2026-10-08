"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Copy,
  Check,
  ArrowLeft,
  WifiOff,
  CreditCard,
  Building2,
  MessageCircle,
  Mail,
  Info,
  ChevronRight,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "first",
    label: "First Activation",
    price: 4000,
    priceDisplay: "₦4,000",
    description: "New device — unlock all questions and features for the first time.",
    includes: [
      "Questions 2015 to 2026",
      "JAMB and WAEC simulation",
      "Scores, analysis and notebook",
    ],
  },
  {
    id: "renewal",
    label: "Renewal",
    price: 3000,
    priceDisplay: "₦3,000",
    description: "Already activated on this device? Renew to the latest edition for ₦1,000 less.",
    includes: [
      "Questions 2015 to 2026 (updated)",
      "JAMB and WAEC simulation",
      "Scores, analysis and notebook kept",
    ],
  },
] as const;

type PlanId = (typeof PLANS)[number]["id"];

const BANK = {
  name: "Kuda MFB",
  accountNumber: "3004434394",
  accountName: "Edumax Solutions",
};

const STEPS = [
  "Transfer the exact amount to the account above (bank app, USSD, agent or counter).",
  "Use your Product ID as the narration or reference of the transfer.",
  "Send the receipt screenshot with your Product ID to WhatsApp +234 806 781 9642 or email edumaxsolutions.ng@gmail.com.",
  "Once we confirm the payment your activation key is sent to the same WhatsApp number or email, usually within minutes (9am to 7pm daily).",
  "Paste the key into the activation box in the app and press Activate. The app unlocks immediately — no website needed.",
];

// ─── Copy button helper ────────────────────────────────────────────────────────

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
      {copied ? <Check className="h-3.5 w-3.5 text-foreground" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ─── Bank detail row ───────────────────────────────────────────────────────────

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

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function BravoActivatePage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("first");
  const [productId, setProductId] = useState("");
  const [activationKey, setActivationKey] = useState("");

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
              <div className="text-xs text-muted-foreground mt-0.5">
                Offline exam simulator
              </div>
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

          {/* ── LEFT COLUMN — plan + bank transfer ── */}
          <div className="space-y-6">

            {/* Plan selector */}
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mb-1">
                Activate Bravo CBT
              </h1>
              <p className="text-sm text-muted-foreground">
                Choose a plan, transfer payment, then paste your key.
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Plan
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all duration-150",
                      selectedPlan === p.id
                        ? "border-foreground bg-foreground text-background shadow-md"
                        : "border-border bg-card text-foreground hover:border-foreground/40"
                    )}
                  >
                    <div className="text-lg font-extrabold leading-none">{p.priceDisplay}</div>
                    <div className={cn(
                      "text-xs font-semibold mt-1",
                      selectedPlan === p.id ? "text-background/80" : "text-foreground"
                    )}>
                      {p.label}
                    </div>
                    <div className={cn(
                      "text-xs mt-2 leading-snug",
                      selectedPlan === p.id ? "text-background/60" : "text-muted-foreground"
                    )}>
                      {p.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Product ID input */}
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
                  className="font-mono tracking-widest text-sm uppercase"
                  spellCheck={false}
                />
                {productId && <CopyButton value={productId} />}
              </div>
              <p className="text-xs text-muted-foreground">
                Find this inside Bravo CBT under <strong>Product → Activate</strong>. Use it as the transfer narration.
              </p>
            </div>

            <Separator />

            {/* Payment method tabs */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 block">
                How to pay
              </Label>
              <Tabs defaultValue="bank">
                <TabsList className="w-full grid grid-cols-2 mb-4">
                  <TabsTrigger value="bank" className="gap-2">
                    <Building2 className="h-4 w-4" />
                    Bank Transfer
                  </TabsTrigger>
                  <TabsTrigger value="online" disabled className="gap-2 opacity-50">
                    <CreditCard className="h-4 w-4" />
                    Pay Online
                    <span className="ml-1 rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                      Soon
                    </span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="bank" className="space-y-4">
                  {/* Bank detail card */}
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2 bg-muted/60 border-b border-border">
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
                        <BankRow
                          label="Narration (Product ID)"
                          value={productId}
                          copyable
                          bold
                        />
                      )}
                    </div>
                  </div>

                  {/* Step-by-step */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Steps
                    </span>
                    <ol className="space-y-3 mt-2">
                      {STEPS.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm text-foreground/80 leading-relaxed">
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
                  </div>

                  {/* Confirmation button */}
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="w-full border-foreground/30 hover:bg-foreground/5 gap-2"
                  >
                    <a
                      href="https://wa.me/2348067819642"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-5 w-5" />
                      I've completed the transfer — WhatsApp us
                    </a>
                  </Button>

                  {/* Info notice */}
                  <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Bank transfer is ready now. Online card payment (Paystack) is coming soon.
                      After your transfer the activation key is sent to your WhatsApp or email,
                      usually within minutes{" "}
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

          {/* ── RIGHT COLUMN — order summary + activation key input ── */}
          <div className="space-y-6 lg:sticky lg:top-28">

            {/* Order summary */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-border">
                <div className="flex items-center gap-2 mb-1">
                  <WifiOff className="h-4 w-4 text-foreground/50" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Order Summary
                  </span>
                </div>
                <div className="text-xl font-extrabold text-foreground">
                  {plan.label} — {plan.priceDisplay}
                </div>
              </div>

              <div className="px-6 py-4 space-y-3">
                {plan.includes.map((item) => (
                  <div key={item} className="flex items-center justify-between text-sm">
                    <span className="text-foreground/80">{item}</span>
                    <span className="text-xs font-semibold text-foreground bg-foreground/8 border border-foreground/10 rounded-full px-2 py-0.5">
                      Included
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="px-6 py-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{plan.priceDisplay}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">₦0</span>
                </div>
              </div>

              <div className="px-6 py-4 bg-foreground/4 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-foreground">Due today</span>
                  <span className="text-2xl font-extrabold text-foreground">
                    {plan.priceDisplay}
                  </span>
                </div>
              </div>

              {/* Activate CTA — Paystack placeholder */}
              <div className="px-6 pb-6 pt-4 space-y-3">
                <Button
                  size="lg"
                  disabled
                  className="w-full bg-foreground text-background hover:bg-foreground/90 font-bold opacity-50 cursor-not-allowed gap-2"
                >
                  <CreditCard className="h-5 w-5" />
                  Pay Online — Coming Soon
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Online payment via Paystack launches soon. Use bank transfer above for now.
                </p>
              </div>
            </div>

            {/* ── Activation key input ── */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Already have a key?
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Paste your activation key below. Open Bravo CBT, go to{" "}
                  <strong>Product → Activate</strong>, and paste it there to unlock the app instantly.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="activation-key" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Activation Key
                </Label>
                <Textarea
                  id="activation-key"
                  placeholder="Paste the activation key here (Ctrl+V)"
                  value={activationKey}
                  onChange={(e) => setActivationKey(e.target.value.trim())}
                  className="font-mono text-sm resize-none h-24 tracking-wide"
                  spellCheck={false}
                />
              </div>

              {activationKey && (
                <div className="flex gap-2">
                  <CopyButton value={activationKey} className="flex-1 justify-center" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => setActivationKey("")}
                  >
                    Clear
                  </Button>
                </div>
              )}

              <div className="flex items-start gap-3 rounded-xl bg-muted/50 border border-border p-3 text-xs text-muted-foreground">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Activation happens <strong className="text-foreground">inside the desktop app</strong> — not on this website. Copy the key above, open Bravo CBT, and paste it in the activation screen.
                </span>
              </div>
            </div>

            {/* Contact strip */}
            <div className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row gap-3">
              <a
                href="https://wa.me/2348067819642"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background hover:bg-muted px-4 py-3 text-sm font-medium text-foreground transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp Support
              </a>
              <a
                href="mailto:edumaxsolutions.ng@gmail.com"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background hover:bg-muted px-4 py-3 text-sm font-medium text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                Email Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
