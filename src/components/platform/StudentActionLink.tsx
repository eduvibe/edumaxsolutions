"use client";

import { getSupabaseBrowserClient } from "@/lib/platform/supabaseBrowser";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

function isSafeInternalPath(value: string) {
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.startsWith("/\\")) return false;
  return true;
}

export function StudentActionLink({
  href,
  mode,
  className,
  children,
}: {
  href: string;
  mode: "navigate" | "download";
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  async function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
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
  }

  return (
    <a href={href} className={className} onClick={(e) => void onClick(e)}>
      {children}
    </a>
  );
}

