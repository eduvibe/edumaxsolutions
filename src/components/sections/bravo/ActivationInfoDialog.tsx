"use client";

// Public "Get Activation Key" explanation. It deliberately contains no links, order references, tokens,
// or instructions for the private checkout route. Activation always starts in the Bravo CBT app.
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const ACTIVATION_INFO_TITLE = "Get your Bravo CBT activation key";
export const ACTIVATION_INFO_COPY =
  "Activation and renewal are started in the Bravo CBT app. Open Product → Activate, choose New Activation or Renewal, and select Pay Online. Paystack securely processes your payment. After payment is confirmed, your activation key is shown in the secure checkout window and Bravo CBT activates automatically.";

export function ActivationInfoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="activation-info-description">
        <DialogHeader>
          <DialogTitle>{ACTIVATION_INFO_TITLE}</DialogTitle>
          <DialogDescription id="activation-info-description" className="text-sm leading-relaxed text-foreground/80">
            {ACTIVATION_INFO_COPY}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="w-full sm:w-auto">
              Got it
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type TriggerProps = {
  children: ReactNode;
  className?: string;
  /** Use "button" for the solid CTA and "link" for inline text. */
  variant?: "button" | "link";
  size?: "default" | "lg";
  primaryClassName?: string;
};

/** Opens the activation explanation in an accessible modal. Replaces the old navigation to /bravo/activate. */
export function ActivationInfoTrigger({ children, className, variant = "button", size = "default", primaryClassName }: TriggerProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "button" ? (
        <Button type="button" size={size} className={cn(primaryClassName, className)} aria-haspopup="dialog" onClick={() => setOpen(true)}>
          {children}
        </Button>
      ) : (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          className={cn("underline underline-offset-4 hover:text-foreground transition-colors", className)}
        >
          {children}
        </button>
      )}
      <ActivationInfoDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
