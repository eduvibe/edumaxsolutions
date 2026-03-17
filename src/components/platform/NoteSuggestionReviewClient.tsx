"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseAccessToken } from "@/lib/platform/supabaseBrowser";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RichTextRenderer } from "@/components/platform/RichTextRenderer";
import type { RichTextContent } from "@/lib/platform/types";
import { DiffViewer } from "@/components/platform/DiffViewer";
import Link from "next/link";

type Suggestion = {
  id: string;
  note_id: string;
  proposed_content: string;
  suggested_by: string;
  change_summary: string;
  status: string;
  created_at: string;
};

type Note = {
  id: string;
  topicSlug: string;
  lessonNumber: number;
  content: string;
  lastUpdated: string;
};

type Payload = {
  suggestion: Suggestion;
  note: Note;
  votes: { approveCount: number; rejectCount: number; myVote: string | null; canVote: boolean };
};

function stripHtml(html: string) {
  if (typeof window === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.innerText || "").replace(/\u00a0/g, " ").trim();
}

async function authedFetchJson<T>(path: string, init?: RequestInit) {
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error("Tutor session expired. Please sign in again.");
  const res = await fetch(path, { ...init, headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` } });
  const data = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const err = (data as { error?: string } | null)?.error;
    throw new Error(err ?? "Request failed");
  }
  return data as T;
}

export function NoteSuggestionReviewClient({ suggestionId }: { suggestionId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [voting, setVoting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authedFetchJson<Payload>(`/api/note-suggestions/${encodeURIComponent(suggestionId)}`);
      setPayload(data);
    } catch (e) {
      toast({ title: "Failed to load suggestion", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  }, [suggestionId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const officialDoc = useMemo<RichTextContent>(() => ({ type: "html", html: payload?.note.content ?? "" }), [payload?.note.content]);
  const proposedDoc = useMemo<RichTextContent>(() => ({ type: "html", html: payload?.suggestion.proposed_content ?? "" }), [payload?.suggestion.proposed_content]);
  const officialText = useMemo(() => stripHtml(payload?.note.content ?? ""), [payload?.note.content]);
  const proposedText = useMemo(() => stripHtml(payload?.suggestion.proposed_content ?? ""), [payload?.suggestion.proposed_content]);

  async function vote(voteType: "approve" | "reject") {
    if (!payload?.votes.canVote) return;
    setVoting(true);
    try {
      await authedFetchJson(`/api/note-suggestions/${encodeURIComponent(suggestionId)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteType }),
      });
      toast({ title: voteType === "approve" ? "Approved" : "Rejected" });
      await load();
    } catch (e) {
      toast({ title: "Vote failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setVoting(false);
    }
  }

  if (loading || !payload) {
    return (
      <div className="rounded-3xl border border-black/10 bg-white/10 p-6 text-sm text-black/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white/70">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-black/80 dark:text-white/80">{payload.suggestion.change_summary}</div>
            <div className="mt-1 text-sm text-black/70 dark:text-white/70">
              Status: <span className="font-semibold text-black dark:text-white">{payload.suggestion.status}</span> • Approvals:{" "}
              <span className="font-semibold text-black dark:text-white">{payload.votes.approveCount}</span> • Rejections:{" "}
              <span className="font-semibold text-black dark:text-white">{payload.votes.rejectCount}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!payload.votes.canVote || voting}
              className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              onClick={() => void vote("approve")}
            >
              Approve
            </Button>
            <Button
              type="button"
              disabled={!payload.votes.canVote || voting}
              variant="secondary"
              className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
              onClick={() => void vote("reject")}
            >
              Reject
            </Button>
            <Button
              asChild
              variant="secondary"
              className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
            >
              <Link href={`/learn/teacher/topic-notes/${payload.note.topicSlug}/lessons/${payload.note.lessonNumber}`}>Back to note</Link>
            </Button>
          </div>
        </div>
        {!payload.votes.canVote && payload.suggestion.status === "pending" ? (
          <div className="mt-3 text-sm text-black/70 dark:text-white/70">
            {payload.votes.myVote ? `You already voted: ${payload.votes.myVote}.` : "You cannot vote on your own suggestion."}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold text-black/80 dark:text-white/80">Current official note</div>
          <div className="mt-4">
            <RichTextRenderer doc={officialDoc} className="prose prose-sm max-w-none dark:prose-invert" />
          </div>
        </div>
        <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold text-black/80 dark:text-white/80">Suggested version</div>
          <div className="mt-4">
            <RichTextRenderer doc={proposedDoc} className="prose prose-sm max-w-none dark:prose-invert" />
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-black/80 dark:text-white/80 mb-2">Highlighted changes (plain text)</div>
        <DiffViewer oldText={officialText} newText={proposedText} />
      </div>
    </div>
  );
}
