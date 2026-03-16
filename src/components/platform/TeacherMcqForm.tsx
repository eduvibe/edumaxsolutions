"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mcqCreateSchema } from "@/lib/schemas";
import type { Subject, Topic } from "@/lib/platform/types";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { curriculumLessonsByTopicSlug } from "@/lib/platform/curriculum";
import { getSupabaseAccessToken } from "@/lib/platform/supabaseBrowser";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import Image from "next/image";

type FormValues = z.infer<typeof mcqCreateSchema>;

export function TeacherMcqForm({ subjects, topics }: { subjects: Subject[]; topics: Topic[] }) {
  const env = getPlatformPublicEnv();
  const { toast } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(mcqCreateSchema),
    defaultValues: {
      subjectSlug: subjects[0]?.slug ?? "",
      topicSlug: "",
      lessonNumber: 1,
      questionText: "",
      questionImageUrl: "",
      optionAText: "",
      optionAImageUrl: "",
      optionBText: "",
      optionBImageUrl: "",
      optionCText: "",
      optionCImageUrl: "",
      optionDText: "",
      optionDImageUrl: "",
      correctAnswer: "A",
      explanation: "",
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

  async function uploadCloudinaryImage(file: File, folder: string) {
    if (!env.cloudinaryConfigured) {
      throw new Error("Cloudinary is not configured");
    }
    const sigRes = await fetch("/api/cloudinary/signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder }),
    });
    const sigData = (await sigRes.json().catch(() => ({}))) as {
      cloudName?: string;
      apiKey?: string;
      timestamp?: number;
      folder?: string;
      signature?: string;
      error?: string;
      hint?: string;
    };
    if (!sigRes.ok || !sigData.cloudName || !sigData.apiKey || !sigData.timestamp || !sigData.folder || !sigData.signature) {
      throw new Error(sigData.hint ?? sigData.error ?? "Unable to prepare upload");
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("api_key", sigData.apiKey);
    formData.set("timestamp", String(sigData.timestamp));
    formData.set("folder", sigData.folder);
    formData.set("signature", sigData.signature);

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(sigData.cloudName)}/image/upload`, {
      method: "POST",
      body: formData,
    });
    const uploadData = (await uploadRes.json().catch(() => ({}))) as { secure_url?: string; url?: string; error?: { message?: string } };
    if (!uploadRes.ok) throw new Error(uploadData.error?.message ?? "Upload failed");
    const url = uploadData.secure_url ?? uploadData.url;
    if (!url) throw new Error("Cloudinary did not return a URL");
    return url;
  }

  function ImagePickerField({
    label,
    value,
    onChange,
    folder,
    fieldKey,
  }: {
    label: string;
    value: string;
    onChange: (next: string) => void;
    folder: string;
    fieldKey: string;
  }) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const busy = uploadingField === fieldKey;

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold text-black/70 dark:text-white/70">{label}</div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingField(fieldKey);
                void (async () => {
                  try {
                    const url = await uploadCloudinaryImage(file, folder);
                    onChange(url);
                    toast({ title: "Image uploaded" });
                  } catch (err) {
                    toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Unknown error" });
                  } finally {
                    setUploadingField(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }
                })();
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!env.cloudinaryConfigured || busy}
              className="h-8 rounded-md border-2 border-black bg-transparent px-3 text-xs font-semibold text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
              onClick={() => inputRef.current?.click()}
            >
              {busy ? "Uploading..." : "Upload"}
            </Button>
            {value ? (
              <Button
                type="button"
                variant="secondary"
                className="h-8 rounded-md border-2 border-black bg-transparent px-3 text-xs font-semibold text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                onClick={() => onChange("")}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>

        {value ? (
          <div className="overflow-hidden rounded-xl border border-black/10 bg-white/10 dark:border-white/10 dark:bg-white/5">
            <div className="relative aspect-[16/9] w-full">
              <Image src={value} alt="" fill sizes="(max-width: 768px) 100vw, 500px" className="object-cover" />
            </div>
          </div>
        ) : null}

        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Or paste image URL (optional)"
          className="h-10 rounded-md border-black/10 bg-white/65 shadow-sm placeholder:text-black/40 focus-visible:ring-0 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-white/35"
        />
      </div>
    );
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const token = await getSupabaseAccessToken();
      if (!token) throw new Error("Tutor session expired. Please sign in again.");
      const res = await fetch("/api/questions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      const data = (await res.json()) as { question?: { id: string }; error?: string };
      if (!res.ok || !data.question) {
        throw new Error(data.error ?? "Failed to create question");
      }
      toast({ title: "Question created" });
      router.push(`/learn/topics/${values.topicSlug}`);
      router.refresh();
    } catch (e) {
      toast({ title: "Create question failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!env.cloudinaryConfigured ? (
          <div className="rounded-2xl border border-black/10 bg-white/10 p-4 text-sm text-black/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white/70">
            Image uploads are disabled until Cloudinary is configured.
          </div>
        ) : null}

        <div className="rounded-3xl border border-black/10 bg-white/10 p-5 backdrop-blur-md dark:border-white/10 dark:bg-white/5 md:p-6">
          <div className="text-sm font-semibold text-black/80 dark:text-white/80">Curriculum</div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
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
                <Select onValueChange={field.onChange} value={field.value} disabled={topicOptions.length === 0}>
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
          </div>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white/10 p-5 backdrop-blur-md dark:border-white/10 dark:bg-white/5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-black/80 dark:text-white/80">Question</div>
              <div className="mt-1 text-sm text-black/70 dark:text-white/70">Write the question and optionally add an image.</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <FormField
                control={form.control}
                name="questionText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question text</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter the question..."
                        className="min-h-[160px] rounded-xl border-black/10 bg-white/65 shadow-sm placeholder:text-black/40 focus-visible:ring-0 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-white/35"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="lg:col-span-2">
              <FormField
                control={form.control}
                name="questionImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question image</FormLabel>
                    <FormControl>
                      <div>
                        <ImagePickerField
                          label="Upload or paste URL"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          folder="edumax/questions/question"
                          fieldKey="questionImageUrl"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white/10 p-5 backdrop-blur-md dark:border-white/10 dark:bg-white/5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-black/80 dark:text-white/80">Answer options</div>
              <div className="mt-1 text-sm text-black/70 dark:text-white/70">Add text and optional image for each option.</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FormField
            control={form.control}
            name="optionAText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Option A</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Option A text"
                    className="h-11 rounded-xl border-black/10 bg-white/65 shadow-sm placeholder:text-black/40 focus-visible:ring-0 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-white/35"
                  />
                </FormControl>
                <FormMessage />
                <FormField
                  control={form.control}
                  name="optionAImageUrl"
                  render={({ field: imgField }) => (
                    <FormItem>
                      <FormControl>
                        <ImagePickerField
                          label="Option A image"
                          value={imgField.value ?? ""}
                          onChange={imgField.onChange}
                          folder="edumax/questions/options"
                          fieldKey="optionAImageUrl"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="optionBText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Option B</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Option B text"
                    className="h-11 rounded-xl border-black/10 bg-white/65 shadow-sm placeholder:text-black/40 focus-visible:ring-0 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-white/35"
                  />
                </FormControl>
                <FormMessage />
                <FormField
                  control={form.control}
                  name="optionBImageUrl"
                  render={({ field: imgField }) => (
                    <FormItem>
                      <FormControl>
                        <ImagePickerField
                          label="Option B image"
                          value={imgField.value ?? ""}
                          onChange={imgField.onChange}
                          folder="edumax/questions/options"
                          fieldKey="optionBImageUrl"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="optionCText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Option C</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Option C text"
                    className="h-11 rounded-xl border-black/10 bg-white/65 shadow-sm placeholder:text-black/40 focus-visible:ring-0 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-white/35"
                  />
                </FormControl>
                <FormMessage />
                <FormField
                  control={form.control}
                  name="optionCImageUrl"
                  render={({ field: imgField }) => (
                    <FormItem>
                      <FormControl>
                        <ImagePickerField
                          label="Option C image"
                          value={imgField.value ?? ""}
                          onChange={imgField.onChange}
                          folder="edumax/questions/options"
                          fieldKey="optionCImageUrl"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="optionDText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Option D</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Option D text"
                    className="h-11 rounded-xl border-black/10 bg-white/65 shadow-sm placeholder:text-black/40 focus-visible:ring-0 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-white/35"
                  />
                </FormControl>
                <FormMessage />
                <FormField
                  control={form.control}
                  name="optionDImageUrl"
                  render={({ field: imgField }) => (
                    <FormItem>
                      <FormControl>
                        <ImagePickerField
                          label="Option D image"
                          value={imgField.value ?? ""}
                          onChange={imgField.onChange}
                          folder="edumax/questions/options"
                          fieldKey="optionDImageUrl"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormItem>
            )}
          />
          </div>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white/10 p-5 backdrop-blur-md dark:border-white/10 dark:bg-white/5 md:p-6">
          <div className="text-sm font-semibold text-black/80 dark:text-white/80">Mark scheme</div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="correctAnswer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correct answer</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select answer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(["A", "B", "C", "D"] as const).map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
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
          name="explanation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Explanation</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Explain the correct answer..."
                  className="min-h-[140px] rounded-xl border-black/10 bg-white/65 shadow-sm placeholder:text-black/40 focus-visible:ring-0 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-white/35"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        </div>

        <Button type="submit" disabled={submitting || !form.getValues("topicSlug") || !form.getValues("lessonNumber")}>
          {submitting ? "Saving..." : "Save question"}
        </Button>
      </form>
    </Form>
  );
}
