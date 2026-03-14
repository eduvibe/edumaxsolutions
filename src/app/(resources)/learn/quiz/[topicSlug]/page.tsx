import { QuizClient } from "@/components/platform/QuizClient";
import { getTopicBySlug } from "@/lib/platform/store";
import { cn } from "@/lib/utils";
import { ChevronLeft, HelpCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ topicSlug: string }> | { topicSlug: string };
  searchParams?: Promise<{ lesson?: string }> | { lesson?: string };
};

export default async function QuizPage({ params, searchParams }: PageProps) {
  const p = await params;
  const sp = searchParams ? await searchParams : undefined;
  const topic = getTopicBySlug(p.topicSlug);
  if (!topic) notFound();
  const lessonNumberRaw = sp?.lesson ?? "";
  const lessonNumber = lessonNumberRaw ? Number.parseInt(lessonNumberRaw, 10) : undefined;

  return (
    <div className="bg-[#f3edf6] dark:bg-[#0b0f14]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center gap-2 text-sm text-black/70 dark:text-white/70">
          <Link href={`/learn/topics/${topic.slug}`} className="inline-flex items-center gap-2 hover:underline underline-offset-4">
            <ChevronLeft className="h-4 w-4" />
            Back to topic
          </Link>
          <span>•</span>
          <Link href="/learn" className="hover:underline underline-offset-4">
            Browse resources
          </Link>
        </div>

        <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-black/70 dark:text-white/70">
              <HelpCircle className="h-4 w-4" />
              Practice test
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-black dark:text-white">
              {topic.name}
            </h1>
            <div className="text-sm text-black/70 dark:text-white/70">
              {Number.isFinite(lessonNumber) ? `Lesson ${lessonNumber}` : "Full topic"}
            </div>
          </div>

          <div
            className={cn(
              "rounded-2xl border border-black/10 bg-white/10 p-4 backdrop-blur-md dark:border-white/10 dark:bg-white/5",
              "text-sm text-black/70 dark:text-white/70"
            )}
          >
            Answer all questions, submit, then review corrections and explanations.
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-transparent">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <QuizClient topicSlug={topic.slug} topicName={topic.name} lessonNumber={Number.isFinite(lessonNumber) ? lessonNumber : undefined} />
        </div>
      </div>
    </div>
  );
}
