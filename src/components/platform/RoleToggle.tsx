"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { PlatformRole } from "@/lib/platform/session";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getSupabaseBrowserClient } from "@/lib/platform/supabaseBrowser";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RoleToggle({ role, onRoleChange }: { role: PlatformRole; onRoleChange?: (next: PlatformRole) => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function setNextRole(next: PlatformRole) {
    if (next === "teacher") {
      if (role === "teacher") {
        router.push("/learn/teacher/dashboard");
        return;
      }
      toast({
        title: "Tutor sign-in required",
        description: "Sign in to access tutor tools.",
      });
      router.push("/learn/teacher/login");
      return;
    }
    setBusy(true);
    try {
      const env = getPlatformPublicEnv();
      if (env.platformMode === "supabase" && env.supabaseConfigured) {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
      }
      const res = await fetch("/api/session/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      if (!res.ok) throw new Error("Unable to update role");
      onRoleChange?.(next);
      router.push("/learn/subjects?section=primary");
      router.refresh();
    } catch (e) {
      toast({
        title: "Role switch failed",
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center rounded-full border border-black/10 bg-white/50 p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
      <Button
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => setNextRole("student")}
        className={[
          "h-9 rounded-full px-4",
          role === "student"
            ? "bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            : "text-black/70 hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white",
        ].join(" ")}
      >
        Student
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => setNextRole("teacher")}
        className={[
          "h-9 rounded-full px-4",
          role === "teacher"
            ? "bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            : "text-black/70 hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white",
        ].join(" ")}
      >
        Tutor
      </Button>
    </div>
  );
}
