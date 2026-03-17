"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseAccessToken, getSupabaseBrowserClient } from "@/lib/platform/supabaseBrowser";
import { useCallback, useEffect, useMemo, useState } from "react";

type Role = "student" | "teacher" | "admin";

type Application = {
  id: string;
  user_id: string;
  email: string;
  phone: string;
  school: string;
  location: string;
  status: string;
  created_at: string;
};

async function authedFetchJson<T>(path: string, init?: RequestInit) {
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error("Session expired. Please sign in again.");
  const res = await fetch(path, { ...init, headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` } });
  const data = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const err = (data as { error?: string } | null)?.error;
    throw new Error(err ?? "Request failed");
  }
  return data as T;
}

export function AdminTeacherApplicationsClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { toast } = useToast();
  const [myRole, setMyRole] = useState<Role>("student");
  const [loadingRole, setLoadingRole] = useState(true);

  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadRole() {
      setLoadingRole(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user ?? null;
      if (!user) {
        if (!cancelled) setMyRole("student");
        if (!cancelled) setLoadingRole(false);
        return;
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      const r = (data as { role?: string } | null)?.role;
      if (!cancelled) setMyRole(r === "admin" || r === "teacher" || r === "student" ? (r as Role) : "student");
      if (!cancelled) setLoadingRole(false);
    }
    void loadRole();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authedFetchJson<{ applications: Application[] }>("/api/teacher-applications?status=pending");
      setApps(data.applications ?? []);
    } catch (e) {
      toast({ title: "Failed to load applications", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (myRole !== "admin") return;
    void loadApps();
  }, [loadApps, myRole]);

  async function approve(appId: string) {
    setApprovingId(appId);
    try {
      await authedFetchJson(`/api/teacher-applications/${encodeURIComponent(appId)}/approve`, { method: "POST" });
      toast({ title: "Approved", description: "User promoted to teacher." });
      await loadApps();
    } catch (e) {
      toast({ title: "Approve failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setApprovingId(null);
    }
  }

  if (loadingRole) return null;
  if (myRole !== "admin") return null;

  return (
    <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-black/80 dark:text-white/80">Tutor applications</div>
          <div className="mt-1 text-sm text-black/70 dark:text-white/70">Approve requests to promote users to teacher role.</div>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
          disabled={loading}
          onClick={() => void loadApps()}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="divide-y divide-black/10 overflow-hidden rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
        {apps.length === 0 ? (
          <div className="p-4 text-sm text-black/70 dark:text-white/70">No pending applications.</div>
        ) : (
          apps.map((a) => (
            <div key={a.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-black dark:text-white">{a.email}</div>
                <div className="mt-1 text-xs text-black/60 dark:text-white/60">
                  {a.school} • {a.location} • {a.phone}
                </div>
                <div className="mt-1 text-xs text-black/60 dark:text-white/60">
                  Submitted: {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                </div>
                <div className="mt-1 text-xs text-black/60 dark:text-white/60">User ID: {a.user_id}</div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                  disabled={approvingId === a.id}
                  onClick={() => void approve(a.id)}
                >
                  {approvingId === a.id ? "Approving..." : "Approve"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

