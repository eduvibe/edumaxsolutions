"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseAccessToken, getSupabaseBrowserClientOrNull } from "@/lib/platform/supabaseBrowser";
import { useCallback, useEffect, useMemo, useState } from "react";

type Role = "student" | "teacher" | "admin";

type SubjectRow = { id: string; name: string; slug: string; key_stages: string[] | null; is_new: boolean | null };
type TopicRow = {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  description: string | null;
  year_group: string | null;
  thread: string | null;
  school_section: string | null;
  lesson_count: number | null;
};
type LessonRow = { id: string; topic_id: string; lesson_number: number; title: string; objective: string | null };

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

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

export function AdminCurriculumClient() {
  const supabase = useMemo(() => getSupabaseBrowserClientOrNull(), []);
  const { toast } = useToast();

  const [role, setRole] = useState<Role>("student");
  const [loadingRole, setLoadingRole] = useState(true);

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);

  const [selectedSubjectSlug, setSelectedSubjectSlug] = useState("");
  const [selectedTopicSlug, setSelectedTopicSlug] = useState("");

  const [subjectName, setSubjectName] = useState("");
  const [subjectSlug, setSubjectSlug] = useState("");

  const [topicName, setTopicName] = useState("");
  const [topicSlug, setTopicSlug] = useState("");
  const [schoolSection, setSchoolSection] = useState<"primary" | "jss" | "sss">("primary");
  const [yearGroup, setYearGroup] = useState("");

  const [lessonText, setLessonText] = useState("");

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPasted, setCsvPasted] = useState("");

  const [busy, setBusy] = useState(false);

  function yearGroupOptions(section: "primary" | "jss" | "sss") {
    if (section === "primary") return ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];
    if (section === "jss") return ["Year 7", "Year 8", "Year 9"];
    return ["Year 10", "Year 11", "Year 12"];
  }

  useEffect(() => {
    let cancelled = false;
    async function loadRole() {
      setLoadingRole(true);
      if (!supabase) {
        if (!cancelled) {
          setRole("student");
          setLoadingRole(false);
        }
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user ?? null;
      if (!user) {
        if (!cancelled) {
          setRole("student");
          setLoadingRole(false);
        }
        return;
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      const r = (data as { role?: string } | null)?.role;
      if (!cancelled) setRole(r === "admin" || r === "teacher" || r === "student" ? (r as Role) : "student");
      if (!cancelled) setLoadingRole(false);
    }
    void loadRole();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const loadSubjects = useCallback(async () => {
    try {
      const res = await fetch("/api/curriculum/subjects");
      const data = (await res.json().catch(() => ({}))) as { subjects?: SubjectRow[] };
      setSubjects(data.subjects ?? []);
      if (!selectedSubjectSlug && (data.subjects?.[0]?.slug ?? "")) setSelectedSubjectSlug(data.subjects?.[0]?.slug ?? "");
    } catch {
      setSubjects([]);
    }
  }, [selectedSubjectSlug]);

  const loadTopics = useCallback(async () => {
    if (!selectedSubjectSlug) {
      setTopics([]);
      return;
    }
    try {
      const res = await fetch(`/api/curriculum/topics?subjectSlug=${encodeURIComponent(selectedSubjectSlug)}`);
      const data = (await res.json().catch(() => ({}))) as { topics?: TopicRow[] };
      setTopics(data.topics ?? []);
      const firstSlug = data.topics?.[0]?.slug ?? "";
      if (!selectedTopicSlug && firstSlug) setSelectedTopicSlug(firstSlug);
    } catch {
      setTopics([]);
    }
  }, [selectedSubjectSlug, selectedTopicSlug]);

  const loadLessons = useCallback(async () => {
    if (!selectedTopicSlug) {
      setLessons([]);
      return;
    }
    try {
      const res = await fetch(`/api/curriculum/topics/${encodeURIComponent(selectedTopicSlug)}/lessons`);
      const data = (await res.json().catch(() => ({}))) as { lessons?: LessonRow[] };
      setLessons(data.lessons ?? []);
    } catch {
      setLessons([]);
    }
  }, [selectedTopicSlug]);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    void loadTopics();
  }, [loadTopics]);

  useEffect(() => {
    void loadLessons();
  }, [loadLessons]);

  async function createSubject() {
    if (role !== "admin") {
      toast({ title: "Admin only", description: "Only admin can create subjects." });
      return;
    }
    const name = subjectName.trim();
    const slug = (subjectSlug.trim() || slugify(name)).trim();
    if (!name || !slug) return;
    setBusy(true);
    try {
      await authedFetchJson("/api/curriculum/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, keyStages: [] }),
      });
      toast({ title: "Subject created" });
      setSubjectName("");
      setSubjectSlug("");
      await loadSubjects();
      setSelectedSubjectSlug(slug);
    } catch (e) {
      toast({ title: "Create failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  async function createTopic() {
    if (!selectedSubjectSlug) return;
    const name = topicName.trim();
    const slug = (topicSlug.trim() || slugify(name)).trim();
    if (!name || !slug) return;
    setBusy(true);
    try {
      await authedFetchJson("/api/curriculum/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectSlug: selectedSubjectSlug,
          name,
          slug,
          description: null,
          yearGroup: yearGroup.trim() || null,
          thread: null,
          schoolSection,
          lessonCount: null,
        }),
      });
      toast({ title: "Topic created" });
      setTopicName("");
      setTopicSlug("");
      await loadTopics();
      setSelectedTopicSlug(slug);
    } catch (e) {
      toast({ title: "Create failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  async function addLessons() {
    if (!selectedTopicSlug) return;
    const lines = lessonText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return;

    const start = (lessons.at(-1)?.lesson_number ?? 0) + 1;
    const payload = lines.map((t, idx) => ({ lessonNumber: start + idx, title: t, objective: null }));

    setBusy(true);
    try {
      await authedFetchJson(`/api/curriculum/topics/${encodeURIComponent(selectedTopicSlug)}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessons: payload }),
      });
      toast({ title: "Lessons added" });
      setLessonText("");
      await loadLessons();
    } catch (e) {
      toast({ title: "Add failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  if (loadingRole) {
    return (
      <div className="rounded-3xl border border-black/10 bg-white/10 p-6 text-sm text-black/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white/70">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5 space-y-4">
        <div className="text-sm font-semibold text-black/80 dark:text-white/80">Subjects</div>

        {role === "admin" ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
            <Input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Subject name" />
            <Input value={subjectSlug} onChange={(e) => setSubjectSlug(e.target.value)} placeholder="Slug (optional)" />
            <Button
              type="button"
              disabled={busy || !subjectName.trim()}
              className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              onClick={() => void createSubject()}
            >
              Create subject
            </Button>
          </div>
        ) : (
          <div className="text-sm text-black/70 dark:text-white/70">Only admin can create subjects.</div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <Select value={selectedSubjectSlug} onValueChange={(v) => {
            setSelectedSubjectSlug(v);
            setSelectedTopicSlug("");
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.slug}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="secondary"
            className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
            onClick={() => void loadSubjects()}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5 space-y-4">
        <div className="text-sm font-semibold text-black/80 dark:text-white/80">Topics</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <Input value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="Topic name" />
          <Input value={topicSlug} onChange={(e) => setTopicSlug(e.target.value)} placeholder="Slug (optional)" />
          <Select value={yearGroup} onValueChange={(v) => setYearGroup(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Class level" />
            </SelectTrigger>
            <SelectContent>
              {yearGroupOptions(schoolSection).map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={schoolSection}
            onValueChange={(v) => {
              if (v === "primary" || v === "jss" || v === "sss") setSchoolSection(v);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">primary</SelectItem>
              <SelectItem value="jss">jss</SelectItem>
              <SelectItem value="sss">sss</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            disabled={busy || !selectedSubjectSlug || !topicName.trim()}
            className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            onClick={() => void createTopic()}
          >
            Create topic
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <Select value={selectedTopicSlug} onValueChange={(v) => setSelectedTopicSlug(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select topic" />
            </SelectTrigger>
            <SelectContent>
              {topics.map((t) => (
                <SelectItem key={t.id} value={t.slug}>
                  {t.year_group ? `${t.year_group} • ` : ""}{t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="secondary"
            className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
            onClick={() => void loadTopics()}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5 space-y-4">
        <div className="text-sm font-semibold text-black/80 dark:text-white/80">Lessons (sub-topics)</div>

        <textarea
          value={lessonText}
          onChange={(e) => setLessonText(e.target.value)}
          placeholder="Paste lesson titles, one per line"
          className="w-full min-h-[120px] rounded-xl border border-black/10 bg-white/65 px-3 py-2 text-sm text-black shadow-sm outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy || !selectedTopicSlug || !lessonText.trim()}
            className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            onClick={() => void addLessons()}
          >
            Add lessons
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
            onClick={() => void loadLessons()}
            disabled={!selectedTopicSlug}
          >
            Refresh
          </Button>
        </div>

        <div className="divide-y divide-black/10 overflow-hidden rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
          {lessons.length === 0 ? (
            <div className="p-4 text-sm text-black/70 dark:text-white/70">No lessons yet.</div>
          ) : (
            lessons.map((l) => (
              <div key={l.id} className="px-4 py-3">
                <div className="text-sm font-semibold text-black dark:text-white">
                  Lesson {l.lesson_number}: {l.title}
                </div>
                {l.objective ? <div className="mt-0.5 text-xs text-black/60 dark:text-white/60">{l.objective}</div> : null}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5 space-y-4">
        <div className="text-sm font-semibold text-black/80 dark:text-white/80">Bulk import (CSV)</div>
        <div className="text-sm text-black/70 dark:text-white/70">
          Columns: subject, subject_slug (optional), section (primary/jss/sss), year_group, topic, topic_slug (optional), lessons. Lessons use | as separator.
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Input type="file" accept=".csv,text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
          <div className="text-sm text-black/70 dark:text-white/70">Or paste CSV:</div>
          <textarea
            value={csvPasted}
            onChange={(e) => setCsvPasted(e.target.value)}
            placeholder={'subject,section,year_group,topic,lessons\nMathematics,jss,Year 7,Algebra,"Introduction|Indices|Linear equations"'}
            className="w-full min-h-[120px] rounded-xl border border-black/10 bg-white/65 px-3 py-2 text-sm text-black shadow-sm outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy || role !== "admin" || (!csvFile && !csvPasted.trim())}
            className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            onClick={() => {
              void (async () => {
                if (role !== "admin") {
                  toast({ title: "Admin only" });
                  return;
                }
                setBusy(true);
                try {
                  const token = await getSupabaseAccessToken();
                  if (!token) throw new Error("Sign in required");
                  const form = new FormData();
                  if (csvFile) form.append("file", csvFile);
                  if (csvPasted.trim()) form.append("csv", csvPasted);
                  const res = await fetch("/api/curriculum/import", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
                  const data = (await res.json().catch(() => ({}))) as { error?: string; subjects?: number; topics?: number; lessons?: number };
                  if (!res.ok) throw new Error(data.error ?? "Import failed");
                  toast({ title: "Import complete", description: `${data.subjects ?? 0} subjects, ${data.topics ?? 0} topics, ${data.lessons ?? 0} lessons` });
                  setCsvFile(null);
                  setCsvPasted("");
                  await loadSubjects();
                  await loadTopics();
                  await loadLessons();
                } catch (e) {
                  toast({ title: "Import failed", description: e instanceof Error ? e.message : "Unknown error" });
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            Import CSV
          </Button>
        </div>
      </div>
    </div>
  );
}
