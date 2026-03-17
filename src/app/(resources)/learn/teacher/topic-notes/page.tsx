import { getPlatformRole } from "@/lib/platform/session";
import { listAllTopics, listSubjects } from "@/lib/platform/store";
import { redirect } from "next/navigation";
import { TeacherTopicNotePicker } from "@/components/platform/TeacherTopicNotePicker";

export const metadata = {
  title: "Topic Notes",
};

export default async function TeacherTopicNotesPage() {
  if ((await getPlatformRole()) !== "teacher") {
    redirect("/learn/teacher/login");
  }

  const subjects = listSubjects();
  const topics = listAllTopics();

  return (
    <div className="bg-[#f3edf6] dark:bg-[#0b0f14]">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-white">Topic notes</h1>
          <p className="text-sm text-black/70 dark:text-white/70">Open a note to suggest edits or review changes.</p>
        </header>

        <div className="rounded-3xl border border-black/10 bg-transparent p-6 dark:border-white/10 md:p-8">
          <TeacherTopicNotePicker subjects={subjects} topics={topics} />
        </div>
      </div>
    </div>
  );
}

