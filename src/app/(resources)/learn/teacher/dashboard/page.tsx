import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getPlatformRole } from "@/lib/platform/session";
import { getTeacherById, listAllNotes, listAllQuestions, listTemplates } from "@/lib/platform/store";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Tutor Dashboard",
};

export default async function TutorDashboardPage() {
  if ((await getPlatformRole()) !== "teacher") {
    redirect("/learn/teacher/login");
  }

  const env = getPlatformPublicEnv();
  const teacher = getTeacherById("teacher_demo_1");

  const notes = listAllNotes().filter((n) => n.authorId === "teacher_demo_1");
  const questions = listAllQuestions().filter((q) => q.authorId === "teacher_demo_1");
  const templates = listTemplates().filter((t) => t.uploadedBy === "teacher_demo_1");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Tutor dashboard</h1>
        <p className="text-sm text-black/70 dark:text-white/70">
          {teacher ? `Signed in as ${teacher.name} (demo)` : "Demo mode"}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild className="rounded-full">
            <Link href="/learn/teacher/create-note">Create note</Link>
          </Button>
          <Button asChild variant="secondary" className="rounded-full bg-black/5 text-black hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
            <Link href="/learn/teacher/create-question">Create MCQ</Link>
          </Button>
          <Button asChild variant="secondary" className="rounded-full bg-black/5 text-black hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
            <Link href="/learn/teacher/upload-template">Upload template</Link>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-black/10 bg-transparent p-5 dark:border-white/10">
          <div className="text-sm font-medium text-black/70 dark:text-white/70">Notes</div>
          <div className="mt-2 text-3xl font-semibold">{notes.length}</div>
        </div>
        <div className="rounded-3xl border border-black/10 bg-transparent p-5 dark:border-white/10">
          <div className="text-sm font-medium text-black/70 dark:text-white/70">MCQs</div>
          <div className="mt-2 text-3xl font-semibold">{questions.length}</div>
        </div>
        <div className="rounded-3xl border border-black/10 bg-transparent p-5 dark:border-white/10">
          <div className="text-sm font-medium text-black/70 dark:text-white/70">Templates</div>
          <div className="mt-2 text-3xl font-semibold">{templates.length}</div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">Your notes</h2>
          <div className="text-sm text-black/70 dark:text-white/70">Views</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-transparent dark:border-white/10">
          <Table className="bg-transparent">
            <TableHeader className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
              <TableRow className="hover:bg-transparent">
                <TableHead>Title</TableHead>
                <TableHead className="text-right">Views</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
              {notes.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={2} className="text-sm text-black/70 dark:text-white/70">
                    No notes yet.
                  </TableCell>
                </TableRow>
              ) : (
                notes.slice(0, 10).map((n) => (
                  <TableRow key={n.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                    <TableCell className="font-medium">
                      <Link href={`/learn/notes/${n.id}`} className="hover:underline">
                        {n.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-black/70 dark:text-white/70">{n.views}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <div className="rounded-3xl border border-black/10 bg-transparent p-5 text-sm text-black/70 dark:border-white/10 dark:text-white/70">
        Supabase: {env.supabaseConfigured ? "configured" : "not configured"} • Cloudinary:{" "}
        {env.cloudinaryConfigured ? "configured" : "not configured"}
      </div>
    </div>
  );
}
