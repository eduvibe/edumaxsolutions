"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getSupabaseBrowserClient } from "@/lib/platform/supabaseBrowser";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export function TutorAuthForm() {
  const env = getPlatformPublicEnv();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function setRoleTeacherCookie() {
    await fetch("/api/session/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "teacher" }),
    });
  }

  async function onSubmit() {
    if (!env.supabaseConfigured) {
      toast({ title: "Supabase not configured", description: "Add Supabase environment variables to enable login." });
      return;
    }
    setBusy(true);
    try {
      const e = email.trim().toLowerCase();
      if (!e) throw new Error("Email is required");
      if (!password) throw new Error("Password is required");

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: e, password });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email: e, password });
        if (error) throw new Error(error.message);
      }

      await setRoleTeacherCookie();
      toast({ title: mode === "signin" ? "Signed in" : "Account created" });
      router.push("/learn/teacher/dashboard");
      router.refresh();
    } catch (err) {
      toast({ title: "Auth failed", description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <div className="text-sm font-medium text-black/80 dark:text-white/80">Email</div>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tutor@example.com" type="email" />
      </div>
      <div className="grid gap-2">
        <div className="text-sm font-medium text-black/80 dark:text-white/80">Password</div>
        <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" />
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          disabled={busy || !env.supabaseConfigured}
          className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          onClick={() => void onSubmit()}
        >
          {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
          onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
        >
          {mode === "signin" ? "Create a tutor account" : "I already have an account"}
        </Button>
      </div>
    </div>
  );
}

