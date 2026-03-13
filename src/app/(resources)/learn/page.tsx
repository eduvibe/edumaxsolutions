import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  listAllTopics,
  listRecentNotes,
  listSubjects,
  listTopicsBySubjectSlug,
} from "@/lib/platform/store";
import Link from "next/link";

export const metadata = {
  title: "Resources",
};

type PageProps = {
  searchParams?: { q?: string };
};

export default function LearnPage({ searchParams }: PageProps) {
  const subjects = listSubjects();
  const q = searchParams?.q?.trim() ?? "";
  const qLower = q.toLowerCase();

  const topicCounts = Object.fromEntries(subjects.map((s) => [s.slug, listTopicsBySubjectSlug(s.slug).length]));

  const matchingSubjects = q
    ? subjects.filter((s) => s.name.toLowerCase().includes(qLower) || s.slug.toLowerCase().includes(qLower))
    : [];
  const matchingTopics = q
    ? listAllTopics().filter((t) => t.name.toLowerCase().includes(qLower) || t.slug.toLowerCase().includes(qLower))
    : [];
  const matchingNotes = q
    ? listRecentNotes(50).filter((n) => n.title.toLowerCase().includes(qLower) || n.content.toLowerCase().includes(qLower))
    : [];

  if (!q) {
    return (
      <div className="space-y-0">
        <section className="bg-[#f9f3ee] dark:bg-[#1b2a22]">
          <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
              <div className="space-y-6">
                <div className="text-sm font-semibold text-black/80 dark:text-white/80">Teachers</div>
                <h1 className="text-4xl font-extrabold tracking-tight text-black dark:text-white md:text-5xl">
                  Plan every lesson, every national curriculum subject
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-black/70 dark:text-white/70">
                  From curriculum planning to classroom teaching, EduMax gives you free, expert-designed resources to adapt and make your own.
                </p>

                <div className="flex flex-wrap gap-2 text-sm font-semibold">
                  <Link
                    href="/learn/subjects?section=primary"
                    className="rounded-md border-2 border-black bg-white px-4 py-2 text-black shadow-sm dark:border-white dark:bg-black dark:text-white"
                  >
                    Primary
                  </Link>
                  <Link
                    href="/learn/subjects?section=jss"
                    className="rounded-md border-2 border-black bg-white px-4 py-2 text-black shadow-sm dark:border-white dark:bg-black dark:text-white"
                  >
                    JSS
                  </Link>
                  <Link
                    href="/learn/subjects?section=sss"
                    className="rounded-md border-2 border-black bg-white px-4 py-2 text-black shadow-sm dark:border-white dark:bg-black dark:text-white"
                  >
                    SSS
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button asChild className="rounded-md bg-black px-5 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
                    <Link href="/learn/subjects">Browse subjects</Link>
                  </Button>
                  <Button asChild variant="secondary" className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10">
                    <Link href="/learn/templates">Download templates</Link>
                  </Button>
                  <Button asChild variant="secondary" className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10">
                    <Link href="/learn/teacher/login">Tutor sign in</Link>
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 text-sm text-black/80 dark:text-white/80">
                  <span className="rounded-md bg-white/60 px-3 py-1 dark:bg-white/10">Worksheets</span>
                  <span className="rounded-md bg-white/60 px-3 py-1 dark:bg-white/10">Slide decks</span>
                  <span className="rounded-md bg-white/60 px-3 py-1 dark:bg-white/10">Quizzes</span>
                </div>
              </div>

              <div className="relative">
                <div className="overflow-hidden rounded-2xl border-2 border-black bg-white shadow-sm dark:border-white dark:bg-black">
                  <div className="aspect-[16/10] bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-white/10 dark:to-white/5" />
                </div>

                <div className="pointer-events-none absolute -left-2 top-6 rotate-[-6deg] rounded-md border-2 border-black bg-white px-3 py-2 text-xs font-semibold text-black shadow-sm dark:border-white dark:bg-black dark:text-white">
                  Slide decks
                </div>
                <div className="pointer-events-none absolute -right-2 top-14 rotate-[6deg] rounded-md border-2 border-black bg-white px-3 py-2 text-xs font-semibold text-black shadow-sm dark:border-white dark:bg-black dark:text-white">
                  Worksheets
                </div>
                <div className="pointer-events-none absolute right-8 bottom-6 rotate-[2deg] rounded-md border-2 border-black bg-white px-3 py-2 text-xs font-semibold text-black shadow-sm dark:border-white dark:bg-black dark:text-white">
                  Online quiz
                </div>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
              <div className="space-y-4">
                <h2 className="text-2xl font-extrabold tracking-tight text-black dark:text-white">
                  We’re here to support great teaching
                </h2>
                <p className="max-w-2xl text-sm leading-relaxed text-black/70 dark:text-white/70">
                  Whether you’re creating new lessons, refreshing your approach, or solving a last-minute challenge, our resources give you a strong foundation.
                </p>
                <div className="overflow-hidden rounded-2xl border-2 border-black bg-white shadow-sm dark:border-white dark:bg-black">
                  <div className="aspect-video bg-gradient-to-br from-neutral-50 to-neutral-200 dark:from-white/10 dark:to-white/5" />
                </div>
              </div>

              <div className="rounded-2xl border-2 border-black bg-white p-6 shadow-sm dark:border-white dark:bg-black">
                <div className="text-sm font-semibold text-black dark:text-white">“This saves us time.”</div>
                <div className="mt-3 text-sm leading-relaxed text-black/70 dark:text-white/70">
                  A clear subject → topic structure makes it easier for teachers to plan, adapt and deliver lessons quickly.
                </div>
                <div className="mt-5 text-xs font-semibold text-black/70 dark:text-white/70">
                  Head of Department
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {q ? (
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">Search results</h2>
            <p className="text-sm text-black/70 dark:text-white/70">
              Results for <span className="font-semibold">{q}</span>
            </p>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div className="text-sm font-semibold">Subjects</div>
                <div className="text-xs text-black/60 dark:text-white/60">{matchingSubjects.length}</div>
              </div>
              {matchingSubjects.length === 0 ? (
                <div className="rounded-2xl border border-black/10 bg-transparent p-6 text-sm text-black/70 dark:border-white/10 dark:text-white/70">
                  No subjects found.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {matchingSubjects.map((s) => (
                    <Link
                      key={s.id}
                      href={`/learn/subjects/${s.slug}`}
                      className="rounded-2xl border border-blue-500/35 bg-transparent px-4 py-3 transition-colors hover:bg-blue-500/5 hover:border-blue-500/55 dark:border-blue-400/30 dark:hover:bg-blue-400/10 dark:hover:border-blue-400/55"
                    >
                      <div className="text-sm font-semibold tracking-tight">{s.name}</div>
                      <div className="text-xs text-black/60 dark:text-white/60">{topicCounts[s.slug] ?? 0} topics</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <div className="text-sm font-semibold">Topics</div>
                  <div className="text-xs text-black/60 dark:text-white/60">{matchingTopics.length}</div>
                </div>
                <div className="rounded-2xl border border-black/10 bg-transparent dark:border-white/10">
                  <Table className="bg-transparent">
                    <TableHeader className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Topic</TableHead>
                        <TableHead className="text-right">Open</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
                      {matchingTopics.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={2} className="text-sm text-black/70 dark:text-white/70">
                            No topics found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        matchingTopics.slice(0, 10).map((t) => (
                          <TableRow key={t.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                            <TableCell className="font-medium">{t.name}</TableCell>
                            <TableCell className="text-right">
                              <Button asChild size="sm" variant="ghost" className="rounded-full">
                                <Link href={`/learn/topics/${t.slug}`}>View</Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <div className="text-sm font-semibold">Notes</div>
                  <div className="text-xs text-black/60 dark:text-white/60">{matchingNotes.length}</div>
                </div>
                <div className="rounded-2xl border border-black/10 bg-transparent dark:border-white/10">
                  <Table className="bg-transparent">
                    <TableHeader className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Title</TableHead>
                        <TableHead className="text-right">Open</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
                      {matchingNotes.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={2} className="text-sm text-black/70 dark:text-white/70">
                            No notes found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        matchingNotes.slice(0, 10).map((n) => (
                          <TableRow key={n.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                            <TableCell className="font-medium">{n.title}</TableCell>
                            <TableCell className="text-right">
                              <Button asChild size="sm" variant="ghost" className="rounded-full">
                                <Link href={`/learn/notes/${n.id}`}>Read</Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
