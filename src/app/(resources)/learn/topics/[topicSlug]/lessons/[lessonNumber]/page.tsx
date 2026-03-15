import { Button } from "@/components/ui/button";
import { getPlatformRole } from "@/lib/platform/session";
import {
  getTopicResources,
  getTeacherById,
  listLessonsByTopicSlug,
  listNotesByTopicAndLesson,
  listQuestionsByTopicAndLesson,
  listVideosByTopicAndLesson,
} from "@/lib/platform/store";
import { ChevronLeft, Download, FileText, HelpCircle, PlayCircle, Video } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ topicSlug: string; lessonNumber: string }> | { topicSlug: string; lessonNumber: string };
};

export default async function LessonPage({ params }: PageProps) {
  const p = await params;
  const role = await getPlatformRole();
  const lessonNumber = Number.parseInt(p.lessonNumber, 10);
  if (!Number.isFinite(lessonNumber) || lessonNumber <= 0) notFound();

  const resources = getTopicResources(p.topicSlug);
  if (!resources) notFound();

  const { subject, topic } = resources;
  const lessons = listLessonsByTopicSlug(topic.slug);
  const lesson = lessons.find((l) => l.lessonNumber === lessonNumber);
  if (!lesson) notFound();

  const notes = listNotesByTopicAndLesson(topic.slug, lessonNumber);
  const questions = listQuestionsByTopicAndLesson(topic.slug, lessonNumber);
  const videos = listVideosByTopicAndLesson(topic.slug, lessonNumber);

  return (
    <div className="bg-[#e7eefc] dark:bg-[#0b0f14]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center gap-2 text-sm text-black/70 dark:text-white/70">
          <Link
            href={`/learn/subjects?section=${encodeURIComponent(topic.schoolSection ?? "primary")}`}
            className="inline-flex items-center gap-2 hover:underline underline-offset-4"
          >
            <ChevronLeft className="h-4 w-4" />
            Change subject
          </Link>
          <span>•</span>
          <Link href={`/learn/subjects/${subject.slug}?section=${encodeURIComponent(topic.schoolSection ?? "primary")}`} className="hover:underline underline-offset-4">
            Change topic
          </Link>
          <span>•</span>
          <Link href={`/learn/topics/${topic.slug}`} className="hover:underline underline-offset-4">
            View all sub-topics
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#b7c6ff] text-black">
                <FileText className="h-7 w-7" />
              </div>
              <div className="text-sm text-black/70 dark:text-white/70">
                {topic.yearGroup ? `${topic.yearGroup} • ${subject.name}` : subject.name}
              </div>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-black dark:text-white">{lesson.title}</h1>

            <div className="rounded-2xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              <div className="text-sm font-semibold text-black/80 dark:text-white/80">Lesson outcome</div>
              <div className="mt-2 text-sm text-black/70 dark:text-white/70">
                {lesson.objective ?? "This lesson will help you understand the key ideas step by step."}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
                <Link href={`/api/topics/${topic.slug}/lessons/${lessonNumber}/download`}>
                  <Download className="mr-2 h-4 w-4" />
                  Download lesson (.zip)
                </Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
              >
                <Link href={`/api/topics/${topic.slug}/download`}>
                  <Download className="mr-2 h-4 w-4" />
                  Download unit (.zip)
                </Link>
              </Button>
            </div>

            <div className="space-y-4 pt-6">
              <div id="notes" className="text-xl font-extrabold tracking-tight text-black dark:text-white">Notes</div>
              {notes.length === 0 ? (
                <div className="rounded-2xl border border-black/10 bg-white/10 p-6 text-sm text-black/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  No notes for this lesson yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((n) => {
                    const author = getTeacherById(n.authorId);
                    return (
                      <Link
                        key={n.id}
                        href={`/learn/notes/${n.id}`}
                        className="block rounded-2xl border border-black/10 bg-white/10 p-5 backdrop-blur-md transition-colors hover:bg-white/20 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        <div className="flex items-start justify-between gap-6">
                          <div className="min-w-0">
                            <div className="truncate text-base font-extrabold tracking-tight text-black dark:text-white">{n.title}</div>
                            <div className="mt-1 text-sm text-black/70 dark:text-white/70">
                              {author?.name ?? "Tutor"} • {new Date(n.dateCreated).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-2 text-sm font-semibold text-black/80 dark:text-white/80">
                            <span>Open</span>
                            <ChevronLeft className="h-4 w-4 rotate-180" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4 pt-6">
              <div id="videos" className="text-xl font-extrabold tracking-tight text-black dark:text-white">Videos</div>
              {videos.length === 0 ? (
                <div className="rounded-2xl border border-black/10 bg-white/10 p-6 text-sm text-black/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  No videos for this lesson yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {videos.map((v) => {
                    const author = getTeacherById(v.authorId);
                    return (
                      <a
                        key={v.id}
                        href={v.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-2xl border border-black/10 bg-white/10 p-5 backdrop-blur-md transition-colors hover:bg-white/20 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        <div className="flex items-start justify-between gap-6">
                          <div className="min-w-0">
                            <div className="truncate text-base font-extrabold tracking-tight text-black dark:text-white">{v.title}</div>
                            <div className="mt-1 text-sm text-black/70 dark:text-white/70">{author?.name ?? "Tutor"}</div>
                          </div>
                          <div className="inline-flex items-center gap-2 text-sm font-semibold text-black/80 dark:text-white/80">
                            <PlayCircle className="h-5 w-5" />
                            <span>Watch</span>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {role === "teacher" ? (
              <div className="pt-8">
                <div className="rounded-2xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                  <div className="text-sm font-semibold text-black/80 dark:text-white/80">Tutor tools</div>
                  <div className="mt-2 text-sm text-black/70 dark:text-white/70">
                    Add new notes, quizzes and resources for this sub-topic.
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
                      <Link href="/learn/teacher/create-note">Add note</Link>
                    </Button>
                    <Button
                      asChild
                      variant="secondary"
                      className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                    >
                      <Link href="/learn/teacher/create-question">Add quiz</Link>
                    </Button>
                    <Button
                      asChild
                      variant="secondary"
                      className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                    >
                      <Link href="/learn/teacher/upload-template?type=slides">Upload slides</Link>
                    </Button>
                    <Button
                      asChild
                      variant="secondary"
                      className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                    >
                      <Link href="/learn/teacher/upload-template?type=worksheet">Upload worksheet</Link>
                    </Button>
                    <Button
                      asChild
                      variant="secondary"
                      className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                    >
                      <Link href="/learn/templates">Browse templates</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              <div className="text-sm font-semibold text-black/80 dark:text-white/80">Choose a resource</div>
              <div className="mt-3 space-y-3">
                <a
                  href="#notes"
                  className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white/10 px-4 py-4 text-black backdrop-blur-md transition-colors hover:bg-white/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5" />
                    <div>
                      <div className="text-sm font-extrabold">Mission</div>
                      <div className="text-xs text-black/60 dark:text-white/60">{notes.length} notes</div>
                    </div>
                  </div>
                  <ChevronLeft className="h-5 w-5 rotate-180" />
                </a>

                <Link
                  href={`/learn/quiz/${topic.slug}?lesson=${lessonNumber}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white/10 px-4 py-4 text-black backdrop-blur-md transition-colors hover:bg-white/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5" />
                    <div>
                      <div className="text-sm font-extrabold">Quiz</div>
                      <div className="text-xs text-black/60 dark:text-white/60">{questions.length} questions</div>
                    </div>
                  </div>
                  <ChevronLeft className="h-5 w-5 rotate-180" />
                </Link>

                <a
                  href="#videos"
                  className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white/10 px-4 py-4 text-black backdrop-blur-md transition-colors hover:bg-white/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    <Video className="h-5 w-5" />
                    <div>
                      <div className="text-sm font-extrabold">Lesson video</div>
                      <div className="text-xs text-black/60 dark:text-white/60">{videos.length} videos</div>
                    </div>
                  </div>
                  <ChevronLeft className="h-5 w-5 rotate-180" />
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
