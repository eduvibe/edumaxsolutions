import { QuizClient } from "@/components/platform/QuizClient";
import { getTopicBySlug } from "@/lib/platform/store";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: { topicSlug: string };
};

export default function QuizPage({ params }: PageProps) {
  const topic = getTopicBySlug(params.topicSlug);
  if (!topic) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={`/learn/topics/${topic.slug}`}
          className="text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white"
        >
          Back to topic
        </Link>
        <Link href="/learn" className="text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
          All subjects
        </Link>
      </div>

      <QuizClient topicSlug={topic.slug} topicName={topic.name} />
    </div>
  );
}
