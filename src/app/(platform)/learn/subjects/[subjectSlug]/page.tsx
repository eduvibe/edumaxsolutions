import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSubjectBySlug, listTopicsBySubjectSlug } from "@/lib/platform/store";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: { subjectSlug: string };
};

export default function SubjectPage({ params }: PageProps) {
  const { subjectSlug } = params;
  const subject = getSubjectBySlug(subjectSlug);
  if (!subject) notFound();

  const topics = listTopicsBySubjectSlug(subjectSlug);

  return (
    <div className="container mx-auto px-4 md:px-6 py-10 space-y-8">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{subject.name}</h1>
          <Link href="/learn" className="text-sm text-primary hover:underline">
            All subjects
          </Link>
        </div>
        <p className="text-muted-foreground">
          Pick a topic to read notes and practice questions.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Topics</h2>
        {topics.length === 0 ? (
          <p className="text-sm text-muted-foreground">No topics yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((t) => (
              <Link key={t.id} href={`/learn/topics/${t.slug}`} className="block">
                <Card className="hover:border-primary/40 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg">{t.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {t.description ?? "Resources: notes, quizzes, essays and templates."}
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
