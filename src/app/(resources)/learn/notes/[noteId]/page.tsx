import { Button } from "@/components/ui/button";
import { NoteViewTracker } from "@/components/platform/NoteViewTracker";
import { getNoteById, getTeacherById, listSubjects } from "@/lib/platform/store";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: { noteId: string };
};

export default function NotePage({ params }: PageProps) {
  const note = getNoteById(params.noteId);
  if (!note) notFound();

  const author = getTeacherById(note.authorId);
  const subject = listSubjects().find((s) => s.id === note.subjectId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <NoteViewTracker noteId={note.id} />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/learn" className="text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
          Resources
        </Link>
        {subject ? (
          <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/70 dark:border-white/10 dark:text-white/70">
            {subject.name}
          </span>
        ) : null}
      </div>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{note.title}</h1>
        <div className="text-sm text-black/70 dark:text-white/70">
          {author?.name ?? "Tutor"} • {new Date(note.dateCreated).toLocaleDateString()} • {note.views} views
        </div>
      </header>

      <div className="rounded-3xl border border-black/10 bg-white/30 p-6 leading-relaxed text-black/90 dark:border-white/10 dark:bg-white/5 dark:text-white/90 md:p-8">
        <div className="whitespace-pre-wrap">{note.content}</div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild className="rounded-full">
          <Link href={`/api/notes/${note.id}/download`}>Download</Link>
        </Button>
        <Button
          asChild
          variant="secondary"
          className="rounded-full bg-black/5 text-black hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
        >
          <Link href="/learn">Browse more</Link>
        </Button>
      </div>
    </div>
  );
}
