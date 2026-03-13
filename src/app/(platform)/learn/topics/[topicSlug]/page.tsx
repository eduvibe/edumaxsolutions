import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTeacherById, getTopicResources } from "@/lib/platform/store";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: { topicSlug: string };
};

export default function TopicPage({ params }: PageProps) {
  const resources = getTopicResources(params.topicSlug);
  if (!resources) notFound();

  const { subject, topic, notes, questions, essays, templates } = resources;

  return (
    <div className="container mx-auto px-4 md:px-6 py-10 space-y-8">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{topic.name}</h1>
          <Badge variant="secondary">{subject.name}</Badge>
          <Link href={`/learn/subjects/${subject.slug}`} className="text-sm text-primary hover:underline">
            Back to {subject.name}
          </Link>
        </div>
        <p className="text-muted-foreground">{topic.description}</p>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link href={`/learn/quiz/${topic.slug}`}>Start practice test</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/teacher/login">Teachers: contribute to this topic</Link>
        </Button>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              Notes
              <span className="text-sm text-muted-foreground">{notes.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              notes.slice(0, 6).map((n) => {
                const author = getTeacherById(n.authorId);
                return (
                  <Link key={n.id} href={`/learn/notes/${n.id}`} className="block">
                    <div className="rounded-md border p-3 hover:border-primary/40 transition-colors">
                      <div className="font-medium">{n.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {author?.name ?? "Teacher"} • {new Date(n.dateCreated).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              MCQ Questions
              <span className="text-sm text-muted-foreground">{questions.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No questions yet.</p>
            ) : (
              questions.slice(0, 6).map((q) => (
                <div key={q.id} className="rounded-md border p-3">
                  <div className="text-sm">{q.questionText}</div>
                </div>
              ))
            )}
            <div className="text-sm text-muted-foreground">
              Generate a quiz to see answers and explanations.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              Essay Questions
              <span className="text-sm text-muted-foreground">{essays.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {essays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No essay questions yet.</p>
            ) : (
              essays.slice(0, 6).map((e) => (
                <div key={e.id} className="rounded-md border p-3">
                  <div className="text-sm">{e.questionText}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              Templates
              <span className="text-sm text-muted-foreground">{templates.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No templates yet.</p>
            ) : (
              templates.slice(0, 6).map((t) => (
                <div key={t.id} className="rounded-md border p-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.description}</div>
                  </div>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/api/templates/${t.id}`}>Download</Link>
                  </Button>
                </div>
              ))
            )}
            <div>
              <Link href="/templates" className="text-sm text-primary hover:underline">
                Browse all templates
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

