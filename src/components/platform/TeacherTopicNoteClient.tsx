"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseAccessToken } from "@/lib/platform/supabaseBrowser";
import { RichTextEditor } from "@/components/platform/RichTextEditor";
import type { RichTextContent } from "@/lib/platform/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RichTextRenderer } from "@/components/platform/RichTextRenderer";
import Link from "next/link";

type TopicNote = {
  id: string;
  subjectSlug: string;
  topicSlug: string;
  lessonNumber: number;
  content: string;
  lastUpdated: string;
};

type SuggestionRow = {
  id: string;
  suggested_by: string;
  change_summary: string;
  status: string;
  created_at: string;
};

type RevisionRow = {
  id: string;
  updated_by: string;
  change_summary: string;
  created_at: string;
};

export function TeacherTopicNoteClient({
  subjectSlug,
  topicSlug,
  lessonNumber,
}: {
  subjectSlug: string;
  topicSlug: string;
  lessonNumber: number;
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"view" | "suggest" | "history" | "review">("view");
  const [note, setNote] = useState<TopicNote | null>(null);
  const [loadingNote, setLoadingNote] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");
  const [proposedDoc, setProposedDoc] = useState<RichTextContent>({ type: "html", html: "" });
  const [proposedText, setProposedText] = useState("");
  const [pendingSuggestions, setPendingSuggestions] = useState<SuggestionRow[]>([]);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const noteDoc = useMemo<RichTextContent>(() => ({ type: "html", html: note?.content ?? "" }), [note?.content]);

  const loadNote = useCallback(async () => {
    setLoadingNote(true);
    try {
      const res = await fetch(`/api/topic-notes?topicSlug=${encodeURIComponent(topicSlug)}&lessonNumber=${lessonNumber}`);
      const data = (await res.json().catch(() => ({}))) as { note?: TopicNote | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load note");
      setNote(data.note ?? null);
      setProposedDoc({ type: "html", html: data.note?.content ?? "" });
      setProposedText("");
    } catch (e) {
      toast({ title: "Failed to load note", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setLoadingNote(false);
    }
  }, [lessonNumber, toast, topicSlug]);

  const loadPendingSuggestions = useCallback(async () => {
    try {
      const token = await getSupabaseAccessToken();
      if (!token) return;
      const res = await fetch(
        `/api/topic-notes/suggestions?topicSlug=${encodeURIComponent(topicSlug)}&lessonNumber=${lessonNumber}&status=pending`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = (await res.json().catch(() => ({}))) as { suggestions?: SuggestionRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load suggestions");
      setPendingSuggestions(data.suggestions ?? []);
    } catch (e) {
      toast({ title: "Failed to load suggestions", description: e instanceof Error ? e.message : "Unknown error" });
    }
  }, [lessonNumber, toast, topicSlug]);

  const loadRevisions = useCallback(async () => {
    try {
      const token = await getSupabaseAccessToken();
      if (!token) return;
      const res = await fetch(
        `/api/topic-notes/revisions?topicSlug=${encodeURIComponent(topicSlug)}&lessonNumber=${lessonNumber}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = (await res.json().catch(() => ({}))) as { revisions?: RevisionRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load revisions");
      setRevisions((data.revisions ?? []) as RevisionRow[]);
    } catch (e) {
      toast({ title: "Failed to load revision history", description: e instanceof Error ? e.message : "Unknown error" });
    }
  }, [lessonNumber, toast, topicSlug]);

  useEffect(() => {
    void loadNote();
  }, [loadNote]);

  useEffect(() => {
    if (activeTab === "review") void loadPendingSuggestions();
    if (activeTab === "history") void loadRevisions();
  }, [activeTab, loadPendingSuggestions, loadRevisions]);

  const uploadImage = useCallback(async (file: File) => {
    const token = await getSupabaseAccessToken();
    if (!token) throw new Error("Tutor session expired. Please sign in again.");
    const formData = new FormData();
    formData.set("file", file);
    formData.set("folder", "edumax/topic-notes");
    const uploadRes = await fetch("/api/cloudinary/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const uploadData = (await uploadRes.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!uploadRes.ok) throw new Error(uploadData.error ?? "Upload failed");
    if (!uploadData.url) throw new Error("Upload failed");
    return uploadData.url;
  }, []);

  const insertImage = useCallback(async () => {
    const file = imageInputRef.current?.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      if (typeof document !== "undefined") {
        document.execCommand("insertImage", false, url);
        const el = document.activeElement as HTMLElement | null;
        el?.dispatchEvent(new Event("input", { bubbles: true }));
      }
      toast({ title: "Image inserted" });
    } catch (e) {
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }, [toast, uploadImage]);

  const submitSuggestion = useCallback(async () => {
    if (!changeSummary.trim()) {
      toast({ title: "Add a change summary" });
      return;
    }
    const html = (proposedDoc as unknown as { html?: unknown } | null)?.html;
    if (typeof html !== "string" || html.trim().length < 10) {
      toast({ title: "Proposed note is too short" });
      return;
    }
    setSubmitting(true);
    try {
      const token = await getSupabaseAccessToken();
      if (!token) throw new Error("Tutor session expired. Please sign in again.");
      const res = await fetch("/api/topic-notes/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subjectSlug,
          topicSlug,
          lessonNumber,
          proposedContent: html,
          changeSummary: changeSummary.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to submit suggestion");
      toast({ title: "Suggestion submitted" });
      setChangeSummary("");
      setActiveTab("review");
      await loadPendingSuggestions();
    } catch (e) {
      toast({ title: "Submit failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setSubmitting(false);
    }
  }, [changeSummary, lessonNumber, loadPendingSuggestions, proposedDoc, subjectSlug, toast, topicSlug]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="secondary"
          className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
        >
          <Link href={`/learn/topics/${topicSlug}/lessons/${lessonNumber}`}>Open student view</Link>
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          if (v === "view" || v === "suggest" || v === "review" || v === "history") setActiveTab(v);
        }}
      >
        <TabsList className="w-full justify-start rounded-2xl bg-white/40 p-1 dark:bg-white/10">
          <TabsTrigger value="view" className="rounded-xl">
            View note
          </TabsTrigger>
          <TabsTrigger value="suggest" className="rounded-xl">
            Suggest edit
          </TabsTrigger>
          <TabsTrigger value="review" className="rounded-xl">
            Suggestions
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl">
            Revision history
          </TabsTrigger>
        </TabsList>

        <TabsContent value="view" className="mt-4">
          {loadingNote ? (
            <div className="rounded-3xl border border-black/10 bg-white/10 p-6 text-sm text-black/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white/70">
              Loading…
            </div>
          ) : note ? (
            <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              <RichTextRenderer doc={noteDoc} className="prose prose-sm max-w-none dark:prose-invert" />
            </div>
          ) : (
            <div className="rounded-3xl border border-black/10 bg-white/10 p-6 text-sm text-black/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white/70">
              No official note yet. Submit a suggestion to create the first version.
            </div>
          )}
        </TabsContent>

        <TabsContent value="suggest" className="mt-4">
          <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-black/80 dark:text-white/80">Proposed edits</div>
              <div className="flex items-center gap-2">
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={() => void insertImage()} />
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                  onClick={() => imageInputRef.current?.click()}
                >
                  Insert image
                </Button>
              </div>
            </div>

            <RichTextEditor
              value={proposedDoc}
              placeholder="Edit the note…"
              minHeightClassName="min-h-[320px]"
              onChange={({ json, text }) => {
                setProposedDoc(json);
                setProposedText(text);
              }}
            />

            <div className="space-y-2">
              <div className="text-sm font-semibold text-black/80 dark:text-white/80">Change summary</div>
              <textarea
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                className="w-full min-h-[72px] rounded-xl border border-black/10 bg-white/65 px-3 py-2 text-sm text-black shadow-sm outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                placeholder="Example: Added explanation of Ohm's Law example circuit."
              />
              <div className="text-xs text-black/60 dark:text-white/60">Proposed length: {proposedText.length} characters</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                disabled={submitting}
                onClick={() => void submitSuggestion()}
              >
                {submitting ? "Submitting..." : "Submit suggestion"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                onClick={() => {
                  setProposedDoc({ type: "html", html: note?.content ?? "" });
                  setChangeSummary("");
                }}
              >
                Reset to official
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-black/80 dark:text-white/80">Pending suggestions</div>
                <div className="mt-1 text-sm text-black/70 dark:text-white/70">Review and vote on community edits.</div>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                onClick={() => void loadPendingSuggestions()}
              >
                Refresh
              </Button>
            </div>

            <div className="mt-4 divide-y divide-black/10 overflow-hidden rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
              {pendingSuggestions.length === 0 ? (
                <div className="p-4 text-sm text-black/70 dark:text-white/70">No pending suggestions for this note.</div>
              ) : (
                pendingSuggestions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-black dark:text-white">{s.change_summary}</div>
                      <div className="mt-0.5 text-xs text-black/60 dark:text-white/60">
                        {s.created_at ? new Date(s.created_at).toLocaleString() : ""}
                      </div>
                    </div>
                    <Button
                      asChild
                      variant="secondary"
                      className="shrink-0 rounded-md border-2 border-black bg-transparent px-3 text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                    >
                      <Link href={`/learn/teacher/note-suggestions/${s.id}`}>Review</Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-black/80 dark:text-white/80">Revision history</div>
                <div className="mt-1 text-sm text-black/70 dark:text-white/70">Approved changes for this note.</div>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                onClick={() => void loadRevisions()}
              >
                Refresh
              </Button>
            </div>

            <div className="mt-4 divide-y divide-black/10 overflow-hidden rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
              {revisions.length === 0 ? (
                <div className="p-4 text-sm text-black/70 dark:text-white/70">No revisions yet.</div>
              ) : (
                revisions.map((r) => (
                  <div key={r.id} className="px-4 py-3">
                    <div className="text-sm font-semibold text-black dark:text-white">{r.change_summary}</div>
                    <div className="mt-0.5 text-xs text-black/60 dark:text-white/60">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
