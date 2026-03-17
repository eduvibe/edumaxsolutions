"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getSupabaseBrowserClientOrNull } from "@/lib/platform/supabaseBrowser";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type Mode = "signin" | "signup";

function normalizePhoneToDigits(input: string) {
  return input.replace(/[^\d]/g, "");
}

function phoneToPseudoEmail(phoneDigits: string) {
  return `student_${phoneDigits}@students.edumax.local`;
}

function isStrongPassword(pw: string) {
  if (pw.length < 8) return false;
  if (!/[A-Za-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  return true;
}

export function StudentAuthForm() {
  const env = getPlatformPublicEnv();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = useMemo(() => getSupabaseBrowserClientOrNull(), []);

  const [mode, setMode] = useState<Mode>("signin");
  const [phone, setPhone] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function setRoleStudentCookie() {
    await fetch("/api/session/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "student" }),
    });
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    await setRoleStudentCookie();
    toast({ title: "Signed out" });
    router.refresh();
  }

  async function onSubmit() {
    if (!env.supabaseConfigured) {
      toast({ title: "Supabase not configured", description: "Add Supabase environment variables to enable login." });
      return;
    }
    if (!supabase) {
      toast({ title: "Supabase not configured", description: "Missing Supabase environment variables in this deployment." });
      return;
    }
    setBusy(true);
    try {
      const phoneDigits = normalizePhoneToDigits(phone);
      if (!phoneDigits) throw new Error("Phone number is required");
      if (phoneDigits.length < 10 || phoneDigits.length > 15) throw new Error("Enter a valid phone number");
      if (!password) throw new Error("Password is required");
      if (!isStrongPassword(password)) throw new Error("Password must be at least 8 characters and include letters and numbers");
      const e = phoneToPseudoEmail(phoneDigits);

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: e, password });
        if (error) throw new Error(error.message);
      } else {
        const rec = recoveryEmail.trim().toLowerCase();
        const { error } = await supabase.auth.signUp({
          email: e,
          password,
          options: {
            data: {
              phone: phone.trim(),
              recoveryEmail: rec ? rec : undefined,
            },
          },
        });
        if (error) throw new Error(error.message);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({
          title: "Account created",
          description:
            "Email confirmation is enabled in Supabase, so you’re not signed in yet. Confirm your email, then sign in. If you want instant signup, disable Confirm email in Supabase Auth settings.",
        });
        setMode("signin");
        return;
      }

      await setRoleStudentCookie();
      toast({ title: mode === "signin" ? "Signed in" : "Account created" });
      const returnTo = searchParams.get("returnTo") ?? "";
      if (returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.startsWith("/\\")) {
        router.push(returnTo);
      } else {
        router.push("/learn/subjects?section=primary");
      }
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
        <div className="text-sm font-medium text-black/80 dark:text-white/80">Phone</div>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." />
      </div>
      {mode === "signup" ? (
        <div className="grid gap-2">
          <div className="text-sm font-medium text-black/80 dark:text-white/80">Email (optional)</div>
          <Input value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="Optional recovery email" type="email" />
        </div>
      ) : null}
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
          {mode === "signin" ? "Create a student account" : "I already have an account"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
          disabled={busy || !env.supabaseConfigured}
          onClick={() => void signOut()}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
