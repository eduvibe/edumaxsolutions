"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type FloatingDecorProps = {
  className?: string;
};

export function FloatingDecor({ className }: FloatingDecorProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <div className="absolute -top-10 -left-8 h-48 w-48 rounded-full bg-primary/20 blur-2xl animate-float-slow" />
      <div className="absolute top-1/3 -right-10 h-56 w-56 rounded-full bg-accent/20 blur-2xl animate-float" />
      <div className="absolute bottom-0 left-1/4 h-40 w-40 rounded-full bg-primary/10 blur-2xl animate-float-delay" />
    </div>
  );
}

