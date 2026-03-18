"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSupabaseAccessToken, getSupabaseBrowserClientOrNull } from "@/lib/platform/supabaseBrowser";
import { useCallback, useEffect, useMemo, useState } from "react";

type Role = "student" | "teacher" | "admin";

type ListedUser = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  role: Role;
};

export function AdminUsersClient() {
  const { toast } = useToast();
  const supabase = useMemo(() => getSupabaseBrowserClientOrNull(), []);
  const [myRole, setMyRole] = useState<Role | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(25);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function loadRole() {
      setLoadingRole(true);
      if (!supabase) {
        if (active) setMyRole("student");
        setLoadingRole(false);
        return;
      }
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        if (active) setMyRole("student");
        setLoadingRole(false);
        return;
      }
      const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      const r = String((roleRow as { role?: string } | null)?.role ?? "student");
      if (!active) return;
      setMyRole(r === "admin" || r === "teacher" ? (r as Role) : "student");
      setLoadingRole(false);
    }
    void loadRole();
    return () => {
      active = false;
    };
  }, [supabase]);

  const loadUsers = useCallback(async (nextPage: number, query?: string) => {
    setLoading(true);
    try {
      const token = await getSupabaseAccessToken();
      if (!token) throw new Error("Admin session expired. Please sign in again.");
      const res = await fetch("/api/admin/users/list", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ page: nextPage, perPage, q: query?.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        users?: ListedUser[];
        page?: number;
        perPage?: number;
        total?: number | null;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Unable to load users");
      setUsers(data.users ?? []);
      setTotal(typeof data.total === "number" ? data.total : null);
      setPage(nextPage);
    } catch (e) {
      toast({ title: "Failed to load users", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  }, [perPage, toast]);

  useEffect(() => {
    if (myRole === "admin") void loadUsers(1);
  }, [loadUsers, myRole]);

  async function setRole(userId: string, role: Role) {
    try {
      const token = await getSupabaseAccessToken();
      if (!token) throw new Error("Admin session expired. Please sign in again.");
      const res = await fetch("/api/admin/users/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, role }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Unable to update role");
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      toast({ title: "Role updated" });
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  async function suspendUser(userId: string, suspended: boolean) {
    try {
      const token = await getSupabaseAccessToken();
      if (!token) throw new Error("Admin session expired. Please sign in again.");
      const res = await fetch("/api/admin/users/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, suspended }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Unable to update user");
      toast({ title: suspended ? "User suspended" : "User unsuspended" });
      void loadUsers(page, q);
    } catch (e) {
      toast({ title: "Action failed", description: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    try {
      const token = await getSupabaseAccessToken();
      if (!token) throw new Error("Admin session expired. Please sign in again.");
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Unable to delete user");
      toast({ title: "User deleted" });
      void loadUsers(page, q);
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  if (loadingRole) {
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

  const totalPages = total ? Math.max(1, Math.ceil(total / perPage)) : null;

  return (
    <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[260px] flex-1">
          <div className="text-sm font-semibold text-black/80 dark:text-white/80">Search</div>
          <div className="mt-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email or user id" />
          </div>
        </div>
        <Button
          type="button"
          className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          disabled={loading}
          onClick={() => void loadUsers(1, q)}
        >
          {loading ? "Loading..." : "Search"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
          disabled={loading}
          onClick={() => void loadUsers(page, q)}
        >
          Refresh
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
            {users.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="text-sm text-black/70 dark:text-white/70">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const suspended = Boolean(u.banned_until && new Date(u.banned_until).getTime() > Date.now());
                return (
                  <TableRow key={u.id} className="hover:bg-transparent">
                    <TableCell className="min-w-0">
                      <div className="truncate text-sm font-semibold text-black dark:text-white">{u.email ?? "—"}</div>
                      <div className="mt-0.5 truncate text-xs text-black/60 dark:text-white/60">{u.id}</div>
                    </TableCell>
                    <TableCell>
                      <Select value={u.role} onValueChange={(v) => void setRole(u.id, v as Role)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">student</SelectItem>
                          <SelectItem value="teacher">teacher</SelectItem>
                          <SelectItem value="admin">admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-black/80 dark:text-white/80">{suspended ? "Suspended" : "Active"}</div>
                      <div className="mt-0.5 text-xs text-black/60 dark:text-white/60">
                        {u.email_confirmed_at ? "Email verified" : "Email unverified"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="rounded-md border-2 border-black bg-transparent px-3 text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                          onClick={() => void suspendUser(u.id, !suspended)}
                          disabled={loading}
                        >
                          {suspended ? "Unsuspend" : "Suspend"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="rounded-md border-2 border-black bg-transparent px-3 text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                          onClick={() => void deleteUser(u.id)}
                          disabled={loading}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-black/70 dark:text-white/70">
        <div>
          Page {page}
          {totalPages ? ` of ${totalPages}` : ""}
          {typeof total === "number" ? ` • ${total} total` : ""}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="rounded-md border-2 border-black bg-transparent px-3 text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
            disabled={loading || page <= 1}
            onClick={() => void loadUsers(Math.max(1, page - 1), q)}
          >
            Prev
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="rounded-md border-2 border-black bg-transparent px-3 text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
            disabled={loading || (totalPages ? page >= totalPages : users.length < perPage)}
            onClick={() => void loadUsers(page + 1, q)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
