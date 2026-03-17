"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

function isStrongPassword(pw: string) {
  if (pw.length < 8) return false;
  if (!/[A-Za-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  return true;
}

export function StudentPasswordResetForm({ token }: { token: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!token) {
      toast({ title: "Missing token", description: "Open the link from your email again." });
      return;
    }
    if (!isStrongPassword(pw)) {
      toast({ title: "Weak password", description: "Use at least 8 characters with letters and numbers." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/student-password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: pw }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Unable to reset password");
      toast({ title: "Password updated", description: "You can now sign in with your phone and new password." });
      router.push("/learn/account");
      router.refresh();
    } catch (e) {
      toast({ title: "Reset failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <div className="text-sm font-medium text-black/80 dark:text-white/80">New password</div>
        <Input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" type="password" />
      </div>
      <Button
        type="button"
        disabled={busy}
        className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
        onClick={() => void submit()}
      >
        {busy ? "Saving..." : "Update password"}
      </Button>
    </div>
  );
}

