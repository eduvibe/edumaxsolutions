"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { noteCreateSchema } from "@/lib/schemas";
import type { Subject, Topic } from "@/lib/platform/types";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { curriculumLessonsByTopicSlug } from "@/lib/platform/curriculum";
import { getSupabaseAccessToken } from "@/lib/platform/supabaseBrowser";

type FormValues = z.infer<typeof noteCreateSchema>;

export function TeacherNoteForm({ subjects, topics }: { subjects: Subject[]; topics: Topic[] }) {
  const env = getPlatformPublicEnv();
  const { toast } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(noteCreateSchema),
    defaultValues: {
      subjectSlug: subjects[0]?.slug ?? "",
      topicSlug: "",
      lessonNumber: 1,
      title: "",
      content: "",
      featuredImageUrl: "",
      published: true,
    },
  });

  const selectedSubjectSlug = form.watch("subjectSlug");
  const selectedTopicSlug = form.watch("topicSlug");
  const topicOptions = useMemo(() => {
    const subject = subjects.find((s) => s.slug === selectedSubjectSlug);
    if (!subject) return [];
    return topics.filter((t) => t.subjectId === subject.id);
  }, [selectedSubjectSlug, subjects, topics]);

  const lessonOptions = useMemo(() => {
    const defs = selectedTopicSlug ? curriculumLessonsByTopicSlug[selectedTopicSlug] : undefined;
    if (!defs || defs.length === 0) return [];
    return defs.map((d, idx) => ({ number: idx + 1, title: d.title }));
  }, [selectedTopicSlug]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const token = await getSupabaseAccessToken();
      if (!token) throw new Error("Tutor session expired. Please sign in again.");
      const res = await fetch("/api/notes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      const data = (await res.json()) as { note?: { id: string }; error?: string };
      if (!res.ok || !data.note) {
        throw new Error(data.error ?? "Failed to create note");
      }
      toast({ title: "Note created" });
      router.push(`/learn/notes/${data.note.id}`);
      router.refresh();
    } catch (e) {
      toast({ title: "Create note failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {!env.cloudinaryConfigured ? (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          Image uploads will be enabled once Cloudinary environment variables are added.
        </div>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="subjectSlug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.slug}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="topicSlug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={topicOptions.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={topicOptions.length ? "Select topic" : "No topics for subject"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {topicOptions.map((t) => (
                        <SelectItem key={t.id} value={t.slug}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="lessonNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sub-topic</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  value={field.value ? String(field.value) : ""}
                  disabled={lessonOptions.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={lessonOptions.length ? "Select sub-topic" : "No sub-topics for topic"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {lessonOptions.map((l) => (
                      <SelectItem key={l.number} value={String(l.number)}>
                        {l.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Quadratic Equations (JAMB Focus)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content</FormLabel>
                <FormControl>
                  <Textarea placeholder="Write your note content..." className="min-h-[220px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="featuredImageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Featured image URL (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="https://res.cloudinary.com/..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={submitting || !form.getValues("topicSlug") || !form.getValues("lessonNumber")}>
            {submitting ? "Saving..." : "Publish note"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
