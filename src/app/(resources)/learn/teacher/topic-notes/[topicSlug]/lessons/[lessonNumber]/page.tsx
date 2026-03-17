import { TeacherTopicNoteClient } from "@/components/platform/TeacherTopicNoteClient";
import { getPlatformRole } from "@/lib/platform/session";
import { listAllTopics, listSubjects } from "@/lib/platform/store";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const metadata = {
  title: "Topic Note",
};

export default async function TeacherTopicNotePage({
  params,
}: {
  params: Promise<{ topicSlug: string; lessonNumber: string }> | { topicSlug: string; lessonNumber: string };
}) {
  if ((await getPlatformRole()) !== "teacher") {
    redirect("/learn/teacher/login");
  }

  const p = await params;
  const lessonNumber = Number.parseInt(p.lessonNumber, 10);
  if (!Number.isFinite(lessonNumber) || lessonNumber <= 0) notFound();

  const topics = listAllTopics();
  const topic = topics.find((t) => t.slug === p.topicSlug);
  if (!topic) notFound();
  const subjects = listSubjects();
  const subject = subjects.find((s) => s.id === topic.subjectId);
  if (!subject) notFound();

  return (
    <div className="bg-[#f3edf6] dark:bg-[#0b0f14]">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-black/80 dark:text-white/80">
            <Link href="/learn/teacher/dashboard" className="hover:underline underline-offset-4">
              Dashboard
            </Link>
            <span className="text-black/40 dark:text-white/40">•</span>
            <Link href="/learn/teacher/topic-notes" className="hover:underline underline-offset-4">
              Topic notes
            </Link>
            <span className="text-black/40 dark:text-white/40">•</span>
            <span>{topic.name}</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-black dark:text-white">
            {topic.name} • Lesson {lessonNumber}
          </h1>
          <p className="max-w-2xl text-sm text-black/70 dark:text-white/70">
            Official notes are community-maintained. Submit suggestions and vote on others.
          </p>
        </header>

        <TeacherTopicNoteClient subjectSlug={subject.slug} topicSlug={topic.slug} lessonNumber={lessonNumber} />
      </div>
    </div>
  );
}

