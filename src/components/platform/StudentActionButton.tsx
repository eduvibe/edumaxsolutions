"use client";

import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/platform/supabaseBrowser";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function isSafeInternalPath(value: string) {
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.startsWith("/\\")) return false;
  return true;
}

export function StudentActionButton({
  href,
  mode,
  variant,
  className,
  children,
}: {
  href: string;
  mode: "navigate" | "download";
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const hasSession = Boolean(data.session);
      if (!hasSession) {
        const returnTo = isSafeInternalPath(href) ? href : "/learn/subjects?section=primary";
        router.push(`/learn/account?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }
      if (mode === "download") {
        window.location.href = href;
      } else {
        router.push(href);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant={variant} className={className} disabled={busy} onClick={() => void onClick()}>
      {children}
    </Button>
  );
}

