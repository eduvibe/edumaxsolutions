"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { templateUploadSchema } from "@/lib/schemas";
import type { Subject, Topic } from "@/lib/platform/types";
import { useToast } from "@/hooks/use-toast";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getSupabaseAccessToken } from "@/lib/platform/supabaseBrowser";

type FormValues = z.infer<typeof templateUploadSchema>;

export function TeacherTemplateForm({
  subjects,
  topics,
  initialResourceType,
}: {
  subjects: Subject[];
  topics: Topic[];
  initialResourceType?: FormValues["resourceType"];
}) {
  const env = getPlatformPublicEnv();
  const { toast } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(templateUploadSchema),
    defaultValues: {
      title: "",
      subjectSlug: subjects[0]?.slug ?? "",
      topicSlug: "",
      resourceType: initialResourceType ?? "slides",
      description: "",
      fileUrl: "",
      previewImageUrl: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const token = await getSupabaseAccessToken();
      if (!token) throw new Error("Tutor session expired. Please sign in again.");
      const res = await fetch("/api/templates/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      const data = (await res.json()) as { template?: { id: string }; error?: string };
      if (!res.ok || !data.template) {
        throw new Error(data.error ?? "Failed to upload template");
      }
      toast({ title: "Template uploaded" });
      router.push("/learn/templates");
      router.refresh();
    } catch (e) {
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadThumbnail(file: File) {
    if (!env.cloudinaryConfigured) {
      toast({ title: "Cloudinary not configured", description: "Add Cloudinary environment variables to enable uploads." });
      return;
    }

    setThumbnailUploading(true);
    try {
      const sigRes = await fetch("/api/cloudinary/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "edumax/templates/previews" }),
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
      if (!uploadRes.ok) {
        throw new Error(uploadData.error?.message ?? "Upload failed");
      }
      const url = uploadData.secure_url ?? uploadData.url;
      if (!url) throw new Error("Cloudinary did not return a URL");

      form.setValue("previewImageUrl", url, { shouldDirty: true, shouldValidate: true });
      toast({ title: "Thumbnail uploaded" });
    } catch (e) {
      toast({ title: "Thumbnail upload failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setThumbnailUploading(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    }
  }

  async function uploadTemplateFile(file: File) {
    if (!env.cloudinaryConfigured) {
      toast({ title: "Cloudinary not configured", description: "Add Cloudinary environment variables to enable uploads." });
      return;
    }

    setFileUploading(true);
    try {
      const sigRes = await fetch("/api/cloudinary/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "edumax/templates/files" }),
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

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(sigData.cloudName)}/raw/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadData = (await uploadRes.json().catch(() => ({}))) as { secure_url?: string; url?: string; error?: { message?: string } };
      if (!uploadRes.ok) {
        throw new Error(uploadData.error?.message ?? "Upload failed");
      }
      const url = uploadData.secure_url ?? uploadData.url;
      if (!url) throw new Error("Cloudinary did not return a URL");

      form.setValue("fileUrl", url, { shouldDirty: true, shouldValidate: true });
      toast({ title: "File uploaded" });
    } catch (e) {
      toast({ title: "File upload failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setFileUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      {!env.cloudinaryConfigured ? (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          Preview image uploads will be enabled once Cloudinary environment variables are added.
        </div>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="resourceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resource type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="slides">Lesson slides</SelectItem>
                    <SelectItem value="worksheet">Worksheet</SelectItem>
                    <SelectItem value="scheme">Scheme</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subjectSlug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subject</FormLabel>
                <Select onValueChange={(v) => {
                  field.onChange(v);
                  form.setValue("topicSlug", "");
                }} value={field.value}>
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
                <FormLabel>Topic (optional)</FormLabel>
                <Select onValueChange={(v) => field.onChange(v === "__all__" ? "" : v)} value={field.value ? field.value : "__all__"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="All topics" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__all__">All topics</SelectItem>
                    {topics
                      .filter((t) => t.subjectId === subjects.find((s) => s.slug === form.getValues("subjectSlug"))?.id)
                      .map((t) => (
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
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Biology Lesson Slides" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="What is this template best used for?" className="min-h-[140px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fileUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>File URL</FormLabel>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ppt,.pptx,.pdf,.doc,.docx,.zip,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf,application/zip"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      void uploadTemplateFile(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!env.cloudinaryConfigured || fileUploading}
                    className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {fileUploading ? "Uploading..." : "Upload file"}
                  </Button>
                </div>
                <FormControl>
                  <Input placeholder="https://.../file.pptx" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="previewImageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thumbnail</FormLabel>
                <div className="space-y-3">
                  {field.value ? (
                    <div className="overflow-hidden rounded-xl border border-black/10 bg-white/10 dark:border-white/10 dark:bg-white/5">
                      <div className="relative aspect-[16/9] w-full">
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${field.value})` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        void uploadThumbnail(file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!env.cloudinaryConfigured || thumbnailUploading}
                      className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                      onClick={() => thumbnailInputRef.current?.click()}
                    >
                      {thumbnailUploading ? "Uploading..." : "Upload thumbnail"}
                    </Button>
                    {field.value ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                        onClick={() => form.setValue("previewImageUrl", "", { shouldDirty: true, shouldValidate: true })}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
                <FormControl>
                  <Input placeholder="Or paste a thumbnail URL (optional)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={submitting}>
            {submitting ? "Uploading..." : "Upload template"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
