import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NoteViewTracker } from "@/components/platform/NoteViewTracker";
import {
  getNoteById,
  getTeacherById,
  listSubjects,
} from "@/lib/platform/store";
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
    <div className="container mx-auto px-4 md:px-6 py-10 space-y-6">
      <NoteViewTracker noteId={note.id} />

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/learn" className="text-sm text-primary hover:underline">
          Learning Resources
        </Link>
        {subject ? <Badge variant="secondary">{subject.name}</Badge> : null}
      </div>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{note.title}</h1>
        <div className="text-sm text-muted-foreground">
          {author?.name ?? "Teacher"} • {new Date(note.dateCreated).toLocaleDateString()} •{" "}
          {note.views} views
        </div>
      </header>

      <section className="space-y-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="prose prose-neutral max-w-none whitespace-pre-wrap">
            {note.content}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link href={`/api/notes/${note.id}/download`}>Download</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/learn">Browse more</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
