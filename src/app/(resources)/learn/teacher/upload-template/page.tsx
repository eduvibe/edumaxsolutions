import { TeacherTemplateForm } from "@/components/platform/TeacherTemplateForm";
import { getPlatformRole } from "@/lib/platform/session";
import { listAllTopics, listSubjects } from "@/lib/platform/store";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Upload Template",
};

export default async function UploadTemplatePage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string }> | { type?: string };
}) {
  if ((await getPlatformRole()) !== "teacher") {
    redirect("/learn/teacher/login");
  }

  const sp = searchParams ? await searchParams : undefined;
  const subjects = listSubjects();
  const topics = listAllTopics();
  const type = sp?.type;
  const initialResourceType =
    type === "worksheet" || type === "scheme" || type === "slides" ? type : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Upload template</h1>
        <p className="text-sm text-black/70 dark:text-white/70">Share lesson materials and slides.</p>
      </header>

      <div className="rounded-3xl border border-black/10 bg-transparent p-6 dark:border-white/10 md:p-8">
        <TeacherTemplateForm subjects={subjects} topics={topics} initialResourceType={initialResourceType} />
      </div>
    </div>
  );
}
