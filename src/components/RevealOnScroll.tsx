"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type RevealOnScrollProps = {
  children: React.ReactNode;
  className?: string;
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
  direction?: "up" | "down" | "left" | "right" | "zoom";
  delayMs?: number;
  durationMs?: number;
};

export function RevealOnScroll({
  children,
  className,
  once = true,
  rootMargin = "0px 0px -10% 0px",
  threshold = 0.15,
  direction = "up",
  delayMs = 0,
  durationMs = 700,
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

  const baseTransform =
    direction === "up"
      ? "translate-y-8"
      : direction === "down"
      ? "-translate-y-8"
      : direction === "left"
      ? "translate-x-8"
      : direction === "right"
      ? "-translate-x-8"
      : "scale-95";

  const visibleTransform =
    direction === "zoom" ? "scale-100" : "translate-x-0 translate-y-0";

  return (
    <div
      ref={ref}
      className={cn(
        "opacity-0 transition-[opacity,transform] ease-out will-change-transform",
        baseTransform,
        isVisible && "opacity-100",
        isVisible && visibleTransform,
        className
      )}
      style={{
        transitionDuration: `${durationMs}ms`,
        transitionDelay: `${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}
