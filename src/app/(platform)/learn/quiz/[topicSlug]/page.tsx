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
    <div className="container mx-auto px-4 md:px-6 py-10 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/learn/topics/${topic.slug}`} className="text-sm text-primary hover:underline">
          Back to topic
        </Link>
        <Link href="/learn" className="text-sm text-primary hover:underline">
          All subjects
        </Link>
      </div>

      <QuizClient topicSlug={topic.slug} topicName={topic.name} />
    </div>
  );
}

