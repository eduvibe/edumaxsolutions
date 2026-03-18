"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getSupabaseBrowserClientOrNull } from "@/lib/platform/supabaseBrowser";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";

export function TutorAuthForm() {
  const env = getPlatformPublicEnv();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useMemo(() => getSupabaseBrowserClientOrNull(), []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function setRoleTeacherCookie(token: string) {
    const res = await fetch("/api/session/role", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: "teacher" }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "Tutor access required");
    }
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
      const n = fullName.trim();
      const e = email.trim().toLowerCase();
      if (!e) throw new Error("Email is required");
      if (!password) throw new Error("Password is required");

      // Try sign-in; if fails, try sign-up then sign-in
      const signIn = await supabase.auth.signInWithPassword({ email: e, password });
      if (signIn.error) {
        const signUp = await supabase.auth.signUp({ email: e, password, options: n ? { data: { full_name: n } } : undefined });
        if (signUp.error) throw new Error(signUp.error.message);
        const sess = await supabase.auth.signInWithPassword({ email: e, password });
        if (sess.error) throw new Error(sess.error.message);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({ title: "Sign in failed", description: "No session returned from Supabase." });
        return;
      }

      if (n) {
        await supabase.auth.updateUser({ data: { full_name: n } }).catch(() => undefined);
      }

      const token = sessionData.session.access_token;
      const code = inviteCode.trim();
      if (code) {
        const regRes = await fetch("/api/teacher-invites/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ code }),
        });
        if (!regRes.ok) {
          const regData = (await regRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(regData.error ?? "Unable to activate tutor role");
        }
      }

      const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", sessionData.session.user.id).maybeSingle();
      const dbRole = String((roleRow as { role?: string } | null)?.role ?? "student");
      if (dbRole !== "teacher" && dbRole !== "admin") {
        toast({
          title: "Tutor access required",
          description: "Enter your tutor invite code, or apply to become a tutor.",
        });
        router.push("/learn/teacher/apply");
        router.refresh();
        return;
      }

      await setRoleTeacherCookie(token);
      toast({ title: "Signed in" });
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
        <div className="text-sm font-medium text-black/80 dark:text-white/80">Full name (recommended)</div>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Amina Yusuf" />
      </div>
      <div className="grid gap-2">
        <div className="text-sm font-medium text-black/80 dark:text-white/80">Email</div>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tutor@example.com" type="email" />
      </div>
      <div className="grid gap-2">
        <div className="text-sm font-medium text-black/80 dark:text-white/80">Password</div>
        <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" />
      </div>
      <div className="grid gap-2">
        <div className="text-sm font-medium text-black/80 dark:text-white/80">Tutor invite code</div>
        <Input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Provided by EduMax" />
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          disabled={busy || !env.supabaseConfigured}
          className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          onClick={() => void onSubmit()}
        >
          {busy ? "Please wait..." : "Sign in"}
        </Button>
        <Button asChild type="button" variant="secondary" className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10">
          <Link href="/learn/teacher/apply">Apply to become a tutor</Link>
        </Button>
      </div>
    </div>
  );
}
