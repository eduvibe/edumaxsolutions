"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseBrowserClient } from "@/lib/platform/supabaseBrowser";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type NoteRow = { id: string; title: string; views: number; date_created?: string | null };

export function TutorDashboardClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [mcqCount, setMcqCount] = useState(0);
  const [templateCount, setTemplateCount] = useState(0);
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

      const [notesRes, mcqRes, tplRes] = await Promise.all([
        supabase.from("notes").select("id,title,views,date_created").eq("author_id", user.id).order("date_created", { ascending: false }).limit(10),
        supabase.from("mcq_questions").select("id", { count: "exact", head: true }).eq("author_id", user.id),
        supabase.from("templates").select("id", { count: "exact", head: true }).eq("uploaded_by", user.id),
      ]);

      if (cancelled) return;
      if (notesRes.error) {
        toast({ title: "Failed to load notes", description: notesRes.error.message });
      } else {
        setNotes((notesRes.data ?? []) as NoteRow[]);
      }
      setMcqCount(mcqRes.count ?? 0);
      setTemplateCount(tplRes.count ?? 0);
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
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Tutor dashboard</h1>
            <p className="mt-1 text-sm text-black/70 dark:text-white/70">{email ? `Signed in as ${email}` : ""}</p>
          </div>
          <Button
            variant="secondary"
            className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild className="rounded-full">
            <Link href="/learn/teacher/create-note">Create note</Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            className="rounded-full bg-black/5 text-black hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            <Link href="/learn/teacher/create-question">Create MCQ</Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            className="rounded-full bg-black/5 text-black hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            <Link href="/learn/teacher/upload-template">Upload template</Link>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-black/10 bg-transparent p-5 dark:border-white/10">
          <div className="text-sm font-medium text-black/70 dark:text-white/70">Notes</div>
          <div className="mt-2 text-3xl font-semibold">{loading ? "…" : notes.length}</div>
        </div>
        <div className="rounded-3xl border border-black/10 bg-transparent p-5 dark:border-white/10">
          <div className="text-sm font-medium text-black/70 dark:text-white/70">MCQs</div>
          <div className="mt-2 text-3xl font-semibold">{loading ? "…" : mcqCount}</div>
        </div>
        <div className="rounded-3xl border border-black/10 bg-transparent p-5 dark:border-white/10">
          <div className="text-sm font-medium text-black/70 dark:text-white/70">Templates</div>
          <div className="mt-2 text-3xl font-semibold">{loading ? "…" : templateCount}</div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">Your notes</h2>
          <div className="text-sm text-black/70 dark:text-white/70">Views</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-transparent dark:border-white/10">
          <Table className="bg-transparent">
            <TableHeader className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
              <TableRow className="hover:bg-transparent">
                <TableHead>Title</TableHead>
                <TableHead className="text-right">Views</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
              {notes.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={2} className="text-sm text-black/70 dark:text-white/70">
                    No notes yet.
                  </TableCell>
                </TableRow>
              ) : (
                notes.map((n) => (
                  <TableRow key={n.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                    <TableCell className="font-medium">
                      <Link href={`/learn/notes/${n.id}`} className="hover:underline">
                        {n.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-black/70 dark:text-white/70">{n.views}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

