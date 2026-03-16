"use client";

import type { Subject, Topic } from "@/lib/platform/types";
import { getSupabaseAccessToken } from "@/lib/platform/supabaseBrowser";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TeacherNoteForm } from "@/components/platform/TeacherNoteForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type EditNotePayload = {
  id: string;
  subjectSlug: string;
  topicSlug: string;
  lessonNumber: number | null;
  title: string;
  content: string;
  featuredImageUrl: string;
  published: boolean;
};

export function TeacherNoteEditClient({
  noteId,
  subjects,
  topics,
}: {
  noteId: string;
  subjects: Subject[];
  topics: Topic[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<EditNotePayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const token = await getSupabaseAccessToken();
        if (!token) throw new Error("Tutor session expired. Please sign in again.");
        const res = await fetch(`/api/notes/${encodeURIComponent(noteId)}/edit`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json().catch(() => ({}))) as { note?: EditNotePayload; error?: string };
        if (!res.ok || !data.note) throw new Error(data.error ?? "Unable to load note");
        if (!cancelled) setNote(data.note);
      } catch (e) {
        toast({ title: "Failed to load note", description: e instanceof Error ? e.message : "Unknown error" });
        router.push("/learn/teacher/dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [noteId, router, toast]);

  const initialValues = useMemo(() => {
    if (!note) return null;
    return {
      subjectSlug: note.subjectSlug,
      topicSlug: note.topicSlug,
      lessonNumber: note.lessonNumber ?? 1,
      title: note.title,
      content: note.content,
      featuredImageUrl: note.featuredImageUrl ?? "",
      published: note.published,
    };
  }, [note]);

  if (loading || !initialValues) {
    return (
      <div className="rounded-3xl border border-black/10 bg-white/10 p-6 text-sm text-black/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white/70">
        Loading note…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="secondary"
          className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
        >
          <Link href="/learn/teacher/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      <TeacherNoteForm subjects={subjects} topics={topics} mode="edit" noteId={noteId} initialValues={initialValues} />
    </div>
  );
}

