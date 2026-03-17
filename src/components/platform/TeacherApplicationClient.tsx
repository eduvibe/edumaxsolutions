"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getSupabaseAccessToken, getSupabaseBrowserClient } from "@/lib/platform/supabaseBrowser";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Mode = "signin" | "signup";

export function TeacherApplicationClient() {
  const env = getPlatformPublicEnv();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { toast } = useToast();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signup");
  const [busy, setBusy] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (!cancelled) setSessionEmail(user?.email ?? null);
    }
    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function setRoleTeacherCookie() {
    await fetch("/api/session/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "teacher" }),
    });
  }

  async function auth() {
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

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast({
        title: "Account created",
        description:
          "Email confirmation is enabled in Supabase, so you’re not signed in yet. Confirm your email, then return here to submit your application.",
      });
      setMode("signin");
      return false;
    }
    setSessionEmail(sessionData.session.user.email ?? null);
    return true;
  }

  async function submitApplication() {
    if (!phone.trim()) throw new Error("Phone number is required");
    if (!school.trim()) throw new Error("School is required");
    if (!location.trim()) throw new Error("Location is required");

    const token = await getSupabaseAccessToken();
    if (!token) throw new Error("Please sign in first");
    const res = await fetch("/api/teacher-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone: phone.trim(), school: school.trim(), location: location.trim() }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Unable to submit application");

    toast({ title: "Application submitted", description: "An admin will review your request." });
    await setRoleTeacherCookie();
    router.push("/learn/teacher/login");
    router.refresh();
  }

  async function onSubmit() {
    if (!env.supabaseConfigured) {
      toast({ title: "Supabase not configured", description: "Add Supabase environment variables to enable login." });
      return;
    }
    setBusy(true);
    try {
      if (!sessionEmail) {
        const ok = await auth();
        if (!ok) return;
      }
      await submitApplication();
    } catch (e) {
      toast({ title: "Application failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!sessionEmail ? (
        <>
          <div className="grid gap-2">
            <div className="text-sm font-medium text-black/80 dark:text-white/80">Email</div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tutor@example.com" type="email" />
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-medium text-black/80 dark:text-white/80">Password</div>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" />
          </div>
          <Button
            type="button"
            disabled={busy || !env.supabaseConfigured}
            className="w-full rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            onClick={() => void onSubmit()}
          >
            {busy ? "Please wait..." : mode === "signin" ? "Sign in + continue" : "Create account + continue"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
            onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
          >
            {mode === "signin" ? "Create a new account" : "I already have an account"}
          </Button>
        </>
      ) : (
        <div className="rounded-xl border border-black/10 bg-white/10 p-4 text-sm text-black/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white/70">
          Signed in as <span className="font-semibold text-black dark:text-white">{sessionEmail}</span>
        </div>
      )}

      <div className="grid gap-2">
        <div className="text-sm font-medium text-black/80 dark:text-white/80">Phone</div>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." />
      </div>
      <div className="grid gap-2">
        <div className="text-sm font-medium text-black/80 dark:text-white/80">School</div>
        <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="School name" />
      </div>
      <div className="grid gap-2">
        <div className="text-sm font-medium text-black/80 dark:text-white/80">Location</div>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City / State" />
      </div>

      <Button
        type="button"
        disabled={busy || !env.supabaseConfigured}
        className="w-full rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
        onClick={() => void onSubmit()}
      >
        {busy ? "Submitting..." : "Submit application"}
      </Button>
    </div>
  );
}

