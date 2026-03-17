"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseAccessToken, getSupabaseBrowserClient } from "@/lib/platform/supabaseBrowser";
import { useEffect, useMemo, useState } from "react";

type Role = "student" | "teacher" | "admin";

export function AdminRoleManagerClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { toast } = useToast();
  const [myRole, setMyRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<Role>("teacher");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user ?? null;
      if (!user) {
        if (!cancelled) setMyRole(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      const r = (data as { role?: string } | null)?.role;
      if (!cancelled) setMyRole(r === "admin" || r === "teacher" || r === "student" ? (r as Role) : "student");
      if (!cancelled) setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function submit() {
    setSaving(true);
    try {
      const token = await getSupabaseAccessToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      const res = await fetch("/api/admin/users/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: userId.trim(), role }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      toast({ title: "Role updated" });
      setUserId("");
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-black/10 bg-white/10 p-6 text-sm text-black/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white/70">
        Loading…
      </div>
    );
  }

  if (myRole !== "admin") {
    return (
      <div className="rounded-3xl border border-black/10 bg-white/10 p-6 text-sm text-black/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white/70">
        Admin access required.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5 space-y-4">
      <div className="text-sm font-semibold text-black/80 dark:text-white/80">Promote user</div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="User UUID (auth.users.id)"
          className="h-10 rounded-md border border-black/10 bg-white/65 px-3 text-sm text-black shadow-sm outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student">student</SelectItem>
            <SelectItem value="teacher">teacher</SelectItem>
            <SelectItem value="admin">admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          onClick={() => void submit()}
          disabled={saving || !userId.trim()}
        >
          {saving ? "Saving..." : "Update role"}
        </Button>
      </div>
      <div className="text-xs text-black/60 dark:text-white/60">
        Use the user UUID from Supabase Auth → Users → ID.
      </div>
    </div>
  );
}

