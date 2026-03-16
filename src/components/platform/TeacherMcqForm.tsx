"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mcqCreateSchema } from "@/lib/schemas";
import type { Subject, Topic } from "@/lib/platform/types";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { curriculumLessonsByTopicSlug } from "@/lib/platform/curriculum";
import { getSupabaseAccessToken } from "@/lib/platform/supabaseBrowser";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import Image from "next/image";
import { parseAiken } from "@/lib/platform/aiken";
import { plainTextToRichDoc } from "@/lib/platform/richText";
import type { RichTextContent } from "@/lib/platform/types";
import { RichTextEditor } from "@/components/platform/RichTextEditor";

type FormValues = z.infer<typeof mcqCreateSchema>;

type BulkMcqDraft = {
  questionText: string;
  questionTextJson: RichTextContent;
  questionImageUrl: string;
  optionAText: string;
  optionATextJson: RichTextContent;
  optionAImageUrl: string;
  optionBText: string;
  optionBTextJson: RichTextContent;
  optionBImageUrl: string;
  optionCText: string;
  optionCTextJson: RichTextContent;
  optionCImageUrl: string;
  optionDText: string;
  optionDTextJson: RichTextContent;
  optionDImageUrl: string;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  explanationJson: RichTextContent;
};

export function TeacherMcqForm({
  subjects,
  topics,
  mode = "create",
  questionId,
  initialValues,
}: {
  subjects: Subject[];
  topics: Topic[];
  mode?: "create" | "edit";
  questionId?: string;
  initialValues?: Partial<FormValues>;
}) {
  const env = getPlatformPublicEnv();
  const { toast } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const isEdit = mode === "edit";
  const [activeTab, setActiveTab] = useState<"single" | "import">("single");
  const [aikenText, setAikenText] = useState("");
  const [aikenErrors, setAikenErrors] = useState<string[]>([]);
  const [bulkDrafts, setBulkDrafts] = useState<BulkMcqDraft[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(mcqCreateSchema),
    defaultValues: {
      subjectSlug: subjects[0]?.slug ?? "",
      topicSlug: "",
      lessonNumber: 1,
      questionText: "",
      questionTextJson: plainTextToRichDoc(""),
      questionImageUrl: "",
      optionAText: "",
      optionATextJson: plainTextToRichDoc(""),
      optionAImageUrl: "",
      optionBText: "",
      optionBTextJson: plainTextToRichDoc(""),
      optionBImageUrl: "",
      optionCText: "",
      optionCTextJson: plainTextToRichDoc(""),
      optionCImageUrl: "",
      optionDText: "",
      optionDTextJson: plainTextToRichDoc(""),
      optionDImageUrl: "",
      correctAnswer: "A",
      explanation: "",
      explanationJson: plainTextToRichDoc(""),
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

  const lessonOptions = useMemo(() => {
    const defs = selectedTopicSlug ? curriculumLessonsByTopicSlug[selectedTopicSlug] : undefined;
    if (!defs || defs.length === 0) return [];
    return defs.map((d, idx) => ({ number: idx + 1, title: d.title }));
  }, [selectedTopicSlug]);

  const bulkInvalidCount = useMemo(() => {
    const subjectSlug = form.getValues("subjectSlug");
    const topicSlug = form.getValues("topicSlug");
    const lessonNumber = form.getValues("lessonNumber");
    if (!subjectSlug || !topicSlug || !lessonNumber) return bulkDrafts.length;
    return bulkDrafts.reduce((acc, d) => {
      const parsed = mcqCreateSchema.safeParse({
        subjectSlug,
        topicSlug,
        lessonNumber,
        questionText: d.questionText,
        questionImageUrl: d.questionImageUrl,
        optionAText: d.optionAText,
        optionAImageUrl: d.optionAImageUrl,
        optionBText: d.optionBText,
        optionBImageUrl: d.optionBImageUrl,
        optionCText: d.optionCText,
        optionCImageUrl: d.optionCImageUrl,
        optionDText: d.optionDText,
        optionDImageUrl: d.optionDImageUrl,
        correctAnswer: d.correctAnswer,
        explanation: d.explanation,
      });
      return acc + (parsed.success ? 0 : 1);
    }, 0);
  }, [bulkDrafts, form]);

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
      </div>
    );
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const token = await getSupabaseAccessToken();
      if (!token) throw new Error("Tutor session expired. Please sign in again.");
      const endpoint = isEdit && questionId ? `/api/questions/${encodeURIComponent(questionId)}` : "/api/questions/create";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as { question?: { id: string }; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? (isEdit ? "Failed to update question" : "Failed to create question"));
      }
      toast({ title: isEdit ? "Question updated" : "Question created" });
      router.push(`/learn/topics/${values.topicSlug}`);
      router.refresh();
    } catch (e) {
      toast({ title: isEdit ? "Update question failed" : "Create question failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setSubmitting(false);
    }
  }

  function parseAikenIntoDrafts() {
    const topicSlug = form.getValues("topicSlug");
    const lessonNumber = form.getValues("lessonNumber");
    if (!topicSlug || !lessonNumber) {
      toast({ title: "Select a topic and sub-topic first" });
      return;
    }
    const parsed = parseAiken(aikenText);
    setAikenErrors(parsed.errors);
    const drafts: BulkMcqDraft[] = parsed.questions.map((q) => ({
      questionText: q.questionText,
      questionTextJson: plainTextToRichDoc(q.questionText),
      questionImageUrl: "",
      optionAText: q.options.A ?? "",
      optionATextJson: plainTextToRichDoc(q.options.A ?? ""),
      optionAImageUrl: "",
      optionBText: q.options.B ?? "",
      optionBTextJson: plainTextToRichDoc(q.options.B ?? ""),
      optionBImageUrl: "",
      optionCText: q.options.C ?? "",
      optionCTextJson: plainTextToRichDoc(q.options.C ?? ""),
      optionCImageUrl: "",
      optionDText: q.options.D ?? "",
      optionDTextJson: plainTextToRichDoc(q.options.D ?? ""),
      optionDImageUrl: "",
      correctAnswer: q.correctAnswer,
      explanation: "No explanation provided.",
      explanationJson: plainTextToRichDoc("No explanation provided."),
    }));
    setBulkDrafts(drafts);
    if (drafts.length === 0) {
      toast({ title: "No questions parsed" });
    } else {
      toast({ title: "Imported questions", description: `${drafts.length} question(s) parsed` });
    }
  }

  async function saveBulk() {
    const subjectSlug = form.getValues("subjectSlug");
    const topicSlug = form.getValues("topicSlug");
    const lessonNumber = form.getValues("lessonNumber");
    if (!subjectSlug || !topicSlug || !lessonNumber) {
      toast({ title: "Select a subject, topic and sub-topic" });
      return;
    }
    if (bulkDrafts.length === 0) {
      toast({ title: "Nothing to save" });
      return;
    }
    if (bulkInvalidCount > 0) {
      toast({ title: "Fix validation errors", description: `${bulkInvalidCount} question(s) are incomplete.` });
      return;
    }
    setBulkSaving(true);
    try {
      const token = await getSupabaseAccessToken();
      if (!token) throw new Error("Tutor session expired. Please sign in again.");
      const payload = {
        questions: bulkDrafts.map((d) => ({
          subjectSlug,
          topicSlug,
          lessonNumber,
          questionText: d.questionText,
          questionTextJson: d.questionTextJson,
          questionImageUrl: d.questionImageUrl,
          optionAText: d.optionAText,
          optionATextJson: d.optionATextJson,
          optionAImageUrl: d.optionAImageUrl,
          optionBText: d.optionBText,
          optionBTextJson: d.optionBTextJson,
          optionBImageUrl: d.optionBImageUrl,
          optionCText: d.optionCText,
          optionCTextJson: d.optionCTextJson,
          optionCImageUrl: d.optionCImageUrl,
          optionDText: d.optionDText,
          optionDTextJson: d.optionDTextJson,
          optionDImageUrl: d.optionDImageUrl,
          correctAnswer: d.correctAnswer,
          explanation: d.explanation,
          explanationJson: d.explanationJson,
        })),
      };
      const res = await fetch("/api/questions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; count?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Bulk save failed");
      toast({ title: "Questions saved", description: `${data.count ?? bulkDrafts.length} question(s)` });
      setBulkDrafts([]);
      setAikenText("");
      setAikenErrors([]);
      router.push(`/learn/topics/${topicSlug}`);
      router.refresh();
    } catch (err) {
      toast({ title: "Bulk save failed", description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setBulkSaving(false);
    }
  }

  function updateBulkDraft(index: number, patch: Partial<BulkMcqDraft>) {
    setBulkDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function removeBulkDraft(index: number) {
    setBulkDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  const aikenFileRef = useRef<HTMLInputElement | null>(null);

  return (
    <Form {...form}>
      <div className="space-y-6">
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

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v === "import" ? "import" : "single")}>
          <TabsList className="w-full justify-start rounded-2xl bg-white/40 p-1 dark:bg-white/10">
            <TabsTrigger value="single" className="rounded-xl">
              {isEdit ? "Edit question" : "Single question"}
            </TabsTrigger>
            {!isEdit ? (
              <TabsTrigger value="import" className="rounded-xl">
                Import AIKEN
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="single" className="mt-4">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                            <RichTextEditor
                              value={(form.getValues("questionTextJson") as RichTextContent) ?? plainTextToRichDoc(field.value)}
                              placeholder="Question"
                              minHeightClassName="min-h-[160px]"
                              onChange={({ json, text }) => {
                                form.setValue("questionTextJson", json, { shouldDirty: true, shouldValidate: true });
                                field.onChange(text.trim());
                              }}
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
                          <RichTextEditor
                            value={(form.getValues("optionATextJson") as RichTextContent) ?? plainTextToRichDoc(field.value)}
                            placeholder="Option A"
                            minHeightClassName="min-h-[72px]"
                            onChange={({ json, text }) => {
                              form.setValue("optionATextJson", json, { shouldDirty: true, shouldValidate: true });
                              field.onChange(text.trim());
                            }}
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
                          <RichTextEditor
                            value={(form.getValues("optionBTextJson") as RichTextContent) ?? plainTextToRichDoc(field.value)}
                            placeholder="Option B"
                            minHeightClassName="min-h-[72px]"
                            onChange={({ json, text }) => {
                              form.setValue("optionBTextJson", json, { shouldDirty: true, shouldValidate: true });
                              field.onChange(text.trim());
                            }}
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
                          <RichTextEditor
                            value={(form.getValues("optionCTextJson") as RichTextContent) ?? plainTextToRichDoc(field.value)}
                            placeholder="Option C"
                            minHeightClassName="min-h-[72px]"
                            onChange={({ json, text }) => {
                              form.setValue("optionCTextJson", json, { shouldDirty: true, shouldValidate: true });
                              field.onChange(text.trim());
                            }}
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
                          <RichTextEditor
                            value={(form.getValues("optionDTextJson") as RichTextContent) ?? plainTextToRichDoc(field.value)}
                            placeholder="Option D"
                            minHeightClassName="min-h-[72px]"
                            onChange={({ json, text }) => {
                              form.setValue("optionDTextJson", json, { shouldDirty: true, shouldValidate: true });
                              field.onChange(text.trim());
                            }}
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
                        <RichTextEditor
                          value={(form.getValues("explanationJson") as RichTextContent) ?? plainTextToRichDoc(field.value)}
                          placeholder="Explanation"
                          minHeightClassName="min-h-[140px]"
                          onChange={({ json, text }) => {
                            form.setValue("explanationJson", json, { shouldDirty: true, shouldValidate: true });
                            field.onChange(text.trim());
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={submitting || !form.getValues("topicSlug") || !form.getValues("lessonNumber")}>
                {submitting ? "Saving..." : isEdit ? "Save changes" : "Save question"}
              </Button>
            </form>
          </TabsContent>

          {!isEdit ? (
          <TabsContent value="import" className="mt-4">
            <div className="space-y-6">
              <div className="rounded-3xl border border-black/10 bg-white/10 p-5 backdrop-blur-md dark:border-white/10 dark:bg-white/5 md:p-6">
                <div>
                  <div className="text-sm font-semibold text-black/80 dark:text-white/80">AIKEN import</div>
                  <div className="mt-1 text-sm text-black/70 dark:text-white/70">Paste questions in AIKEN format, then review and save.</div>
                </div>

                <div className="mt-4 space-y-3">
                  <Textarea
                    value={aikenText}
                    onChange={(e) => setAikenText(e.target.value)}
                    placeholder={"Question text\nA. Option A\nB. Option B\nC. Option C\nD. Option D\nANSWER: A"}
                    className="min-h-[160px] rounded-xl border-black/10 bg-white/65 shadow-sm placeholder:text-black/40 focus-visible:ring-0 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-white/35"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-black/70 dark:text-white/70">
                      Parsed: <span className="font-semibold text-black dark:text-white">{bulkDrafts.length}</span> • Invalid:{" "}
                      <span className="font-semibold text-black dark:text-white">{bulkInvalidCount}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={aikenFileRef}
                        type="file"
                        accept=".txt,text/plain"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          void file.text().then((txt) => setAikenText(txt));
                          if (aikenFileRef.current) aikenFileRef.current.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                        onClick={() => aikenFileRef.current?.click()}
                      >
                        Upload .txt
                      </Button>
                      <Button
                        type="button"
                        className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                        onClick={parseAikenIntoDrafts}
                        disabled={!aikenText.trim()}
                      >
                        Parse
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                        onClick={() => {
                          setAikenText("");
                          setAikenErrors([]);
                          setBulkDrafts([]);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  {aikenErrors.length ? (
                    <div className="rounded-2xl border border-rose-500/40 bg-rose-500/5 p-4 text-sm text-black/80 dark:text-white/80">
                      {aikenErrors.slice(0, 5).map((e, idx) => (
                        <div key={idx}>{e}</div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {bulkDrafts.length ? (
                <div className="space-y-4">
                  {bulkDrafts.map((d, idx) => {
                    const subjectSlug = form.getValues("subjectSlug");
                    const topicSlug = form.getValues("topicSlug");
                    const lessonNumber = form.getValues("lessonNumber");
                    const valid = mcqCreateSchema.safeParse({
                      subjectSlug,
                      topicSlug,
                      lessonNumber,
                      questionText: d.questionText,
                      questionImageUrl: d.questionImageUrl,
                      optionAText: d.optionAText,
                      optionAImageUrl: d.optionAImageUrl,
                      optionBText: d.optionBText,
                      optionBImageUrl: d.optionBImageUrl,
                      optionCText: d.optionCText,
                      optionCImageUrl: d.optionCImageUrl,
                      optionDText: d.optionDText,
                      optionDImageUrl: d.optionDImageUrl,
                      correctAnswer: d.correctAnswer,
                      explanation: d.explanation,
                    }).success;

                    return (
                      <div
                        key={idx}
                        className={[
                          "rounded-3xl border bg-white/10 p-5 backdrop-blur-md dark:bg-white/5 md:p-6",
                          valid ? "border-black/10 dark:border-white/10" : "border-rose-500/40",
                        ].join(" ")}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-black/80 dark:text-white/80">Question {idx + 1}</div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Select
                              value={d.correctAnswer}
                              onValueChange={(v) => updateBulkDraft(idx, { correctAnswer: v as BulkMcqDraft["correctAnswer"] })}
                            >
                              <SelectTrigger className="h-9 w-[140px] rounded-md border-black/10 bg-white/60 shadow-sm focus-visible:ring-0 dark:border-white/10 dark:bg-white/5">
                                <SelectValue placeholder="Correct" />
                              </SelectTrigger>
                              <SelectContent>
                                {(["A", "B", "C", "D"] as const).map((k) => (
                                  <SelectItem key={k} value={k}>
                                    Correct: {k}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-9 rounded-md border-2 border-black bg-transparent px-3 text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                              onClick={() => removeBulkDraft(idx)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
                          <div className="lg:col-span-3 space-y-2">
                            <div className="text-xs font-semibold text-black/70 dark:text-white/70">Question text</div>
                            <RichTextEditor
                              value={d.questionTextJson}
                              minHeightClassName="min-h-[140px]"
                              onChange={({ json, text }) => updateBulkDraft(idx, { questionTextJson: json, questionText: text })}
                            />
                          </div>
                          <div className="lg:col-span-2">
                            <ImagePickerField
                              label="Question image"
                              value={d.questionImageUrl}
                              onChange={(v) => updateBulkDraft(idx, { questionImageUrl: v })}
                              folder="edumax/questions/question"
                              fieldKey={`bulk_${idx}_questionImageUrl`}
                            />
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                          <div className="space-y-2 rounded-2xl border border-black/10 bg-white/10 p-4 dark:border-white/10 dark:bg-white/5">
                            <div className="text-xs font-semibold text-black/70 dark:text-white/70">Option A</div>
                            <RichTextEditor
                              value={d.optionATextJson}
                              minHeightClassName="min-h-[64px]"
                              onChange={({ json, text }) => updateBulkDraft(idx, { optionATextJson: json, optionAText: text })}
                            />
                            <ImagePickerField
                              label="Option A image"
                              value={d.optionAImageUrl}
                              onChange={(v) => updateBulkDraft(idx, { optionAImageUrl: v })}
                              folder="edumax/questions/options"
                              fieldKey={`bulk_${idx}_optionAImageUrl`}
                            />
                          </div>

                          <div className="space-y-2 rounded-2xl border border-black/10 bg-white/10 p-4 dark:border-white/10 dark:bg-white/5">
                            <div className="text-xs font-semibold text-black/70 dark:text-white/70">Option B</div>
                            <RichTextEditor
                              value={d.optionBTextJson}
                              minHeightClassName="min-h-[64px]"
                              onChange={({ json, text }) => updateBulkDraft(idx, { optionBTextJson: json, optionBText: text })}
                            />
                            <ImagePickerField
                              label="Option B image"
                              value={d.optionBImageUrl}
                              onChange={(v) => updateBulkDraft(idx, { optionBImageUrl: v })}
                              folder="edumax/questions/options"
                              fieldKey={`bulk_${idx}_optionBImageUrl`}
                            />
                          </div>

                          <div className="space-y-2 rounded-2xl border border-black/10 bg-white/10 p-4 dark:border-white/10 dark:bg-white/5">
                            <div className="text-xs font-semibold text-black/70 dark:text-white/70">Option C</div>
                            <RichTextEditor
                              value={d.optionCTextJson}
                              minHeightClassName="min-h-[64px]"
                              onChange={({ json, text }) => updateBulkDraft(idx, { optionCTextJson: json, optionCText: text })}
                            />
                            <ImagePickerField
                              label="Option C image"
                              value={d.optionCImageUrl}
                              onChange={(v) => updateBulkDraft(idx, { optionCImageUrl: v })}
                              folder="edumax/questions/options"
                              fieldKey={`bulk_${idx}_optionCImageUrl`}
                            />
                          </div>

                          <div className="space-y-2 rounded-2xl border border-black/10 bg-white/10 p-4 dark:border-white/10 dark:bg-white/5">
                            <div className="text-xs font-semibold text-black/70 dark:text-white/70">Option D</div>
                            <RichTextEditor
                              value={d.optionDTextJson}
                              minHeightClassName="min-h-[64px]"
                              onChange={({ json, text }) => updateBulkDraft(idx, { optionDTextJson: json, optionDText: text })}
                            />
                            <ImagePickerField
                              label="Option D image"
                              value={d.optionDImageUrl}
                              onChange={(v) => updateBulkDraft(idx, { optionDImageUrl: v })}
                              folder="edumax/questions/options"
                              fieldKey={`bulk_${idx}_optionDImageUrl`}
                            />
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          <div className="text-xs font-semibold text-black/70 dark:text-white/70">Explanation</div>
                          <RichTextEditor
                            value={d.explanationJson}
                            minHeightClassName="min-h-[120px]"
                            onChange={({ json, text }) => updateBulkDraft(idx, { explanationJson: json, explanation: text })}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-black/10 bg-white/10 p-5 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                    <div className="text-sm text-black/70 dark:text-white/70">
                      Ready to save:{" "}
                      <span className="font-semibold text-black dark:text-white">{bulkDrafts.length - bulkInvalidCount}</span> /{" "}
                      <span className="font-semibold text-black dark:text-white">{bulkDrafts.length}</span>
                    </div>
                    <Button
                      type="button"
                      className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                      disabled={bulkSaving || bulkDrafts.length === 0 || bulkInvalidCount > 0}
                      onClick={() => void saveBulk()}
                    >
                      {bulkSaving ? "Saving..." : "Save all questions"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </Form>
  );
}
