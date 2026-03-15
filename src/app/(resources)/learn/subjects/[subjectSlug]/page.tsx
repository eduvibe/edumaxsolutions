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
import { ArrowRight, Bookmark, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ subjectSlug: string }> | { subjectSlug: string };
  searchParams?: Promise<{ year?: string; thread?: string; section?: string }> | { year?: string; thread?: string; section?: string };
};

export default async function SubjectPage({ params, searchParams }: PageProps) {
  const p = await params;
  const sp = searchParams ? await searchParams : undefined;
  const role = await getPlatformRole();
  const section =
    sp?.section === "primary" || sp?.section === "jss" || sp?.section === "sss"
      ? sp.section
      : undefined;
  const subject = getSubjectBySlug(p.subjectSlug);
  if (!subject) {
    redirect(`/learn/subjects${section ? `?section=${section}` : ""}`);
  }
  const allTopics = section
    ? listTopicsBySubjectAndSection(subject.slug, section)
    : listTopicsBySubjectSlug(subject.slug);

  const years = Array.from(new Set(allTopics.map((t) => t.yearGroup).filter(Boolean))) as string[];
  const threads = Array.from(new Set(allTopics.map((t) => t.thread).filter(Boolean))) as string[];
  const yearFilter = sp?.year ?? "All";
  const threadFilter = sp?.thread ?? "All";

  const topics = allTopics.filter((t) => {
    const yearOk = yearFilter === "All" ? true : t.yearGroup === yearFilter;
    const threadOk = threadFilter === "All" ? true : t.thread === threadFilter;
    return yearOk && threadOk;
  });

  const sectionLabel = section === "primary" ? "Primary" : section === "jss" ? "Junior Secondary" : section === "sss" ? "Senior Secondary" : "All sections";

  if (role === "student") {
    return (
      <div className="bg-[#e7eefc] dark:bg-[#0b0f14]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex items-center gap-3 text-sm font-semibold text-black/80 dark:text-white/80">
            <Link
              href={`/learn/subjects${section ? `?section=${encodeURIComponent(section)}` : ""}`}
              className="inline-flex items-center gap-2 hover:underline underline-offset-4"
            >
              <ChevronLeft className="h-4 w-4" />
              Change subject
            </Link>
          </div>

          <div className="mt-8 flex items-start gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#b7c6ff] text-black">
              <div className="text-2xl font-extrabold">{subject.name.slice(0, 1)}</div>
            </div>
            <div className="min-w-0">
              <h1 className="text-5xl font-extrabold tracking-tight text-black dark:text-white">{subject.name}</h1>
              <div className="mt-1 text-sm text-black/70 dark:text-white/70">{sectionLabel}</div>
            </div>
          </div>

          <div className="mt-10">
            <div className="flex items-center gap-3 text-lg font-extrabold tracking-tight text-black dark:text-white">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-yellow-300 text-black">
                i
              </span>
              Choose a topic ({topics.length})
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white/10 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              <div className="divide-y divide-black/10 dark:divide-white/10">
                {topics.map((t, idx) => {
                  const lessons = getTopicLessonCount(t.slug);
                  return (
                    <Link
                      key={t.id}
                      href={`/learn/topics/${t.slug}`}
                      className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-white/10 dark:hover:bg-white/10"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/40 text-sm font-extrabold text-black dark:bg-white/10 dark:text-white">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-extrabold tracking-tight text-black dark:text-white">
                          {t.name}
                        </div>
                      </div>
                      <div className="hidden text-sm font-semibold text-black/70 dark:text-white/70 md:block">
                        {lessons} subtopics
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/10 text-black dark:border-white/10 dark:text-white">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#cbd7ff] dark:bg-[#1f2a44]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-black bg-[#cbd7ff] text-black dark:border-white dark:bg-[#1f2a44] dark:text-white">
            <div className="text-2xl font-extrabold">{subject.name.slice(0, 1)}</div>
          </div>
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-semibold text-black/70 dark:text-white/70">{sectionLabel}</div>
            <h1 className="text-4xl font-extrabold tracking-tight text-black dark:text-white">{subject.name}</h1>
            <div className="text-sm text-black/70 dark:text-white/70">
              Take a look at the carefully sequenced units which build knowledge progressively through the curriculum.
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-transparent">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
            <div className="space-y-10">
              <div className="rounded-2xl border border-black/10 bg-white/15 p-8 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_180px] lg:items-center">
                  <div className="space-y-3">
                    <div className="text-2xl font-extrabold tracking-tight">
                      New fully-sequenced curriculum plan and lesson resources for {subject.name.toLowerCase()}.
                    </div>
                    <div className="text-sm text-black/70 dark:text-white/70">
                      Download the curriculum plan now to explore the thinking behind our curriculum design.
                    </div>
                    <Button className="mt-2 rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
                      Download curriculum plan
                    </Button>
                  </div>
                  <div className="hidden lg:flex items-center justify-end">
                    <div className="h-24 w-24 rounded-2xl bg-black/5 dark:bg-white/10" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-2xl font-extrabold tracking-tight">Units ({topics.length})</div>

                <div className="rounded-2xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-start justify-between gap-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-extrabold tracking-tight">{subject.name} units</div>
                        {subject.isNew ? (
                          <span className="rounded-md bg-black px-2 py-1 text-xs font-semibold text-white dark:bg-white dark:text-black">
                            New
                          </span>
                        ) : null}
                      </div>
                      <div className="text-sm text-black/70 dark:text-white/70">
                        Brand-new teaching resources, thoughtfully crafted by teachers for classroom needs.
                      </div>
                    </div>

                    <Link
                      href={`/learn/subjects/${subject.slug}${section ? `?section=${section}` : ""}`}
                      className="hidden items-center gap-2 text-sm font-semibold text-black/80 hover:underline underline-offset-4 dark:text-white/80 lg:flex"
                    >
                      Full {section === "primary" ? "primary" : section === "jss" ? "junior" : section === "sss" ? "senior" : ""} curriculum
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </Link>
                  </div>

                  <div className="mt-6 space-y-3">
                    {topics.length === 0 ? (
                      <div className="rounded-xl border border-black/10 bg-white/10 p-5 text-sm text-black/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                        No units yet.
                      </div>
                    ) : (
                      topics.map((t, idx) => {
                        const lessons = getTopicLessonCount(t.slug);
                        return (
                          <div
                            key={t.id}
                            className="flex items-center gap-4 rounded-xl border border-black/10 bg-white/10 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-white/5"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#b7c6ff] text-sm font-extrabold text-black dark:bg-[#1f2a44] dark:text-white">
                              {idx + 1}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold tracking-tight text-black dark:text-white">{t.name}</div>
                            </div>

                            <div className="hidden items-center gap-6 text-sm text-black/70 dark:text-white/70 md:flex">
                              <div className="min-w-[72px] text-right">{t.yearGroup ?? "Year"}</div>
                              <div className="min-w-[84px] text-right">{lessons} lessons</div>
                              <button
                                type="button"
                                className="flex h-9 w-9 items-center justify-center rounded-md border border-black/20 text-black/70 hover:bg-black/5 hover:text-black dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                                aria-label="Save"
                              >
                                <Bookmark className="h-4 w-4" />
                              </button>
                            </div>

                            <Button
                              asChild
                              variant="secondary"
                              className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                            >
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

            <aside className="space-y-10">
              <div className="space-y-4">
                <div className="text-sm font-semibold tracking-tight">Filters</div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">Year</div>
                  <div className="flex flex-wrap gap-2">
                    {["All", ...years].map((y) => (
                      <Link
                        key={y}
                        href={`/learn/subjects/${subject.slug}?${section ? `section=${encodeURIComponent(section)}&` : ""}year=${encodeURIComponent(y)}&thread=${encodeURIComponent(threadFilter)}`}
                        className={cn(
                          "rounded-md border-2 px-4 py-2 text-sm font-semibold",
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

                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">Threads</div>
                  <div className="space-y-2">
                    {["All", ...threads].map((th) => {
                      const active = th === threadFilter;
                      return (
                        <Link
                          key={th}
                          href={`/learn/subjects/${subject.slug}?${section ? `section=${encodeURIComponent(section)}&` : ""}year=${encodeURIComponent(yearFilter)}&thread=${encodeURIComponent(th)}`}
                          className={cn(
                            "flex items-center gap-3 rounded-md border-2 px-4 py-3 text-sm",
                            active
                              ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                              : "border-black bg-white text-black hover:bg-black/5 dark:border-white dark:bg-black dark:text-white dark:hover:bg-white/10"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded-full border",
                              active ? "border-white dark:border-black" : "border-black/40 dark:border-white/40"
                            )}
                          >
                            {active ? <span className={cn("h-2 w-2 rounded-full", active ? "bg-white dark:bg-black" : "")} /> : null}
                          </span>
                          <span className="font-semibold">{th}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              {role === "teacher" ? (
                <div className="rounded-2xl border border-black/10 bg-transparent p-5 dark:border-white/10">
                  <div className="text-sm font-semibold tracking-tight">Teacher tools</div>
                  <div className="mt-2 text-sm text-black/70 dark:text-white/70">
                    Create units and add lesson slides, worksheets, quizzes and schemes.
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <CreateTopicDialog subjectSlug={subject.slug} defaultSchoolSection={section ?? "jss"} />
                    <Button
                      asChild
                      variant="secondary"
                      className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                    >
                      <Link href="/learn/teacher/upload-template?type=slides">Upload slides</Link>
                    </Button>
                    <Button
                      asChild
                      variant="secondary"
                      className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                    >
                      <Link href="/learn/teacher/upload-template?type=worksheet">Upload worksheet</Link>
                    </Button>
                    <Button
                      asChild
                      variant="secondary"
                      className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                    >
                      <Link href="/learn/teacher/create-question">Create quiz</Link>
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
