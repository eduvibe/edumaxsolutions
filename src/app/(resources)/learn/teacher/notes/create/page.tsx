import { TeacherNoteForm } from "@/components/platform/TeacherNoteForm";
import { getPlatformRole } from "@/lib/platform/session";
import { listCurriculumLessons, listCurriculumSubjects, listCurriculumTopics } from "@/lib/platform/store";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Create Note",
};

export default async function CreateTeacherNotePage({
  searchParams,
}: {
  searchParams?: Promise<{ subjectSlug?: string; topicSlug?: string; lessonNumber?: string }> | { subjectSlug?: string; topicSlug?: string; lessonNumber?: string };
}) {
  if ((await getPlatformRole()) !== "teacher") {
    redirect("/learn/teacher/login");
  }

  const sp = searchParams ? await searchParams : undefined;
  const subjects = await listCurriculumSubjects();
  const topics = await listCurriculumTopics();
  const lessons = await listCurriculumLessons();

  const subjectSlug = sp?.subjectSlug && subjects.some((s) => s.slug === sp.subjectSlug) ? sp.subjectSlug : undefined;
  const topicSlug = sp?.topicSlug && topics.some((t) => t.slug === sp.topicSlug) ? sp.topicSlug : undefined;
  const derivedSubjectSlug = topicSlug
    ? (() => {
        const t = topics.find((x) => x.slug === topicSlug);
        if (!t) return undefined;
        const s = subjects.find((x) => x.id === t.subjectId);
        return s?.slug;
      })()
    : undefined;
  const lessonNumberParsed = sp?.lessonNumber ? Number.parseInt(sp.lessonNumber, 10) : NaN;
  const lessonNumber = Number.isFinite(lessonNumberParsed) && lessonNumberParsed > 0 ? lessonNumberParsed : undefined;
  const initialValues =
    subjectSlug || topicSlug || lessonNumber
      ? { subjectSlug: subjectSlug ?? derivedSubjectSlug ?? subjects[0]?.slug ?? "", topicSlug: topicSlug ?? "", lessonNumber: lessonNumber ?? null }
      : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Create note</h1>
          <Link href="/learn/teacher/dashboard" className="text-sm font-semibold text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
            Back to dashboard
          </Link>
        </div>
        <p className="text-sm text-black/70 dark:text-white/70">Create a note for an entire topic or a specific sub-topic.</p>
      </header>

      <div className="rounded-3xl border border-black/10 bg-transparent p-6 dark:border-white/10 md:p-8">
        <TeacherNoteForm subjects={subjects} topics={topics} lessons={lessons} initialValues={initialValues} />
      </div>
    </div>
  );
}

