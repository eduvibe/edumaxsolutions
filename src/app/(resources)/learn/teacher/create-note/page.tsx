import { getPlatformRole } from "@/lib/platform/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Create Note",
};

export default async function CreateNotePage() {
  if ((await getPlatformRole()) !== "teacher") {
    redirect("/learn/teacher/login");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Notes</h1>
        <p className="text-sm text-black/70 dark:text-white/70">Choose what you want to create or edit.</p>
      </header>

      <div className="rounded-3xl border border-black/10 bg-transparent p-6 dark:border-white/10 md:p-8">
        <div className="grid gap-3">
          <Link
            href="/learn/teacher/topic-notes"
            className="rounded-xl border border-black/10 bg-white/10 p-4 text-sm font-semibold text-black hover:bg-white/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            Official topic notes (suggest edits)
          </Link>
          <Link
            href="/learn/teacher/notes/create"
            className="rounded-xl border border-black/10 bg-white/10 p-4 text-sm font-semibold text-black hover:bg-white/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            Resource notes (create a note for students)
          </Link>
        </div>
      </div>
    </div>
  );
}
