"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TutorSignInButton(props: Omit<ButtonProps, "onClick">) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const res = await fetch("/api/session/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "teacher" }),
      });
      if (!res.ok) throw new Error("Unable to sign in");
      router.push("/learn/teacher/dashboard");
      router.refresh();
    } catch (e) {
      toast({
        title: "Sign in failed",
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button {...props} onClick={onClick} disabled={busy || props.disabled}>
      {busy ? "Signing in..." : "Sign in"}
    </Button>
  );
}

