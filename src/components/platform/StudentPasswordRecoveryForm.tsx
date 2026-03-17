"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function StudentPasswordRecoveryForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch("/api/student-password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      await res.json().catch(() => ({}));
      toast({
        title: "If your account has a recovery email…",
        description: "A reset link has been sent. Check your inbox.",
      });
    } catch (e) {
      toast({ title: "Request failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <div className="text-sm font-medium text-black/80 dark:text-white/80">Recovery email</div>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" />
      </div>
      <Button
        type="button"
        disabled={busy || !email.trim()}
        className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
        onClick={() => void submit()}
      >
        {busy ? "Sending..." : "Send reset link"}
      </Button>
    </div>
  );
}
