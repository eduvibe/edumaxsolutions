"use client";

import type { Lesson, Subject, Topic } from "@/lib/platform/types";
import { getSupabaseAccessToken } from "@/lib/platform/supabaseBrowser";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TeacherMcqForm } from "@/components/platform/TeacherMcqForm";
import { plainTextToRichDoc } from "@/lib/platform/richText";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type EditPayload = {
  id: string;
  subjectSlug: string;
  topicSlug: string;
  lessonNumber: number | null;
  questionText: string;
  questionTextJson?: Record<string, unknown> | null;
  questionImageUrl: string;
  optionAText: string;
  optionATextJson?: Record<string, unknown> | null;
  optionAImageUrl: string;
  optionBText: string;
  optionBTextJson?: Record<string, unknown> | null;
  optionBImageUrl: string;
  optionCText: string;
  optionCTextJson?: Record<string, unknown> | null;
  optionCImageUrl: string;
  optionDText: string;
  optionDTextJson?: Record<string, unknown> | null;
  optionDImageUrl: string;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  explanationJson?: Record<string, unknown> | null;
};

export function TeacherMcqEditClient({
  questionId,
  subjects,
  topics,
  lessons,
}: {
  questionId: string;
  subjects: Subject[];
  topics: Topic[];
  lessons: Lesson[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<EditPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const token = await getSupabaseAccessToken();
        if (!token) throw new Error("Tutor session expired. Please sign in again.");
        const res = await fetch(`/api/questions/${encodeURIComponent(questionId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json().catch(() => ({}))) as { question?: EditPayload; error?: string };
        if (!res.ok || !data.question) throw new Error(data.error ?? "Unable to load question");
        if (!cancelled) setQuestion(data.question);
      } catch (e) {
        toast({ title: "Failed to load question", description: e instanceof Error ? e.message : "Unknown error" });
        router.push("/learn/teacher/dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [questionId, router, toast]);

  const initialValues = useMemo(() => {
    if (!question) return null;
    const ensureJson = (maybe: Record<string, unknown> | null | undefined, fallbackText: string) =>
      maybe && typeof maybe === "object" ? maybe : plainTextToRichDoc(fallbackText);

    return {
      subjectSlug: question.subjectSlug,
      topicSlug: question.topicSlug,
      lessonNumber: question.lessonNumber ?? null,
      questionText: question.questionText,
      questionTextJson: ensureJson(question.questionTextJson ?? undefined, question.questionText),
      questionImageUrl: question.questionImageUrl ?? "",
      optionAText: question.optionAText,
      optionATextJson: ensureJson(question.optionATextJson ?? undefined, question.optionAText),
      optionAImageUrl: question.optionAImageUrl ?? "",
      optionBText: question.optionBText,
      optionBTextJson: ensureJson(question.optionBTextJson ?? undefined, question.optionBText),
      optionBImageUrl: question.optionBImageUrl ?? "",
      optionCText: question.optionCText,
      optionCTextJson: ensureJson(question.optionCTextJson ?? undefined, question.optionCText),
      optionCImageUrl: question.optionCImageUrl ?? "",
      optionDText: question.optionDText,
      optionDTextJson: ensureJson(question.optionDTextJson ?? undefined, question.optionDText),
      optionDImageUrl: question.optionDImageUrl ?? "",
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      explanationJson: ensureJson(question.explanationJson ?? undefined, question.explanation),
    };
  }, [question]);

  if (loading || !initialValues) {
    return (
      <div className="rounded-3xl border border-black/10 bg-white/10 p-6 text-sm text-black/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white/70">
        Loading question…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="secondary"
          className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
        >
          <Link href="/learn/teacher/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      <TeacherMcqForm subjects={subjects} topics={topics} lessons={lessons} mode="edit" questionId={questionId} initialValues={initialValues} />
    </div>
  );
}
