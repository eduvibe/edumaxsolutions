"use client";

import * as React from "react";
import Image from "next/image";

type SplashScreenProps = {
  minimumMs?: number;
};

export function SplashScreen({ minimumMs = 700 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    const start = Date.now();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      const remaining = Math.max(0, minimumMs - (Date.now() - start));
      timeoutId = setTimeout(() => setIsVisible(false), remaining);
    };

    if (document.readyState === "complete") {
      finish();
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    window.addEventListener("load", finish, { once: true });
    return () => {
      window.removeEventListener("load", finish);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [minimumMs]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[300] flex h-screen w-screen flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center">
        <div className="relative h-16 w-28">
          <Image
            src="/media/chtlogo.png"
            alt="EduMax Solutions"
            fill
            className="object-contain"
            priority
          />
        </div>
        <div className="mt-6 h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
      </div>
    </div>
  );
}

