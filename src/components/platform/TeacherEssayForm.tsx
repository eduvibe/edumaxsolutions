"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { essayCreateSchema } from "@/lib/schemas";
import type { Subject, Topic } from "@/lib/platform/types";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FormValues = z.infer<typeof essayCreateSchema>;

export function TeacherEssayForm({ subjects, topics }: { subjects: Subject[]; topics: Topic[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(essayCreateSchema),
    defaultValues: {
      subjectSlug: subjects[0]?.slug ?? "",
      topicSlug: "",
      questionText: "",
      referenceAnswer: "",
    },
  });

  const selectedSubjectSlug = form.watch("subjectSlug");
  const topicOptions = useMemo(() => {
    const subject = subjects.find((s) => s.slug === selectedSubjectSlug);
    if (!subject) return [];
    return topics.filter((t) => t.subjectId === subject.id);
  }, [selectedSubjectSlug, subjects, topics]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/essay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json()) as { essay?: { id: string }; error?: string };
      if (!res.ok || !data.essay) {
        throw new Error(data.error ?? "Failed to create essay question");
      }
      toast({ title: "Essay question created" });
      router.push(`/learn/topics/${values.topicSlug}`);
      router.refresh();
    } catch (e) {
      toast({ title: "Create essay failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
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
        </div>

        <FormField
          control={form.control}
          name="questionText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter the essay question..." className="min-h-[160px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="referenceAnswer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference answer (optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Provide a marking guide or reference answer..." className="min-h-[160px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={submitting || !form.getValues("topicSlug")}>
          {submitting ? "Saving..." : "Save essay question"}
        </Button>
      </form>
    </Form>
  );
}

