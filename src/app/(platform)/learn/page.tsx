import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listRecentNotes, listSubjects } from "@/lib/platform/store";
import Link from "next/link";

export const metadata = {
  title: "Learning Resources",
};

export default function LearnPage() {
  const subjects = listSubjects();
  const recentNotes = listRecentNotes(6);

  return (
    <div className="container mx-auto px-4 md:px-6 py-10 space-y-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Learning Resources</h1>
        <p className="text-muted-foreground">
          Browse teacher-contributed notes, practice questions, and templates by
          subject and topic.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold">Subjects</h2>
          <Link href="/templates" className="text-sm text-primary hover:underline">
            View templates
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <Link key={s.id} href={`/learn/subjects/${s.slug}`} className="block">
              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg">{s.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Explore topics, notes, quizzes and more.
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Recent notes</h2>
        {recentNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentNotes.map((n) => (
              <Link key={n.id} href={`/learn/notes/${n.id}`} className="block">
                <Card className="hover:border-primary/40 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-base">{n.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                      {n.content}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

