"use client";

// Staff-only console: view current mock event, publish/end events, review/export reports,
// and (super-admin) manage staff accounts. Independent of the Edumax learning platform:
// staff sign in with a Bravo staff token, kept in memory only (never localStorage) and
// re-verified server-side on every staff API route.
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useEffect, useState } from "react";

type MockConfig = {
  id: string;
  title: string;
  examId: string;
  subjectIds?: string[];
  countPerSubject?: number;
  durationMin: number;
  editionYear: number;
  seed: string;
  startsAt: string;
  closeAt: string;
};

type ReportRow = {
  id: string;
  category: string;
  product_id: string;
  exam_id: string | null;
  subject_id: string | null;
  question_id: string | null;
  year: string | null;
  model: string | null;
  message: string | null;
  status: "open" | "resolved";
  received_at: string;
  resolved_at: string | null;
};

type StaffCtx = { staffId: string; name: string; permissions: string[]; isSuperAdmin: boolean };
type StaffRow = { id: string; name: string; permissions: string[]; active: boolean; created_at: string; revoked_at: string | null };

const ALL_PERMISSIONS = ["mock_manage", "reports_review", "reports_export"] as const;

export function BravoConsoleClient() {
  const { toast } = useToast();
  const [staffToken, setStaffToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [me, setMe] = useState<StaffCtx | null>(null);
  const [mock, setMock] = useState<MockConfig | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [reportStatus, setReportStatus] = useState<"open" | "resolved" | "all">("open");
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffPerms, setNewStaffPerms] = useState<string[]>(["reports_review"]);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    examId: "",
    subjectIds: "",
    countPerSubject: "",
    durationMin: "60",
    editionYear: String(new Date().getFullYear()),
    seed: "",
    startsAt: "",
    closeAt: "",
  });

  const can = useCallback((p: string) => me?.isSuperAdmin === true || me?.permissions.includes(p) === true, [me]);

  const authedFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      if (!staffToken) throw new Error("Sign in with a staff token first.");
      return fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${staffToken}`, ...(init?.headers ?? {}) },
      });
    },
    [staffToken]
  );

  const load = useCallback(async () => {
    const [mockRes, repRes, staffRes] = await Promise.all([
      fetch("/api/mock/current", { cache: "no-store" }),
      me?.isSuperAdmin || me?.permissions.includes("reports_review")
        ? authedFetch(`/api/reports?status=${reportStatus}&limit=100`)
        : Promise.resolve(null),
      me?.isSuperAdmin ? authedFetch("/api/staff") : Promise.resolve(null),
    ]);
    if (mockRes.ok) setMock(((await mockRes.json()) as { mock: MockConfig | null }).mock);
    if (repRes?.ok) setReports(((await repRes.json()) as { reports: ReportRow[] }).reports);
    if (staffRes?.ok) setStaff(((await staffRes.json()) as { staff: StaffRow[] }).staff);
  }, [authedFetch, reportStatus, me]);

  async function signIn() {
    const token = tokenInput.trim();
    if (!token) return;
    const res = await fetch("/api/staff/me", { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      toast({ title: "Sign-in failed", description: "Invalid or revoked staff token." });
      return;
    }
    if (!res.ok) {
      toast({ title: "Sign-in failed", description: "Staff access is not available right now." });
      return;
    }
    const data = (await res.json()) as { staff: StaffCtx };
    setMe(data.staff);
    setStaffToken(token);
    setTokenInput("");
    setAuthed(true);
  }

  useEffect(() => {
    if (authed) void load();
  }, [authed, load]);

  async function publish() {
    try {
      const res = await authedFetch("/api/mock/create", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          examId: form.examId,
          subjectIds: form.subjectIds ? form.subjectIds.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
          countPerSubject: form.countPerSubject ? Number(form.countPerSubject) : undefined,
          durationMin: Number(form.durationMin),
          editionYear: Number(form.editionYear),
          seed: form.seed,
          startsAt: form.startsAt,
          closeAt: form.closeAt,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; mock?: MockConfig };
      if (!res.ok) throw new Error(data.error ?? "Failed to publish mock");
      toast({ title: "Mock published", description: data.mock?.title });
      await load();
    } catch (e) {
      toast({ title: "Publish failed", description: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  async function endMock() {
    try {
      const res = await authedFetch("/api/mock/end", { method: "POST" });
      if (!res.ok) throw new Error("Failed to end mock");
      toast({ title: "Mock ended" });
      await load();
    } catch (e) {
      toast({ title: "End failed", description: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  async function resolve(id: string) {
    try {
      const res = await authedFetch(`/api/reports/${encodeURIComponent(id)}/resolve`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to resolve report");
      toast({ title: "Report marked reviewed" });
      await load();
    } catch (e) {
      toast({ title: "Resolve failed", description: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  async function exportReports() {
    try {
      const res = await authedFetch(`/api/reports/export?status=${reportStatus}&format=csv`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bravo-reports-${reportStatus}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: "Export failed", description: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  async function addStaff() {
    try {
      const res = await authedFetch("/api/staff", {
        method: "POST",
        body: JSON.stringify({ name: newStaffName, permissions: newStaffPerms }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; token?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create staff");
      setCreatedToken(data.token ?? null);
      setNewStaffName("");
      toast({ title: "Staff account created" });
      await load();
    } catch (e) {
      toast({ title: "Create failed", description: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  async function revoke(id: string) {
    try {
      const res = await authedFetch(`/api/staff/${encodeURIComponent(id)}/revoke`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to revoke");
      toast({ title: "Staff revoked" });
      await load();
    } catch (e) {
      toast({ title: "Revoke failed", description: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm space-y-3 p-8 text-black dark:text-white">
        <h1 className="text-2xl font-extrabold tracking-tight">Bravo Console</h1>
        <p className="text-sm text-black/70 dark:text-white/70">Staff sign-in is required.</p>
        <Input
          type="password"
          placeholder="Staff token"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void signIn()}
        />
        <Button onClick={() => void signIn()}>Sign in</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 text-black dark:text-white">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Bravo Console</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Signed in as {me?.name} {me?.isSuperAdmin ? "(super admin)" : `· ${me?.permissions.join(", ")}`}
        </p>
      </header>

      {can("mock_manage") && (
        <>
          <section className="space-y-3 rounded-2xl border border-black/10 p-5 dark:border-white/10">
            <h2 className="text-xl font-bold">Current mock event</h2>
            {mock ? (
              <div className="space-y-1 text-sm">
                <p><strong>{mock.title}</strong> ({mock.examId})</p>
                <p>Edition {mock.editionYear} · {mock.durationMin} min · seed {mock.seed}</p>
                {mock.subjectIds && <p>Subjects: {mock.subjectIds.join(", ")}{mock.countPerSubject ? ` × ${mock.countPerSubject}` : ""}</p>}
                <p>Starts {mock.startsAt} · Closes {mock.closeAt}</p>
                <Button variant="destructive" onClick={endMock}>End event now</Button>
              </div>
            ) : (
              <p className="text-sm text-black/60 dark:text-white/60">No active mock event.</p>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-black/10 p-5 dark:border-white/10">
            <h2 className="text-xl font-bold">Publish mock event</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Exam ID</Label><Input value={form.examId} onChange={(e) => setForm({ ...form, examId: e.target.value })} /></div>
              <div><Label>Subject IDs (comma separated, optional)</Label><Input value={form.subjectIds} onChange={(e) => setForm({ ...form, subjectIds: e.target.value })} /></div>
              <div><Label>Count per subject (optional)</Label><Input value={form.countPerSubject} onChange={(e) => setForm({ ...form, countPerSubject: e.target.value })} /></div>
              <div><Label>Duration (min)</Label><Input type="number" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} /></div>
              <div><Label>Edition year</Label><Input type="number" value={form.editionYear} onChange={(e) => setForm({ ...form, editionYear: e.target.value })} /></div>
              <div><Label>Seed</Label><Input value={form.seed} onChange={(e) => setForm({ ...form, seed: e.target.value })} /></div>
              <div><Label>Starts at (ISO 8601)</Label><Input placeholder="2026-11-03T09:00:00Z" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
              <div><Label>Close at (ISO 8601, hard cutoff)</Label><Input placeholder="2026-11-03T12:00:00Z" value={form.closeAt} onChange={(e) => setForm({ ...form, closeAt: e.target.value })} /></div>
            </div>
            <Button onClick={publish}>Publish event</Button>
          </section>
        </>
      )}

      {can("reports_review") && (
        <section className="space-y-3 rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold">Reports</h2>
            <select
              className="rounded-md border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/15"
              value={reportStatus}
              onChange={(e) => setReportStatus(e.target.value as typeof reportStatus)}
            >
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="all">All</option>
            </select>
            {can("reports_export") && <Button size="sm" variant="outline" onClick={exportReports}>Export CSV</Button>}
          </div>
          {reports.length === 0 ? (
            <p className="text-sm text-black/60 dark:text-white/60">No reports.</p>
          ) : (
            <ul className="space-y-2">
              {reports.map((r) => (
                <li key={r.id} className="rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{r.category}</span>
                    <span className="text-xs text-black/50 dark:text-white/50">{r.received_at}</span>
                  </div>
                  {r.message ? (
                    <p className="mt-1 whitespace-pre-wrap">{r.message}</p>
                  ) : (
                    <p className="mt-1 text-black/70 dark:text-white/70">
                      {r.exam_id}/{r.subject_id}/{r.question_id}
                      {r.year ? ` · ${r.year}` : ""}{r.model ? ` · ${r.model}` : ""} · {r.product_id}
                    </p>
                  )}
                  {r.status === "open" ? (
                    <Button size="sm" className="mt-2" onClick={() => resolve(r.id)}>Mark reviewed</Button>
                  ) : (
                    <p className="mt-2 text-xs text-black/50 dark:text-white/50">Resolved {r.resolved_at}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {me?.isSuperAdmin && (
        <section className="space-y-3 rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="text-xl font-bold">Staff accounts</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div><Label>Name</Label><Input value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} /></div>
            {ALL_PERMISSIONS.map((p) => (
              <label key={p} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={newStaffPerms.includes(p)}
                  onChange={(e) => setNewStaffPerms((prev) => (e.target.checked ? [...prev, p] : prev.filter((x) => x !== p)))}
                />
                {p}
              </label>
            ))}
            <Button onClick={addStaff}>Add staff</Button>
          </div>
          {createdToken && (
            <p className="rounded-lg bg-black/5 p-2 text-xs dark:bg-white/10">
              New staff token (shown once): <code className="break-all">{createdToken}</code>
            </p>
          )}
          <ul className="space-y-2">
            {staff.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
                <span>
                  <strong>{s.name}</strong> · {s.permissions.join(", ")} · {s.active ? "active" : `revoked ${s.revoked_at ?? ""}`}
                </span>
                {s.active && <Button size="sm" variant="destructive" onClick={() => revoke(s.id)}>Revoke</Button>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
