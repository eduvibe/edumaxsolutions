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
import type { Lesson, Subject, Topic } from "@/lib/platform/types";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getSupabaseAccessToken } from "@/lib/platform/supabaseBrowser";
import Image from "next/image";

type FormValues = z.infer<typeof noteCreateSchema>;

export function TeacherNoteForm({
  subjects,
  topics,
  lessons,
  mode = "create",
  noteId,
  initialValues,
}: {
  subjects: Subject[];
  topics: Topic[];
  lessons: Lesson[];
  mode?: "create" | "edit";
  noteId?: string;
  initialValues?: Partial<FormValues>;
}) {
  const env = getPlatformPublicEnv();
  const { toast } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(noteCreateSchema),
    defaultValues: {
      subjectSlug: subjects[0]?.slug ?? "",
      topicSlug: "",
      lessonNumber: null,
      title: "",
      content: "",
      featuredImageUrl: "",
      published: true,
      ...(initialValues ?? {}),
    },
  });

  const selectedSubjectSlug = form.watch("subjectSlug");
  const selectedTopicSlug = form.watch("topicSlug");
  const topicOptions = useMemo(() => {
    const subject = subjects.find((s) => s.slug === selectedSubjectSlug);
    if (!subject) return [];
    return topics.filter((t) => t.subjectId === subject.id);
  }, [selectedSubjectSlug, subjects, topics]);

  const selectedTopic = useMemo(() => topics.find((t) => t.slug === selectedTopicSlug) ?? null, [selectedTopicSlug, topics]);

  const lessonOptions = useMemo(() => {
    if (!selectedTopic) return [];
    return lessons
      .filter((l) => l.topicId === selectedTopic.id)
      .slice()
      .sort((a, b) => a.lessonNumber - b.lessonNumber)
      .map((l) => ({ number: l.lessonNumber, title: l.title }));
  }, [lessons, selectedTopic]);

  useEffect(() => {
    if (!selectedTopicSlug) return;
    const current = form.getValues("lessonNumber");
    if (current === null) return;
    if (typeof current === "number" && lessonOptions.some((l) => l.number === current)) return;
    form.setValue("lessonNumber", null);
  }, [form, lessonOptions, selectedTopicSlug]);

  function topicLabel(t: Topic) {
    const sec = (t.schoolSection ?? "").toUpperCase();
    const parts = [sec || null, t.yearGroup ?? null, t.name].filter(Boolean);
    return parts.join(" • ");
  }

  const imageInputRef = useRef<HTMLInputElement | null>(null);

  async function uploadCloudinaryImage(file: File, folder: string) {
    if (!env.cloudinaryConfigured) {
      throw new Error("Cloudinary is not configured");
    }
    const token = await getSupabaseAccessToken();
    if (!token) throw new Error("Tutor session expired. Please sign in again.");

    const formData = new FormData();
    formData.set("file", file);
    formData.set("folder", folder);

    const uploadRes = await fetch("/api/cloudinary/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const uploadData = (await uploadRes.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!uploadRes.ok) throw new Error(uploadData.error ?? "Upload failed");
    if (!uploadData.url) throw new Error("Upload failed");
    return uploadData.url;
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const token = await getSupabaseAccessToken();
      if (!token) throw new Error("Tutor session expired. Please sign in again.");
      const isEdit = mode === "edit";
      const endpoint = isEdit && noteId ? `/api/notes/${encodeURIComponent(noteId)}/edit` : "/api/notes/create";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as { note?: { id: string }; ok?: boolean; id?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? (isEdit ? "Failed to update note" : "Failed to create note"));
      }
      toast({ title: isEdit ? "Note updated" : "Note created" });
      if (isEdit) {
        router.push(`/learn/notes/${noteId}`);
      } else {
        router.push(`/learn/notes/${data.note?.id ?? ""}`);
      }
      router.refresh();
    } catch (e) {
      toast({ title: mode === "edit" ? "Update note failed" : "Create note failed", description: e instanceof Error ? e.message : "Unknown error" });
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
                          {topicLabel(t)}
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
                  onValueChange={(v) => field.onChange(v === "__topic__" ? null : Number(v))}
                  value={field.value === null || typeof field.value !== "number" ? "__topic__" : String(field.value)}
                  disabled={!selectedTopicSlug}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedTopicSlug ? "Select sub-topic" : "Select a topic first"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__topic__">Entire topic (all sub-topics)</SelectItem>
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
                <FormLabel>Featured image (optional)</FormLabel>
                <FormControl>
                  <div className="space-y-3">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploading(true);
                        void (async () => {
                          try {
                            const url = await uploadCloudinaryImage(file, "edumax/notes/featured");
                            field.onChange(url);
                            toast({ title: "Image uploaded" });
                          } catch (err) {
                            toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Unknown error" });
                          } finally {
                            setUploading(false);
                            if (imageInputRef.current) imageInputRef.current.value = "";
                          }
                        })();
                      }}
                    />

                    {field.value ? (
                      <div className="overflow-hidden rounded-xl border border-black/10 bg-white/10 dark:border-white/10 dark:bg-white/5">
                        <div className="relative aspect-[16/9] w-full">
                          <Image src={field.value} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 600px" />
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!env.cloudinaryConfigured || uploading}
                        className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        {uploading ? "Uploading..." : "Upload image"}
                      </Button>
                      {field.value ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                          onClick={() => field.onChange("")}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={submitting || !form.getValues("topicSlug")}>
            {submitting ? "Saving..." : mode === "edit" ? "Save changes" : "Publish note"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
