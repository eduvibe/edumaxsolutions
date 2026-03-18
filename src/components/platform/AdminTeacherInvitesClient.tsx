"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseAccessToken, getSupabaseBrowserClientOrNull } from "@/lib/platform/supabaseBrowser";
import { useEffect, useMemo, useState } from "react";

type Role = "student" | "teacher" | "admin";

export function AdminTeacherInvitesClient() {
  const { toast } = useToast();
  const supabase = useMemo(() => getSupabaseBrowserClientOrNull(), []);
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("14");
  const [busy, setBusy] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadRole() {
      if (!supabase) {
        if (active) setRole("student");
        return;
      }
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        if (active) setRole("student");
        return;
      }
      const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      const r = String((roleRow as { role?: string } | null)?.role ?? "student");
      if (!active) return;
      setRole(r === "admin" ? "admin" : r === "teacher" ? "teacher" : "student");
    }
    void loadRole();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function createInvite() {
    setBusy(true);
    setGeneratedCode(null);
    try {
      const token = await getSupabaseAccessToken();
      if (!token) throw new Error("Admin session expired. Please sign in again.");

      const emailValue = email.trim().toLowerCase();
      const expiresDaysParsed = expiresInDays.trim() ? Number.parseInt(expiresInDays.trim(), 10) : NaN;
      const expiresDays = Number.isFinite(expiresDaysParsed) ? expiresDaysParsed : undefined;

      const res = await fetch("/api/admin/teacher-invites/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: emailValue || undefined, expiresInDays: expiresDays }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; code?: string; error?: string };
      if (!res.ok || !data.code) {
        throw new Error(data.error ?? "Unable to create invite");
      }

      setGeneratedCode(data.code);
      toast({ title: emailValue ? "Invite created and sent" : "Invite created" });
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-black/10 bg-transparent p-6 dark:border-white/10 md:p-8">
      {role && role !== "admin" ? (
        <div className="rounded-xl border border-black/10 bg-white/10 p-5 text-sm text-black/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white/70">
          Admin access required.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="text-sm font-semibold text-black/80 dark:text-white/80">Tutor email (optional)</div>
          <div className="mt-2">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tutor@school.com" type="email" />
          </div>
          <div className="mt-2 text-xs text-black/60 dark:text-white/60">
            If provided, the invite can only be redeemed by this email address and the code will be sent by mail.
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold text-black/80 dark:text-white/80">Expires (days)</div>
          <div className="mt-2">
            <Input value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} placeholder="14" inputMode="numeric" />
          </div>
          <div className="mt-2 text-xs text-black/60 dark:text-white/60">1–90 days recommended.</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          disabled={busy || role === "student" || role === "teacher"}
          className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          onClick={() => void createInvite()}
        >
          {busy ? "Working..." : "Generate invite"}
        </Button>

        {generatedCode ? (
          <Button
            type="button"
            variant="secondary"
            className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
            onClick={() => {
              void navigator.clipboard.writeText(generatedCode);
              toast({ title: "Copied" });
            }}
          >
            Copy code
          </Button>
        ) : null}
      </div>

      {generatedCode ? (
        <div className="mt-6 rounded-2xl border border-black/10 bg-white/10 p-5 text-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
          <div className="text-xs font-semibold text-black/60 dark:text-white/60">Invite code</div>
          <div className="mt-2 font-mono text-base text-black dark:text-white">{generatedCode}</div>
        </div>
      ) : null}
    </div>
  );
}

