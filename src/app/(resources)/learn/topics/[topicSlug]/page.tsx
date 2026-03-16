import { Button } from "@/components/ui/button";
import { getPlatformRole } from "@/lib/platform/session";
import { getTopicResources, listLessonsByTopicSlug, listVideosByTopicSlug } from "@/lib/platform/store";
import { ArrowRight, Bookmark, ChevronLeft, Download, FileText, Film, HelpCircle, Monitor, Share2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ topicSlug: string }> | { topicSlug: string };
};

export default async function TopicPage({ params }: PageProps) {
  const p = await params;
  const role = await getPlatformRole();
  const resources = await getTopicResources(p.topicSlug);
  if (!resources) notFound();

  const { subject, topic, notes, questions, templates } = resources;
  const lessons = listLessonsByTopicSlug(topic.slug);
  const allVideos = role === "teacher" ? await listVideosByTopicSlug(topic.slug) : [];
  const section =
    topic.schoolSection === "primary" || topic.schoolSection === "jss" || topic.schoolSection === "sss"
      ? topic.schoolSection
      : "primary";

  if (role === "student") {
    return (
      <div className="bg-[#e7eefc] dark:bg-[#0b0f14]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-black/80 dark:text-white/80">
            <Link
              href={`/learn/subjects/${subject.slug}?section=${encodeURIComponent(section)}`}
              className="inline-flex items-center gap-2 hover:underline underline-offset-4"
            >
              <ChevronLeft className="h-4 w-4" />
              Change topic
            </Link>
            <span className="text-black/40 dark:text-white/40">•</span>
            <Link
              href={`/learn/subjects?section=${encodeURIComponent(section)}`}
              className="hover:underline underline-offset-4 text-black/70 dark:text-white/70"
            >
              Change subject
            </Link>
          </div>

          <div className="mt-8 flex items-start gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#b7c6ff] text-black">
              <Monitor className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-5xl font-extrabold tracking-tight text-black dark:text-white">{topic.name}</h1>
              <div className="mt-1 text-sm text-black/70 dark:text-white/70">
                {topic.yearGroup ? `${topic.yearGroup} • ${subject.name}` : subject.name}
              </div>
            </div>
          </div>

          <div className="mt-10">
            <div className="flex items-center gap-3 text-lg font-extrabold tracking-tight text-black dark:text-white">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-yellow-300 text-black">
                i
              </span>
              Choose a sub-topic ({lessons.length})
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white/10 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              {lessons.length === 0 ? (
                <div className="p-6 text-sm text-black/70 dark:text-white/70">
                  Sub-topics for this topic are not available yet.
                </div>
              ) : (
                <div className="divide-y divide-black/10 dark:divide-white/10">
                  {lessons.map((lesson) => (
                    <Link
                      key={lesson.id}
                      href={`/learn/topics/${topic.slug}/lessons/${lesson.lessonNumber}`}
                      className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-white/10 dark:hover:bg-white/10"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/40 text-sm font-extrabold text-black dark:bg-white/10 dark:text-white">
                        {lesson.lessonNumber}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-extrabold tracking-tight text-black dark:text-white">
                          {lesson.title}
                        </div>
                        {lesson.objective ? (
                          <div className="mt-1 line-clamp-1 text-sm text-black/60 dark:text-white/60">{lesson.objective}</div>
                        ) : null}
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/10 text-black dark:border-white/10 dark:text-white">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                const videos = allVideos.filter((v) => v.lessonNumber === lesson.lessonNumber).length;

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
                        <Link
                          href={`/learn/topics/${topic.slug}/lessons/${lesson.lessonNumber}`}
                          className="text-lg font-extrabold tracking-tight text-black hover:underline underline-offset-4 dark:text-white"
                        >
                          {lesson.title}
                        </Link>
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
                            <Link href={`/learn/topics/${topic.slug}/lessons/${lesson.lessonNumber}`}>Open lesson</Link>
                          </Button>
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
