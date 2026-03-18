import { TeacherMcqForm } from "@/components/platform/TeacherMcqForm";
import { getPlatformRole } from "@/lib/platform/session";
import { listCurriculumLessons, listCurriculumSubjects, listCurriculumTopics } from "@/lib/platform/store";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Create MCQ",
};

export default async function CreateQuestionPage({
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
    <div className="bg-[#f3edf6] dark:bg-[#0b0f14]">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-black/80 dark:text-white/80">
            <Link href="/learn/teacher/dashboard" className="hover:underline underline-offset-4">
              Dashboard
            </Link>
            <span className="text-black/40 dark:text-white/40">•</span>
            <span>Create MCQ</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-black dark:text-white">Create MCQ</h1>
          <p className="max-w-2xl text-sm text-black/70 dark:text-white/70">
            Add exam-style questions, optional images, and clear explanations.
          </p>
        </header>

        <TeacherMcqForm subjects={subjects} topics={topics} lessons={lessons} initialValues={initialValues} />
      </div>
    </div>
  );
}
