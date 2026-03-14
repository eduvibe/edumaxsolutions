import { Button } from "@/components/ui/button";
import { getPlatformRole } from "@/lib/platform/session";
import { getTopicResources, listLessonsByTopicSlug } from "@/lib/platform/store";
import { Bookmark, Download, FileText, Film, HelpCircle, Monitor, Share2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ topicSlug: string }> | { topicSlug: string };
};

export default async function TopicPage({ params }: PageProps) {
  const p = await params;
  const role = await getPlatformRole();
  const resources = getTopicResources(p.topicSlug);
  if (!resources) notFound();

  const { subject, topic, notes, questions, templates } = resources;
  const lessons = listLessonsByTopicSlug(topic.slug);

  return (
    <div className="bg-[#f3edf6] dark:bg-[#0b0f14]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center gap-2 text-sm text-black/70 dark:text-white/70">
          <Link href="/learn" className="hover:underline underline-offset-4">
            Home
          </Link>
          <span>›</span>
          <Link href={`/learn/subjects/${subject.slug}`} className="hover:underline underline-offset-4">
            {subject.name}
          </Link>
          <span>›</span>
          <span className="font-semibold text-black dark:text-white">{topic.name}</span>
        </div>

        <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            {topic.yearGroup ? (
              <div className="text-sm font-semibold text-black/70 dark:text-white/70">{topic.yearGroup}</div>
            ) : null}
            <h1 className="text-4xl font-extrabold tracking-tight text-black dark:text-white">{topic.name}</h1>
            {topic.description ? (
              <div className="max-w-2xl text-sm text-black/70 dark:text-white/70">{topic.description}</div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
              <Link href={`/api/topics/${topic.slug}/download`}>
                <Download className="mr-2 h-4 w-4" />
                Download (.zip)
              </Link>
            </Button>
            <Button
              variant="secondary"
              className="rounded-md border-2 border-black bg-white text-black hover:bg-black/5 dark:border-white dark:bg-black dark:text-white dark:hover:bg-white/10"
              type="button"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button
              variant="secondary"
              className="rounded-md border-2 border-black bg-white text-black hover:bg-black/5 dark:border-white dark:bg-black dark:text-white dark:hover:bg-white/10"
              type="button"
            >
              <Bookmark className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button asChild variant="secondary" className="rounded-md border-2 border-black bg-white text-black hover:bg-black/5 dark:border-white dark:bg-black dark:text-white dark:hover:bg-white/10">
              <Link href={`/learn/quiz/${topic.slug}`}>Take test</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-transparent">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="text-2xl font-extrabold tracking-tight">Lessons ({lessons.length})</div>

          <div className="mt-6 space-y-4">
            {lessons.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-transparent p-6 text-sm text-black/70 dark:border-white/10 dark:text-white/70">
                No lessons yet.
              </div>
            ) : (
              lessons.map((lesson) => {
                const lessonNotes = notes.filter((n) => (n.lessonNumber ?? null) === lesson.lessonNumber);
                const lessonQuestions = questions.filter((q) => (q.lessonNumber ?? null) === lesson.lessonNumber);
                const lessonSlides = templates.filter(
                  (t) => (t.resourceType ?? "slides") === "slides" && (t.lessonNumber ?? null) === lesson.lessonNumber
                );
                const lessonWorksheets = templates.filter(
                  (t) => (t.resourceType ?? "slides") === "worksheet" && (t.lessonNumber ?? null) === lesson.lessonNumber
                );
                const videos = 0;

                return (
                  <div
                    key={lesson.id}
                    className="overflow-hidden rounded-2xl border-2 border-black/70 bg-white/10 backdrop-blur-md dark:border-white/20 dark:bg-white/5"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[72px_1fr]">
                      <div className="flex items-stretch">
                        <div className="flex w-full items-center justify-center bg-[#d9b8d8] text-2xl font-extrabold text-black">
                          {lesson.lessonNumber}
                        </div>
                      </div>

                      <div className="p-5 md:p-6">
                        <div className="text-lg font-extrabold tracking-tight text-black dark:text-white">{lesson.title}</div>
                        {lesson.objective ? (
                          <div className="mt-1 text-sm text-black/70 dark:text-white/70">{lesson.objective}</div>
                        ) : null}

                        <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-black/80 dark:text-white/80">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            <span>{lessonSlides.length} Slide deck</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>{lessonWorksheets.length} Worksheet</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <HelpCircle className="h-4 w-4" />
                            <span>{lessonQuestions.length} Quizzes</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Film className="h-4 w-4" />
                            <span>{videos} Video</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>{lessonNotes.length} Notes</span>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          <Button
                            asChild
                            variant="secondary"
                            className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                          >
                            <Link href={`/api/topics/${topic.slug}/lessons/${lesson.lessonNumber}/download`}>
                              <Download className="mr-2 h-4 w-4" />
                              Download lesson
                            </Link>
                          </Button>
                          <Button asChild className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
                            <Link href={`/learn/quiz/${topic.slug}?lesson=${lesson.lessonNumber}`}>Take test</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {role === "teacher" ? (
            <div className="mt-10 rounded-2xl border border-black/10 bg-transparent p-5 text-sm text-black/70 dark:border-white/10 dark:text-white/70">
              Teachers can upload slides/worksheets and add questions to specific lessons.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
