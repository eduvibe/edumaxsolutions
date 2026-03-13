"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InquiryForm } from "@/components/InquiryForm";
import { useState } from "react";

export function RequestDemoModal({ children, className }: { children: React.ReactNode, className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span className={className}>{children}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 rounded-xl shadow-2xl">
        <div className="bg-primary p-6 md:p-8 text-primary-foreground">
            <DialogHeader className="mb-0">
            <DialogTitle className="text-2xl md:text-3xl font-bold tracking-tight">Request a Free Demo</DialogTitle>
            <DialogDescription className="text-primary-foreground/90 text-base mt-2">
                Experience the power of EduMax Solutions firsthand. Fill out the form below to schedule a personalized walkthrough.
            </DialogDescription>
            </DialogHeader>
        </div>
        <div className="p-6 md:p-8 bg-background">
          <InquiryForm onSuccess={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
