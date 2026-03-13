import { TeacherMcqForm } from "@/components/platform/TeacherMcqForm";
import { getPlatformRole } from "@/lib/platform/session";
import { listAllTopics, listSubjects } from "@/lib/platform/store";
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
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Create MCQ</h1>
        <p className="text-sm text-black/70 dark:text-white/70">Build exam-style questions with explanations.</p>
      </header>

      <div className="rounded-3xl border border-black/10 bg-transparent p-6 dark:border-white/10 md:p-8">
        <TeacherMcqForm subjects={subjects} topics={topics} />
      </div>
    </div>
  );
}
