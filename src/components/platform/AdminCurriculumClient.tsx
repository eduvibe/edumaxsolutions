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

type SubjectSections = { primary: boolean; jss: boolean; sss: boolean };

function keyStagesFromSections(s: SubjectSections): string[] {
  const ks: string[] = [];
  if (s.primary) ks.push("KS1", "KS2");
  if (s.jss) ks.push("KS3");
  if (s.sss) ks.push("KS4");
  return Array.from(new Set(ks));
}

function sectionsFromKeyStages(keyStages: string[] | null | undefined): SubjectSections {
  const ks = new Set(keyStages ?? []);
  return { primary: ks.has("KS1") || ks.has("KS2"), jss: ks.has("KS3"), sss: ks.has("KS4") };
}

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
  const [subjectEditName, setSubjectEditName] = useState("");
  const [subjectSections, setSubjectSections] = useState<SubjectSections>({ primary: true, jss: true, sss: true });
  const [subjectEditSections, setSubjectEditSections] = useState<SubjectSections>({ primary: true, jss: true, sss: true });

  const [topicName, setTopicName] = useState("");
  const [topicSlug, setTopicSlug] = useState("");
  const [schoolSection, setSchoolSection] = useState<"primary" | "jss" | "sss">("primary");
  const [yearGroup, setYearGroup] = useState("");
  const [topicEditName, setTopicEditName] = useState("");
  const [topicEditSchoolSection, setTopicEditSchoolSection] = useState<"primary" | "jss" | "sss">("primary");
  const [topicEditYearGroup, setTopicEditYearGroup] = useState("");
  const [topicEditThread, setTopicEditThread] = useState("");
  const [topicEditDescription, setTopicEditDescription] = useState("");

  const [lessonText, setLessonText] = useState("");
  const [editingLessonNumber, setEditingLessonNumber] = useState<number | null>(null);
  const [lessonEditTitle, setLessonEditTitle] = useState("");
  const [lessonEditObjective, setLessonEditObjective] = useState("");

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

  const selectedSubject = useMemo(() => subjects.find((s) => s.slug === selectedSubjectSlug) ?? null, [subjects, selectedSubjectSlug]);
  const selectedTopic = useMemo(() => topics.find((t) => t.slug === selectedTopicSlug) ?? null, [topics, selectedTopicSlug]);

  useEffect(() => {
    setSubjectEditName(selectedSubject?.name ?? "");
    setSubjectEditSections(sectionsFromKeyStages(selectedSubject?.key_stages ?? null));
  }, [selectedSubject]);

  useEffect(() => {
    if (!selectedTopic) {
      setTopicEditName("");
      setTopicEditYearGroup("");
      setTopicEditSchoolSection("primary");
      setTopicEditThread("");
      setTopicEditDescription("");
      return;
    }
    setTopicEditName(selectedTopic.name ?? "");
    setTopicEditYearGroup(selectedTopic.year_group ?? "");
    setTopicEditThread(selectedTopic.thread ?? "");
    setTopicEditDescription(selectedTopic.description ?? "");
    if (selectedTopic.school_section === "primary" || selectedTopic.school_section === "jss" || selectedTopic.school_section === "sss") {
      setTopicEditSchoolSection(selectedTopic.school_section);
    } else {
      setTopicEditSchoolSection("primary");
    }
  }, [selectedTopic]);

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
    if (keyStagesFromSections(subjectSections).length === 0) {
      toast({ title: "Select a section", description: "Choose where this subject should appear: Primary, JSS, and/or SSS." });
      return;
    }
    setBusy(true);
    try {
      await authedFetchJson("/api/curriculum/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, keyStages: keyStagesFromSections(subjectSections) }),
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

  async function updateSelectedSubject() {
    if (role !== "admin") {
      toast({ title: "Admin only" });
      return;
    }
    if (!selectedSubjectSlug) return;
    const name = subjectEditName.trim();
    if (!name) return;
    if (keyStagesFromSections(subjectEditSections).length === 0) {
      toast({ title: "Select a section", description: "Choose where this subject should appear: Primary, JSS, and/or SSS." });
      return;
    }
    setBusy(true);
    try {
      await authedFetchJson(`/api/curriculum/subjects/${encodeURIComponent(selectedSubjectSlug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, keyStages: keyStagesFromSections(subjectEditSections) }),
      });
      toast({ title: "Subject updated" });
      await loadSubjects();
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelectedSubject() {
    if (role !== "admin") {
      toast({ title: "Admin only" });
      return;
    }
    if (!selectedSubjectSlug) return;
    const ok = window.confirm("Delete this subject? This will also delete its topics and lessons.");
    if (!ok) return;
    setBusy(true);
    try {
      await authedFetchJson(`/api/curriculum/subjects/${encodeURIComponent(selectedSubjectSlug)}`, { method: "DELETE" });
      toast({ title: "Subject deleted" });
      setSelectedSubjectSlug("");
      setSelectedTopicSlug("");
      await loadSubjects();
      setTopics([]);
      setLessons([]);
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "Unknown error" });
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

  async function updateSelectedTopic() {
    if (!selectedTopicSlug) return;
    if (!topicEditName.trim()) return;
    setBusy(true);
    try {
      await authedFetchJson(`/api/curriculum/topics/${encodeURIComponent(selectedTopicSlug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: topicEditName.trim(),
          description: topicEditDescription.trim() ? topicEditDescription.trim() : null,
          yearGroup: topicEditYearGroup.trim() ? topicEditYearGroup.trim() : null,
          thread: topicEditThread.trim() ? topicEditThread.trim() : null,
          schoolSection: topicEditSchoolSection,
        }),
      });
      toast({ title: "Topic updated" });
      await loadTopics();
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelectedTopic() {
    if (role !== "admin") {
      toast({ title: "Admin only" });
      return;
    }
    if (!selectedTopicSlug) return;
    const ok = window.confirm("Delete this topic? This will also delete its lessons.");
    if (!ok) return;
    setBusy(true);
    try {
      await authedFetchJson(`/api/curriculum/topics/${encodeURIComponent(selectedTopicSlug)}`, { method: "DELETE" });
      toast({ title: "Topic deleted" });
      setSelectedTopicSlug("");
      await loadTopics();
      setLessons([]);
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "Unknown error" });
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

  async function startEditLesson(lessonNumber: number) {
    const l = lessons.find((x) => x.lesson_number === lessonNumber);
    if (!l) return;
    setEditingLessonNumber(lessonNumber);
    setLessonEditTitle(l.title ?? "");
    setLessonEditObjective(l.objective ?? "");
  }

  async function saveLessonEdits() {
    if (!selectedTopicSlug) return;
    if (!editingLessonNumber) return;
    if (!lessonEditTitle.trim()) return;
    setBusy(true);
    try {
      await authedFetchJson(
        `/api/curriculum/topics/${encodeURIComponent(selectedTopicSlug)}/lessons/${encodeURIComponent(String(editingLessonNumber))}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: lessonEditTitle.trim(),
            objective: lessonEditObjective.trim() ? lessonEditObjective.trim() : null,
          }),
        }
      );
      toast({ title: "Lesson updated" });
      setEditingLessonNumber(null);
      await loadLessons();
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  async function deleteLesson(lessonNumber: number) {
    if (role !== "admin") {
      toast({ title: "Admin only", description: "Only admin can delete lessons." });
      return;
    }
    if (!selectedTopicSlug) return;
    const ok = window.confirm(`Delete lesson ${lessonNumber}?`);
    if (!ok) return;
    setBusy(true);
    try {
      await authedFetchJson(`/api/curriculum/topics/${encodeURIComponent(selectedTopicSlug)}/lessons/${encodeURIComponent(String(lessonNumber))}`, {
        method: "DELETE",
      });
      toast({ title: "Lesson deleted" });
      if (editingLessonNumber === lessonNumber) setEditingLessonNumber(null);
      await loadLessons();
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "Unknown error" });
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
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
              <Input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Subject name" />
              <Input value={subjectSlug} onChange={(e) => setSubjectSlug(e.target.value)} placeholder="Short link (optional)" />
              <Button
                type="button"
                disabled={busy || !subjectName.trim()}
                className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                onClick={() => void createSubject()}
              >
                Create subject
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-black/70 dark:text-white/70">
              <div className="font-semibold text-black/80 dark:text-white/80">Show under:</div>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={subjectSections.primary}
                  onChange={(e) => setSubjectSections((s) => ({ ...s, primary: e.target.checked }))}
                />
                Primary
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={subjectSections.jss} onChange={(e) => setSubjectSections((s) => ({ ...s, jss: e.target.checked }))} />
                JSS
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={subjectSections.sss} onChange={(e) => setSubjectSections((s) => ({ ...s, sss: e.target.checked }))} />
                SSS
              </label>
            </div>
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

        {selectedSubject ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
              <Input value={subjectEditName} onChange={(e) => setSubjectEditName(e.target.value)} placeholder="Subject name" disabled={role !== "admin"} />
              <Button
                type="button"
                disabled={busy || role !== "admin" || !subjectEditName.trim()}
                className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                onClick={() => void updateSelectedSubject()}
              >
                Save
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy || role !== "admin"}
                className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                onClick={() => void deleteSelectedSubject()}
              >
                Delete
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-black/70 dark:text-white/70">
              <div className="font-semibold text-black/80 dark:text-white/80">Show under:</div>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={subjectEditSections.primary}
                  onChange={(e) => setSubjectEditSections((s) => ({ ...s, primary: e.target.checked }))}
                  disabled={role !== "admin"}
                />
                Primary
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={subjectEditSections.jss}
                  onChange={(e) => setSubjectEditSections((s) => ({ ...s, jss: e.target.checked }))}
                  disabled={role !== "admin"}
                />
                JSS
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={subjectEditSections.sss}
                  onChange={(e) => setSubjectEditSections((s) => ({ ...s, sss: e.target.checked }))}
                  disabled={role !== "admin"}
                />
                SSS
              </label>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5 space-y-4">
        <div className="text-sm font-semibold text-black/80 dark:text-white/80">Topics</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <Input value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="Topic name" />
          <Input value={topicSlug} onChange={(e) => setTopicSlug(e.target.value)} placeholder="Short link (optional)" />
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

        {selectedTopic ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-sm font-semibold text-black/80 dark:text-white/80">Topic name</div>
              <Input value={topicEditName} onChange={(e) => setTopicEditName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-semibold text-black/80 dark:text-white/80">Thread (optional)</div>
              <Input value={topicEditThread} onChange={(e) => setTopicEditThread(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-semibold text-black/80 dark:text-white/80">Section</div>
              <Select
                value={topicEditSchoolSection}
                onValueChange={(v) => {
                  if (v === "primary" || v === "jss" || v === "sss") setTopicEditSchoolSection(v);
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
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-semibold text-black/80 dark:text-white/80">Class level</div>
              <Select
                value={topicEditYearGroup ? topicEditYearGroup : "__none__"}
                onValueChange={(v) => setTopicEditYearGroup(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Optional</SelectItem>
                  {yearGroupOptions(topicEditSchoolSection).map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 grid gap-2">
              <div className="text-sm font-semibold text-black/80 dark:text-white/80">Description (optional)</div>
              <Input value={topicEditDescription} onChange={(e) => setTopicEditDescription(e.target.value)} />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy || !topicEditName.trim()}
                className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                onClick={() => void updateSelectedTopic()}
              >
                Save topic
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy || role !== "admin"}
                className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                onClick={() => void deleteSelectedTopic()}
              >
                Delete topic
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5 space-y-4">
        <div className="text-sm font-semibold text-black/80 dark:text-white/80">Sub-topics (lessons)</div>

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
                {editingLessonNumber === l.lesson_number ? (
                  <div className="grid gap-2">
                    <Input value={lessonEditTitle} onChange={(e) => setLessonEditTitle(e.target.value)} placeholder="Lesson title" />
                    <Input value={lessonEditObjective} onChange={(e) => setLessonEditObjective(e.target.value)} placeholder="Objective (optional)" />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled={busy || !lessonEditTitle.trim()}
                        className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                        onClick={() => void saveLessonEdits()}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                        onClick={() => setEditingLessonNumber(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || role !== "admin"}
                        className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                        onClick={() => void deleteLesson(l.lesson_number)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-black dark:text-white">
                        Lesson {l.lesson_number}: {l.title}
                      </div>
                      {l.objective ? <div className="mt-0.5 text-xs text-black/60 dark:text-white/60">{l.objective}</div> : null}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                        onClick={() => void startEditLesson(l.lesson_number)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || role !== "admin"}
                        className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                        onClick={() => void deleteLesson(l.lesson_number)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-black/80 dark:text-white/80">Upload curriculum</div>
          <Button
            asChild
            variant="secondary"
            className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
          >
            <a href="/curriculum-upload-template.csv" download>
              Download template
            </a>
          </Button>
        </div>
        <div className="text-sm text-black/70 dark:text-white/70">
          Upload a spreadsheet saved as CSV. Lessons use | as separator.
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Input type="file" accept=".csv,text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
          <div className="text-sm text-black/70 dark:text-white/70">Or paste CSV content:</div>
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
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
}
