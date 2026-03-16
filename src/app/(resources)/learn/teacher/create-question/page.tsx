import { TeacherMcqForm } from "@/components/platform/TeacherMcqForm";
import { getPlatformRole } from "@/lib/platform/session";
import { listAllTopics, listSubjects } from "@/lib/platform/store";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Create MCQ",
};

export default async function CreateQuestionPage() {
  if ((await getPlatformRole()) !== "teacher") {
    redirect("/learn/teacher/login");
  }

  const subjects = listSubjects();
  const topics = listAllTopics();

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

        <TeacherMcqForm subjects={subjects} topics={topics} />
      </div>
    </div>
  );
}
