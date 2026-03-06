"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type RevealOnScrollProps = {
  children: React.ReactNode;
  className?: string;
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
};

export function RevealOnScroll({
  children,
  className,
  once = true,
  rootMargin = "0px 0px -10% 0px",
  threshold = 0.15,
}: RevealOnScrollProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }

    if (isVisible && once) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
          return;
        }

        if (!once) setIsVisible(false);
      },
      { root: null, rootMargin, threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isVisible, once, rootMargin, threshold]);

  return (
    <div
      ref={ref}
      className={cn(
        "opacity-0 translate-y-6 transition-[opacity,transform] duration-700 ease-out will-change-transform",
        isVisible && "opacity-100 translate-y-0",
        className
      )}
    >
      {children}
    </div>
  );
}

