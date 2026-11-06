"use client";

// Staff-only console: view current mock event, publish/end events, review/export reports,
// and (super-admin) manage staff accounts. Single-screen tabbed layout (no scrolling).
// Independent of the Edumax learning platform: staff sign in with a Bravo staff token,
// kept in memory only (never localStorage) and re-verified server-side on every API route.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type MockEventSummary = MockConfig & { status: "active" | "ended" };

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

type LeaderboardEntry = { productId: string; score: number; total: number; submittedAt: string };
type StaffCtx = { staffId: string; name: string; permissions: string[]; isSuperAdmin: boolean };
type StaffRow = { id: string; name: string; permissions: string[]; active: boolean; created_at: string; revoked_at: string | null };

const ALL_PERMISSIONS = ["mock_manage", "reports_review", "reports_export"] as const;

/** Auto-generated exam id, e.g. mock-20261103-a7f2. */
function makeExamId(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(16).slice(2, 6);
  return `mock-${ymd}-${rand}`;
}

function makeSeed(): string {
  return Math.random().toString(16).slice(2, 10);
}

/** datetime-local value -> ISO 8601 UTC string. */
function toIso(local: string): string {
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

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
  const [editingMockId, setEditingMockId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [history, setHistory] = useState<MockEventSummary[]>([]);
  const [resultsEventId, setResultsEventId] = useState<string | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [allSubjects, setAllSubjects] = useState(true);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "",
    examId: makeExamId(),
    durationMin: "60",
    editionYear: String(new Date().getFullYear()),
    seed: makeSeed(),
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
    let currentMock: MockConfig | null = null;
    if (mockRes.ok) {
      currentMock = ((await mockRes.json()) as { mock: MockConfig | null }).mock;
      setMock(currentMock);
    }
    const histRes = await fetch("/api/mock/history?limit=50", { cache: "no-store" });
    let events: MockEventSummary[] = [];
    if (histRes.ok) {
      events = ((await histRes.json()) as { events: MockEventSummary[] }).events;
      setHistory(events);
    }
    const targetId = resultsEventId ?? currentMock?.id ?? events.find((e) => e.status === "ended")?.id ?? null;
    if (targetId) {
      if (!resultsEventId) setResultsEventId(targetId);
      const lbRes = await fetch(`/api/mock/${targetId}/leaderboard?limit=100`, { cache: "no-store" });
      if (lbRes.ok) setLeaderboard(((await lbRes.json()) as { leaderboard: LeaderboardEntry[] }).leaderboard);
    } else {
      setLeaderboard([]);
    }
    if (can("mock_manage")) {
      const subRes = await fetch("/api/curriculum/subjects", { cache: "no-store" });
      if (subRes.ok) {
        const data = (await subRes.json()) as { subjects?: { name?: string; slug?: string }[] };
        setAvailableSubjects((data.subjects ?? []).map((s) => s.name ?? s.slug ?? "").filter(Boolean));
      }
    }
    if (repRes?.ok) setReports(((await repRes.json()) as { reports: ReportRow[] }).reports);
    if (staffRes?.ok) setStaff(((await staffRes.json()) as { staff: StaffRow[] }).staff);
  }, [authedFetch, reportStatus, me, can]);

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
      const res = await authedFetch(editingMockId ? `/api/mock/${editingMockId}` : "/api/mock/create", {
        method: editingMockId ? "PATCH" : "POST",
        body: JSON.stringify({
          title: form.title,
          examId: form.examId,
          subjectIds: allSubjects ? undefined : selectedSubjects,
          durationMin: Number(form.durationMin),
          editionYear: Number(form.editionYear),
          seed: form.seed,
          startsAt: toIso(form.startsAt),
          closeAt: toIso(form.closeAt),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; mock?: MockConfig };
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Failed to publish mock");
      toast({ title: editingMockId ? "Mock updated" : "Mock published", description: data.mock?.title });
      setEditingMockId(null);
      setForm((f) => ({ ...f, examId: makeExamId(), seed: makeSeed(), title: "" }));
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

  function startEdit(m: MockConfig) {
    setEditingMockId(m.id);
    setForm({
      title: m.title,
      examId: m.examId,
      durationMin: String(m.durationMin),
      editionYear: String(m.editionYear),
      seed: m.seed,
      startsAt: m.startsAt.slice(0, 16),
      closeAt: m.closeAt.slice(0, 16),
    });
    setAllSubjects(!m.subjectIds);
    setSelectedSubjects(m.subjectIds ?? []);
  }

  async function deleteMock(id: string) {
    try {
      const res = await authedFetch(`/api/mock/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Failed to delete mock");
      toast({ title: "Mock deleted" });
      await load();
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  async function removeReport(id: string) {
    try {
      const res = await authedFetch(`/api/reports/${encodeURIComponent(id)}/delete`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to delete report");
      toast({ title: "Report deleted" });
      await load();
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "Unknown error" });
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
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Bravo Console</CardTitle>
            <CardDescription>Staff sign-in is required.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              placeholder="Staff token"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void signIn()}
            />
            <Button className="w-full" onClick={() => void signIn()}>Sign in</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openCount = reports.filter((r) => r.status === "open").length;
  const tabs = [
    can("mock_manage") ? "mock" : null,
    can("reports_review") ? "reports" : null,
    me?.isSuperAdmin ? "staff" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 text-black dark:text-white">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Bravo Console</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {me?.name} {me?.isSuperAdmin ? "· super admin" : `· ${me?.permissions.join(", ")}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setAuthed(false); setStaffToken(""); setMe(null); }}>Sign out</Button>
      </header>

      <Tabs defaultValue={tabs[0]} className="w-full">
        <TabsList className="mb-4">
          {can("mock_manage") && <TabsTrigger value="mock">Mock</TabsTrigger>}
          {can("reports_review") && <TabsTrigger value="reports">Reports {openCount > 0 && <Badge className="ml-2">{openCount}</Badge>}</TabsTrigger>}
          {me?.isSuperAdmin && <TabsTrigger value="staff">Staff</TabsTrigger>}
        </TabsList>

        {can("mock_manage") && (
          <TabsContent value="mock" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Current mock event</CardTitle>
                  <CardDescription>{mock ? "Live now — clients can start within the window." : "No active mock event."}</CardDescription>
                </div>
                {mock && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEdit(mock)}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={endMock}>End now</Button>
                    <Button variant="outline" size="sm" onClick={() => deleteMock(mock.id)}>Delete</Button>
                  </div>
                )}
              </CardHeader>
              {mock && (
                <CardContent className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="secondary">{mock.examId}</Badge>
                  <Badge variant="secondary">Edition {mock.editionYear}</Badge>
                  <Badge variant="secondary">{mock.durationMin} min</Badge>
                  <Badge variant="secondary">seed {mock.seed}</Badge>
                  {mock.subjectIds?.map((s) => <Badge key={s} variant="outline">{s}{mock.countPerSubject ? ` ×${mock.countPerSubject}` : ""}</Badge>)}
                  <Badge variant="outline">starts {mock.startsAt}</Badge>
                  <Badge variant="outline">closes {mock.closeAt}</Badge>
                  <span className="w-full font-semibold">{mock.title}</span>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{editingMockId ? "Edit mock event" : "Publish mock event"}</CardTitle>
                <CardDescription>
                  {editingMockId
                    ? "Editable only before the event starts and while no scores exist."
                    : "Scheduled or immediate. closeAt is a hard cutoff."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                  <div>
                    <Label>Exam ID (auto-generated)</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={form.examId} className="bg-black/5 dark:bg-white/5" />
                      <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, examId: makeExamId() })}>New</Button>
                    </div>
                  </div>
                  <div><Label>Duration (min)</Label><Input type="number" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} /></div>
                  <div><Label>Edition year</Label><Input type="number" value={form.editionYear} onChange={(e) => setForm({ ...form, editionYear: e.target.value })} /></div>
                  <div>
                    <Label>Seed (auto-generated, editable)</Label>
                    <div className="flex gap-2">
                      <Input value={form.seed} onChange={(e) => setForm({ ...form, seed: e.target.value })} />
                      <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, seed: makeSeed() })}>Random</Button>
                    </div>
                    <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                      The seed deterministically shuffles/selects questions from those already installed in the app, so every student gets a reproducible paper for this event.
                    </p>
                  </div>
                  <div>
                    <Label>Starts at</Label>
                    <Input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(e) => {
                        const startsAt = e.target.value;
                        setForm((f) => {
                          // suggest close = start + duration to avoid invalid windows
                          const dur = Number(f.durationMin) || 60;
                          const d = new Date(startsAt);
                          const closeAt = Number.isNaN(d.getTime()) ? f.closeAt : new Date(d.getTime() + dur * 60000).toISOString().slice(0, 16);
                          return { ...f, startsAt, closeAt };
                        });
                      }}
                    />
                  </div>
                  <div><Label>Close at (hard cutoff)</Label><Input type="datetime-local" value={form.closeAt} onChange={(e) => setForm({ ...form, closeAt: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Subjects</Label>
                  <label className="mt-2 flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={allSubjects} onChange={(e) => setAllSubjects(e.target.checked)} />
                    All subjects
                  </label>
                  {!allSubjects && (
                    <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                      {availableSubjects.map((sub) => (
                        <label key={sub} className="flex cursor-pointer items-center gap-1 rounded-full border border-black/15 px-3 py-1 text-xs dark:border-white/15">
                          <input
                            type="checkbox"
                            checked={selectedSubjects.includes(sub)}
                            onChange={(e) => setSelectedSubjects((prev) => (e.target.checked ? [...prev, sub] : prev.filter((x) => x !== sub)))}
                          />
                          {sub}
                        </label>
                      ))}
                      {availableSubjects.length === 0 && <span className="text-xs text-black/50">No subjects found.</span>}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={publish}>{editingMockId ? "Save changes" : "Publish event"}</Button>
                  {editingMockId && <Button variant="outline" onClick={() => { setEditingMockId(null); setForm((f) => ({ ...f, examId: makeExamId(), seed: makeSeed(), title: "" })); }}>Cancel</Button>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Results &amp; ranking</CardTitle>
                <CardDescription>Scores per mock event (leaderboard-safe fields only). Pick an event to view its ranking.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {history.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {history.map((e) => (
                      <span key={e.id} className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant={resultsEventId === e.id ? "default" : "outline"}
                          onClick={() => setResultsEventId(e.id)}
                        >
                          {e.title} {e.status === "ended" ? "(ended)" : "(live)"}
                        </Button>
                        <code className="text-[10px] text-black/40 dark:text-white/40" title={e.id}>{e.id.slice(0, 8)}…</code>
                        <Button size="sm" variant="ghost" onClick={() => deleteMock(e.id)}>✕</Button>
                      </span>
                    ))}
                  </div>
                )}
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-black/60 dark:text-white/60">No scores submitted for this event yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-black/10 text-left dark:border-white/10">
                        <th className="py-2 pr-4">#</th><th className="py-2 pr-4">Product ID</th><th className="py-2 pr-4">Score</th><th className="py-2">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((e, i) => (
                        <tr key={e.productId} className="border-b border-black/5 dark:border-white/5">
                          <td className="py-2 pr-4">{i + 1}</td>
                          <td className="py-2 pr-4 font-mono text-xs">{e.productId}</td>
                          <td className="py-2 pr-4 font-semibold">{e.score}/{e.total}</td>
                          <td className="py-2 text-xs text-black/50 dark:text-white/50">{e.submittedAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {can("reports_review") && (
          <TabsContent value="reports">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Reports</CardTitle>
                  <CardDescription>Student question reports and general feedback.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
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
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <p className="text-sm text-black/60 dark:text-white/60">No reports.</p>
                ) : (
                  <ul className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                    {reports.map((r) => (
                      <li key={r.id} className="rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge variant={r.status === "open" ? "default" : "secondary"}>{r.category}</Badge>
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
                        <div className="mt-2 flex gap-2">
                          {r.status === "open" && <Button size="sm" onClick={() => resolve(r.id)}>Mark reviewed</Button>}
                          <Button size="sm" variant="outline" onClick={() => removeReport(r.id)}>Delete</Button>
                        </div>
                        {r.status === "resolved" && <p className="mt-2 text-xs text-black/50 dark:text-white/50">Resolved {r.resolved_at}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {me?.isSuperAdmin && (
          <TabsContent value="staff">
            <Card>
              <CardHeader>
                <CardTitle>Staff accounts</CardTitle>
                <CardDescription>Add staff with permission levels, or revoke access instantly.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                        <strong>{s.name}</strong> · {s.permissions.join(", ")} ·{" "}
                        {s.active ? <Badge variant="secondary">active</Badge> : <Badge variant="outline">revoked {s.revoked_at ?? ""}</Badge>}
                      </span>
                      {s.active && <Button size="sm" variant="destructive" onClick={() => revoke(s.id)}>Revoke</Button>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
