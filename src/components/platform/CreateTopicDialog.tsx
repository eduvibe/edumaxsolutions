"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseAccessToken } from "@/lib/platform/supabaseBrowser";
import { useRouter } from "next/navigation";
import { useState } from "react";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CreateTopicDialog({
  subjectSlug,
  defaultSchoolSection,
}: {
  subjectSlug: string;
  defaultSchoolSection: "primary" | "jss" | "sss";
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [yearGroup, setYearGroup] = useState("");
  const [thread, setThread] = useState("");
  const [lessonCount, setLessonCount] = useState("");
  const [schoolSection, setSchoolSection] = useState<"primary" | "jss" | "sss">(defaultSchoolSection);

  function yearGroupOptions(section: "primary" | "jss" | "sss") {
    if (section === "primary") return ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];
    if (section === "jss") return ["Year 7", "Year 8", "Year 9"];
    return ["Year 10", "Year 11", "Year 12"];
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: "Missing name", description: "Enter a topic name." });
      return;
    }
    setBusy(true);
    try {
      const token = await getSupabaseAccessToken();
      if (!token) throw new Error("Sign in required");
      const res = await fetch("/api/curriculum/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subjectSlug,
          name: trimmed,
          slug: slugify(trimmed),
          description: description.trim() || null,
          yearGroup: yearGroup.trim() || null,
          thread: thread.trim() || null,
          lessonCount: lessonCount.trim() ? Number(lessonCount) : null,
          schoolSection,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Unable to create topic");
      }
      toast({ title: "Topic created" });
      setOpen(false);
      setName("");
      setDescription("");
      setYearGroup("");
      setThread("");
      setLessonCount("");
      router.refresh();
    } catch (e) {
      toast({ title: "Create topic failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
          Create new topic
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a topic</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>School section</Label>
            <select
              value={schoolSection}
              onChange={(e) => setSchoolSection(e.target.value as "primary" | "jss" | "sss")}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="primary">Primary</option>
              <option value="jss">JSS</option>
              <option value="sss">SSS</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label>Topic name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fractions" />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short overview (optional)" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Year group</Label>
              <select
                value={yearGroup}
                onChange={(e) => setYearGroup(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Optional</option>
                {yearGroupOptions(schoolSection).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Lessons</Label>
              <Input value={lessonCount} onChange={(e) => setLessonCount(e.target.value)} placeholder="e.g. 12" inputMode="numeric" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Thread</Label>
            <Input value={thread} onChange={(e) => setThread(e.target.value)} placeholder="e.g. Algebra" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
