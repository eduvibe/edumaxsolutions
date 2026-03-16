"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseBrowserClient } from "@/lib/platform/supabaseBrowser";
import { BookOpen, FileText, GraduationCap, LayoutGrid, NotebookPen, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type RecentNoteRow = { id: string; title: string; views: number; date_created?: string | null };
type RecentMcqRow = { id: string; question_text: string; date_created?: string | null };

export function TutorDashboardClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState<string | null>(null);
  const [recentNotes, setRecentNotes] = useState<RecentNoteRow[]>([]);
  const [recentMcqs, setRecentMcqs] = useState<RecentMcqRow[]>([]);
  const [noteCount, setNoteCount] = useState(0);
  const [mcqCount, setMcqCount] = useState(0);
  const [essayCount, setEssayCount] = useState(0);
  const [templateCount, setTemplateCount] = useState(0);
  const [videoCount, setVideoCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user ?? null;
      if (!user) {
        if (!cancelled) {
          toast({ title: "Sign in required", description: "Please sign in again to access tutor tools." });
          router.push("/learn/teacher/login");
        }
        return;
      }
      if (!cancelled) setEmail(user.email ?? null);

      const [recentNotesRes, recentMcqsRes, noteCountRes, mcqRes, essayRes, tplRes, videoRes] = await Promise.all([
        supabase
          .from("notes")
          .select("id,title,views,date_created")
          .eq("author_id", user.id)
          .order("date_created", { ascending: false })
          .limit(6),
        supabase
          .from("mcq_questions")
          .select("id,question_text,date_created")
          .eq("author_id", user.id)
          .order("date_created", { ascending: false })
          .limit(6),
        supabase.from("notes").select("id", { count: "exact", head: true }).eq("author_id", user.id),
        supabase.from("mcq_questions").select("id", { count: "exact", head: true }).eq("author_id", user.id),
        supabase.from("essay_questions").select("id", { count: "exact", head: true }).eq("author_id", user.id),
        supabase.from("templates").select("id", { count: "exact", head: true }).eq("uploaded_by", user.id),
        supabase.from("lesson_videos").select("id", { count: "exact", head: true }).eq("author_id", user.id),
      ]);

      if (cancelled) return;
      if (recentNotesRes.error) {
        toast({ title: "Failed to load recent notes", description: recentNotesRes.error.message });
      } else {
        setRecentNotes((recentNotesRes.data ?? []) as RecentNoteRow[]);
      }
      if (recentMcqsRes.error) {
        toast({ title: "Failed to load recent MCQs", description: recentMcqsRes.error.message });
      } else {
        setRecentMcqs((recentMcqsRes.data ?? []) as RecentMcqRow[]);
      }
      setNoteCount(noteCountRes.count ?? 0);
      setMcqCount(mcqRes.count ?? 0);
      setEssayCount(essayRes.count ?? 0);
      setTemplateCount(tplRes.count ?? 0);
      setVideoCount(videoRes.count ?? 0);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router, supabase, toast]);

  async function signOut() {
    await supabase.auth.signOut();
    await fetch("/api/session/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "student" }),
    });
    router.push("/learn/subjects?section=primary");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/5 via-transparent to-black/0 dark:from-white/10 dark:to-white/0" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/10 px-3 py-1 text-xs font-semibold text-black/70 dark:border-white/10 dark:text-white/70">
              <LayoutGrid className="h-3.5 w-3.5" />
              Tutor workspace
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-black dark:text-white md:text-4xl">Dashboard</h1>
            <div className="text-sm text-black/70 dark:text-white/70">{email ? `Signed in as ${email}` : ""}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              variant="secondary"
              className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
            >
              <Link href="/learn/subjects?section=primary">
                <BookOpen className="mr-2 h-4 w-4" />
                Browse curriculum
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
            >
              <Link href="/learn/templates">
                <Upload className="mr-2 h-4 w-4" />
                Templates library
              </Link>
            </Button>
            <Button
              variant="secondary"
              className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/learn/teacher/create-note"
          className="group rounded-2xl border border-black/10 bg-white/10 p-5 backdrop-blur-md transition-colors hover:bg-white/20 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-black/80 dark:text-white/80">Create note</div>
              <div className="mt-1 text-sm text-black/70 dark:text-white/70">Write a clear lesson note for a sub-topic.</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/40 text-black dark:bg-white/10 dark:text-white">
              <NotebookPen className="h-5 w-5" />
            </div>
          </div>
        </Link>

        <Link
          href="/learn/teacher/create-question"
          className="group rounded-2xl border border-black/10 bg-white/10 p-5 backdrop-blur-md transition-colors hover:bg-white/20 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-black/80 dark:text-white/80">Create MCQ</div>
              <div className="mt-1 text-sm text-black/70 dark:text-white/70">Add practice questions with answers.</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/40 text-black dark:bg-white/10 dark:text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>
        </Link>

        <Link
          href="/learn/teacher/create-essay"
          className="group rounded-2xl border border-black/10 bg-white/10 p-5 backdrop-blur-md transition-colors hover:bg-white/20 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-black/80 dark:text-white/80">Create essay</div>
              <div className="mt-1 text-sm text-black/70 dark:text-white/70">Publish prompts for long-form answers.</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/40 text-black dark:bg-white/10 dark:text-white">
              <FileText className="h-5 w-5" />
            </div>
          </div>
        </Link>

        <Link
          href="/learn/teacher/upload-template?type=slides"
          className="group rounded-2xl border border-black/10 bg-white/10 p-5 backdrop-blur-md transition-colors hover:bg-white/20 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-black/80 dark:text-white/80">Upload template</div>
              <div className="mt-1 text-sm text-black/70 dark:text-white/70">Share a PowerPoint deck with thumbnail.</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/40 text-black dark:bg-white/10 dark:text-white">
              <Upload className="h-5 w-5" />
            </div>
          </div>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="grid grid-cols-2 gap-4 lg:col-span-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-black/10 bg-white/10 p-5 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
            <div className="text-sm font-semibold text-black/70 dark:text-white/70">Your contributions</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-black/10 bg-white/10 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs font-semibold text-black/60 dark:text-white/60">Notes</div>
                <div className="mt-1 text-2xl font-extrabold tracking-tight text-black dark:text-white">{loading ? "…" : noteCount}</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white/10 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs font-semibold text-black/60 dark:text-white/60">MCQs</div>
                <div className="mt-1 text-2xl font-extrabold tracking-tight text-black dark:text-white">{loading ? "…" : mcqCount}</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white/10 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs font-semibold text-black/60 dark:text-white/60">Essays</div>
                <div className="mt-1 text-2xl font-extrabold tracking-tight text-black dark:text-white">{loading ? "…" : essayCount}</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white/10 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs font-semibold text-black/60 dark:text-white/60">Templates</div>
                <div className="mt-1 text-2xl font-extrabold tracking-tight text-black dark:text-white">{loading ? "…" : templateCount}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-black/60 dark:text-white/60">
              Videos: {loading ? "…" : videoCount}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white/10 p-5 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-black/80 dark:text-white/80">Recent notes</div>
                  <div className="mt-1 text-sm text-black/70 dark:text-white/70">Latest notes you published.</div>
                </div>
                <Button
                  asChild
                  variant="secondary"
                  className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                >
                  <Link href="/learn/teacher/create-note">New note</Link>
                </Button>
              </div>

              <div className="mt-4 divide-y divide-black/10 overflow-hidden rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
                {recentNotes.length === 0 ? (
                  <div className="p-4 text-sm text-black/70 dark:text-white/70">No notes yet.</div>
                ) : (
                  recentNotes.map((n) => (
                    <Link
                      key={n.id}
                      href={`/learn/notes/${n.id}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-white/10"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-black dark:text-white">{n.title}</div>
                        <div className="mt-0.5 text-xs text-black/60 dark:text-white/60">
                          {n.date_created ? new Date(n.date_created).toLocaleDateString() : ""}
                        </div>
                      </div>
                      <div className="shrink-0 rounded-full border border-black/10 bg-white/10 px-3 py-1 text-xs font-semibold text-black/70 dark:border-white/10 dark:text-white/70">
                        {n.views} views
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/10 p-5 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-black/80 dark:text-white/80">Recent MCQs</div>
                  <div className="mt-1 text-sm text-black/70 dark:text-white/70">Edit questions you created.</div>
                </div>
                <Button
                  asChild
                  variant="secondary"
                  className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                >
                  <Link href="/learn/teacher/create-question">New MCQ</Link>
                </Button>
              </div>

              <div className="mt-4 divide-y divide-black/10 overflow-hidden rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
                {recentMcqs.length === 0 ? (
                  <div className="p-4 text-sm text-black/70 dark:text-white/70">No MCQs yet.</div>
                ) : (
                  recentMcqs.map((q) => (
                    <div key={q.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-black dark:text-white">{q.question_text}</div>
                        <div className="mt-0.5 text-xs text-black/60 dark:text-white/60">
                          {q.date_created ? new Date(q.date_created).toLocaleDateString() : ""}
                        </div>
                      </div>
                      <Button
                        asChild
                        variant="secondary"
                        className="shrink-0 rounded-md border-2 border-black bg-transparent px-3 text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                      >
                        <Link href={`/learn/teacher/questions/${q.id}/edit`}>Edit</Link>
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
