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
import type { Subject } from "@/lib/platform/types";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getPlatformPublicEnv } from "@/lib/platform/env";

type FormValues = z.infer<typeof templateUploadSchema>;

export function TeacherTemplateForm({ subjects }: { subjects: Subject[] }) {
  const env = getPlatformPublicEnv();
  const { toast } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const categories = ["General", ...subjects.map((s) => s.name)];

  const form = useForm<FormValues>({
    resolver: zodResolver(templateUploadSchema),
    defaultValues: {
      title: "",
      subjectCategory: "General",
      description: "",
      fileUrl: "",
      previewImageUrl: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/templates/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json()) as { template?: { id: string }; error?: string };
      if (!res.ok || !data.template) {
        throw new Error(data.error ?? "Failed to upload template");
      }
      toast({ title: "Template uploaded" });
      router.push("/templates");
      router.refresh();
    } catch (e) {
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setSubmitting(false);
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
            name="subjectCategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subject category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
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
                <FormLabel>Preview image URL (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="https://res.cloudinary.com/..." {...field} />
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

