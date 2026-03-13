import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPlatformRole } from "@/lib/platform/session";
import { getTeacherById, getTopicResources } from "@/lib/platform/store";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: { topicSlug: string };
};

export default async function TopicPage({ params }: PageProps) {
  const role = await getPlatformRole();
  const resources = getTopicResources(params.topicSlug);
  if (!resources) notFound();

  const { subject, topic, notes, questions, essays, templates } = resources;
  const worksheets = templates.filter((t) => (t.resourceType ?? "slides") === "worksheet");
  const slides = templates.filter((t) => (t.resourceType ?? "slides") === "slides");
  const schemes = templates.filter((t) => (t.resourceType ?? "slides") === "scheme");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{topic.name}</h1>
          <Link
            href={`/learn/subjects/${subject.slug}`}
            className="text-sm text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white"
          >
            {subject.name}
          </Link>
        </div>
        <p className="text-sm text-black/70 dark:text-white/70">{topic.description}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild className="rounded-full">
            <Link href={`/learn/quiz/${topic.slug}`}>Start practice test</Link>
          </Button>
          <div className="flex items-center text-sm text-black/60 dark:text-white/60">
            Switch to Tutor mode in the top bar to contribute.
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">Notes</h2>
          <div className="text-sm text-black/70 dark:text-white/70">{notes.length}</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-transparent dark:border-white/10">
          <Table className="bg-transparent">
            <TableHeader className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
              <TableRow className="hover:bg-transparent">
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Author</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
              {notes.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="text-sm text-black/70 dark:text-white/70">
                    No notes yet.
                  </TableCell>
                </TableRow>
              ) : (
                notes.slice(0, 12).map((n) => {
                  const author = getTeacherById(n.authorId);
                  return (
                    <TableRow key={n.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                      <TableCell className="font-medium">{n.title}</TableCell>
                      <TableCell className="hidden md:table-cell text-black/70 dark:text-white/70">
                        {author?.name ?? "Tutor"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost" className="rounded-full">
                          <Link href={`/learn/notes/${n.id}`}>Read</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-[28px] border border-black/10 bg-transparent p-6 dark:border-white/10">
          <div className="text-sm font-semibold">MCQ questions</div>
          <div className="mt-2 text-3xl font-semibold">{questions.length}</div>
          <div className="mt-1 text-sm text-black/70 dark:text-white/70">Generate a quiz to review answers.</div>
          <div className="mt-4">
            <Button asChild size="sm" className="rounded-full">
              <Link href={`/learn/quiz/${topic.slug}`}>Generate quiz</Link>
            </Button>
          </div>
        </div>

        {role === "teacher" ? (
          <div className="rounded-[28px] border border-black/10 bg-transparent p-6 dark:border-white/10">
            <div className="text-sm font-semibold">Essay prompts</div>
            <div className="mt-2 text-3xl font-semibold">{essays.length}</div>
            <div className="mt-1 text-sm text-black/70 dark:text-white/70">Practice structured writing.</div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-black/10 bg-transparent p-6 dark:border-white/10">
            <div className="text-sm font-semibold">Worksheets</div>
            <div className="mt-2 text-3xl font-semibold">{worksheets.length}</div>
            <div className="mt-1 text-sm text-black/70 dark:text-white/70">Download worksheets and practice.</div>
            <div className="mt-4">
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="rounded-full bg-black/5 text-black hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                <Link href="#worksheets">Browse</Link>
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-[28px] border border-black/10 bg-transparent p-6 dark:border-white/10">
          <div className="text-sm font-semibold">Resources</div>
          <div className="mt-2 text-3xl font-semibold">{templates.length}</div>
          <div className="mt-1 text-sm text-black/70 dark:text-white/70">
            {role === "teacher"
              ? "Slides, worksheets and schemes."
              : "Worksheets for students."}
          </div>
          <div className="mt-4">
            <Button asChild size="sm" variant="secondary" className="rounded-full bg-black/5 text-black hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
              <Link href={role === "teacher" ? "/learn/teacher/upload-template" : "#worksheets"}>Manage</Link>
            </Button>
          </div>
        </div>
      </section>

      {worksheets.length ? (
        <section id="worksheets" className="space-y-3">
          <h2 className="text-lg font-semibold">Worksheets</h2>
          <div className="rounded-2xl border border-black/10 bg-transparent dark:border-white/10">
            <Table className="bg-transparent">
              <TableHeader className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
                {worksheets.slice(0, 12).map((t) => (
                  <TableRow key={t.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost" className="rounded-full">
                        <Link href={`/api/templates/${t.id}`}>Download</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}

      {role === "teacher" && (slides.length || schemes.length) ? (
        <section className="space-y-6">
          {slides.length ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Lesson slides</h2>
              <div className="rounded-2xl border border-black/10 bg-transparent dark:border-white/10">
                <Table className="bg-transparent">
                  <TableHeader className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Title</TableHead>
                      <TableHead className="text-right">Download</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
                    {slides.slice(0, 12).map((t) => (
                      <TableRow key={t.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="ghost" className="rounded-full">
                            <Link href={`/api/templates/${t.id}`}>Download</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          {schemes.length ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Schemes</h2>
              <div className="rounded-2xl border border-black/10 bg-transparent dark:border-white/10">
                <Table className="bg-transparent">
                  <TableHeader className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Title</TableHead>
                      <TableHead className="text-right">Download</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
                    {schemes.slice(0, 12).map((t) => (
                      <TableRow key={t.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="ghost" className="rounded-full">
                            <Link href={`/api/templates/${t.id}`}>Download</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
