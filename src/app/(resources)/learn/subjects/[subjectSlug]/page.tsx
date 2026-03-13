import { CreateTopicDialog } from "@/components/platform/CreateTopicDialog";
import { Button } from "@/components/ui/button";
import { getPlatformRole } from "@/lib/platform/session";
import {
  getSubjectBySlug,
  getTopicLessonCount,
  listTopicsBySubjectAndSection,
  listTopicsBySubjectSlug,
} from "@/lib/platform/store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: { subjectSlug: string };
  searchParams?: { year?: string; thread?: string; section?: string };
};

export default async function SubjectPage({ params, searchParams }: PageProps) {
  const subject = getSubjectBySlug(params.subjectSlug);
  if (!subject) notFound();
  const role = await getPlatformRole();
  const section =
    searchParams?.section === "primary" || searchParams?.section === "jss" || searchParams?.section === "sss"
      ? searchParams.section
      : undefined;
  const allTopics = section
    ? listTopicsBySubjectAndSection(subject.slug, section)
    : listTopicsBySubjectSlug(subject.slug);

  const years = Array.from(new Set(allTopics.map((t) => t.yearGroup).filter(Boolean))) as string[];
  const threads = Array.from(new Set(allTopics.map((t) => t.thread).filter(Boolean))) as string[];
  const yearFilter = searchParams?.year ?? "All";
  const threadFilter = searchParams?.thread ?? "All";

  const topics = allTopics.filter((t) => {
    const yearOk = yearFilter === "All" ? true : t.yearGroup === yearFilter;
    const threadOk = threadFilter === "All" ? true : t.thread === threadFilter;
    return yearOk && threadOk;
  });

  return (
    <div className="bg-[#cbd7ff] dark:bg-[#1f2a44]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-black bg-[#cbd7ff] text-black dark:border-white dark:bg-[#1f2a44] dark:text-white">
              <div className="text-2xl font-extrabold">{subject.name.slice(0, 1)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-black/70 dark:text-white/70">
                {section ? section.toUpperCase() : "ALL"}
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-black dark:text-white">{subject.name}</h1>
              <div className="text-sm text-black/70 dark:text-white/70">
                Carefully sequenced topics to build knowledge progressively.
              </div>
            </div>
          </div>

          {role === "teacher" ? (
            <div className="flex flex-wrap gap-2">
              <CreateTopicDialog subjectSlug={subject.slug} defaultSchoolSection={section ?? "jss"} />
              <Button asChild variant="secondary" className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10">
                <Link href="/learn/teacher/create-note">Add note</Link>
              </Button>
              <Button asChild variant="secondary" className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10">
                <Link href="/learn/teacher/create-question">Add quiz</Link>
              </Button>
              <Button asChild variant="secondary" className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10">
                <Link href="/learn/teacher/upload-template?type=slides">Add slides</Link>
              </Button>
              <Button asChild variant="secondary" className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10">
                <Link href="/learn/teacher/upload-template?type=worksheet">Add worksheet</Link>
              </Button>
              <Button asChild variant="secondary" className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10">
                <Link href="/learn/teacher/upload-template?type=scheme">Add scheme</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="bg-white dark:bg-transparent">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-black/10 bg-transparent p-6 dark:border-white/10">
                <div className="text-xl font-extrabold tracking-tight">New fully-sequenced curriculum plan and lesson resources for {subject.name.toLowerCase()}.</div>
                <div className="mt-2 text-sm text-black/70 dark:text-white/70">
                  Download the curriculum plan to explore the thinking behind our curriculum design.
                </div>
                <div className="mt-4">
                  <Button className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
                    Download curriculum plan
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-2xl font-extrabold tracking-tight">Topics ({topics.length})</div>
                <div className="rounded-2xl border border-black/10 bg-transparent dark:border-white/10">
                  <div className="border-b border-black/10 bg-[#cbd7ff] px-5 py-4 dark:border-white/10 dark:bg-[#1f2a44]">
                    <div className="text-lg font-extrabold tracking-tight text-black dark:text-white">
                      {subject.name} topics
                    </div>
                    <div className="mt-1 text-sm text-black/70 dark:text-white/70">
                      Brand-new teaching resources, thoughtfully crafted by teachers for classroom needs.
                    </div>
                  </div>

                  <div className="divide-y divide-black/10 dark:divide-white/10">
                    {topics.length === 0 ? (
                      <div className="p-6 text-sm text-black/70 dark:text-white/70">No topics yet.</div>
                    ) : (
                      topics.map((t, idx) => {
                        const lessons = getTopicLessonCount(t.slug);
                        return (
                          <div key={t.id} className="flex items-center gap-4 p-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#cbd7ff] text-sm font-extrabold text-black dark:bg-[#1f2a44] dark:text-white">
                              {idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold tracking-tight text-black dark:text-white">{t.name}</div>
                              <div className="mt-1 text-sm text-black/70 dark:text-white/70">
                                {(t.yearGroup ?? "Year group")} • {lessons} lessons
                              </div>
                            </div>
                            <Button asChild variant="secondary" className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10">
                              <Link href={`/learn/topics/${t.slug}`}>View</Link>
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="space-y-3">
                <div className="text-sm font-semibold tracking-tight">Filters</div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">Year</div>
                  <div className="flex flex-wrap gap-2">
                    {["All", ...years].map((y) => (
                      <Link
                        key={y}
                        href={`/learn/subjects/${subject.slug}?${section ? `section=${encodeURIComponent(section)}&` : ""}year=${encodeURIComponent(y)}&thread=${encodeURIComponent(threadFilter)}`}
                        className={cn(
                          "rounded-md border-2 px-3 py-2 text-sm font-semibold",
                          y === yearFilter
                            ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                            : "border-black bg-white text-black hover:bg-black/5 dark:border-white dark:bg-black dark:text-white dark:hover:bg-white/10"
                        )}
                      >
                        {y}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">Threads</div>
                  <div className="space-y-2">
                    {["All", ...threads].map((th) => (
                      <Link
                        key={th}
                        href={`/learn/subjects/${subject.slug}?${section ? `section=${encodeURIComponent(section)}&` : ""}year=${encodeURIComponent(yearFilter)}&thread=${encodeURIComponent(th)}`}
                        className={cn(
                          "flex items-center justify-between rounded-md border-2 px-4 py-3 text-sm",
                          th === threadFilter
                            ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                            : "border-black bg-white text-black hover:bg-black/5 dark:border-white dark:bg-black dark:text-white dark:hover:bg-white/10"
                        )}
                      >
                        <span className="font-semibold">{th}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {role === "teacher" ? (
                <div className="rounded-2xl border border-black/10 bg-transparent p-5 dark:border-white/10">
                  <div className="text-sm font-semibold tracking-tight">Teacher tools</div>
                  <div className="mt-2 text-sm text-black/70 dark:text-white/70">
                    Teachers can create topics and add slides, worksheets, quizzes and schemes.
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button asChild variant="secondary" className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10">
                      <Link href="/learn/teacher/create-note">Create note</Link>
                    </Button>
                    <Button asChild variant="secondary" className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10">
                      <Link href="/learn/teacher/create-question">Create quiz</Link>
                    </Button>
                    <Button asChild variant="secondary" className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10">
                      <Link href="/learn/teacher/upload-template">Upload slides</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-black/10 bg-transparent p-5 dark:border-white/10">
                  <div className="text-sm font-semibold tracking-tight">Student access</div>
                  <div className="mt-2 text-sm text-black/70 dark:text-white/70">
                    Students can access notes, quizzes and worksheets.
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
