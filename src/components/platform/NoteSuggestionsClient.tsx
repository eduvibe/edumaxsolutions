"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseAccessToken } from "@/lib/platform/supabaseBrowser";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type SuggestionRow = {
  id: string;
  note_id: string;
  change_summary: string;
  status: string;
  created_at: string;
  suggested_by: string;
};

async function authedFetchJson<T>(path: string) {
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error("Tutor session expired. Please sign in again.");
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  const data = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const err = (data as { error?: string } | null)?.error;
    throw new Error(err ?? "Request failed");
  }
  return data as T;
}

export function NoteSuggestionsClient() {
  const { toast } = useToast();
  const [active, setActive] = useState<"queue" | "mine">("queue");
  const [queue, setQueue] = useState<SuggestionRow[]>([]);
  const [mine, setMine] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [q, m] = await Promise.all([
        authedFetchJson<{ suggestions: SuggestionRow[] }>("/api/note-suggestions?scope=queue&status=pending&limit=50"),
        authedFetchJson<{ suggestions: SuggestionRow[] }>("/api/note-suggestions?scope=mine&limit=50"),
      ]);
      setQueue(q.suggestions ?? []);
      setMine(m.suggestions ?? []);
    } catch (e) {
      toast({ title: "Failed to load suggestions", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-black/70 dark:text-white/70">
          Pending to review: <span className="font-semibold text-black dark:text-white">{queue.length}</span>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <Tabs value={active} onValueChange={(v) => setActive(v === "mine" ? "mine" : "queue")}>
        <TabsList className="w-full justify-start rounded-2xl bg-white/40 p-1 dark:bg-white/10">
          <TabsTrigger value="queue" className="rounded-xl">
            Suggestions awaiting review
          </TabsTrigger>
          <TabsTrigger value="mine" className="rounded-xl">
            My suggestions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
            <div className="divide-y divide-black/10 overflow-hidden rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
              {queue.length === 0 ? (
                <div className="p-4 text-sm text-black/70 dark:text-white/70">No pending suggestions right now.</div>
              ) : (
                queue.map((s) => (
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

        <TabsContent value="mine" className="mt-4">
          <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
            <div className="divide-y divide-black/10 overflow-hidden rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
              {mine.length === 0 ? (
                <div className="p-4 text-sm text-black/70 dark:text-white/70">You have not submitted any suggestions yet.</div>
              ) : (
                mine.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-black dark:text-white">{s.change_summary}</div>
                      <div className="mt-0.5 text-xs text-black/60 dark:text-white/60">
                        {s.status} • {s.created_at ? new Date(s.created_at).toLocaleString() : ""}
                      </div>
                    </div>
                    <Button
                      asChild
                      variant="secondary"
                      className="shrink-0 rounded-md border-2 border-black bg-transparent px-3 text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                    >
                      <Link href={`/learn/teacher/note-suggestions/${s.id}`}>Open</Link>
                    </Button>
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
