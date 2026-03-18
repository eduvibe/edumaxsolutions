import { SubjectBrowser } from "@/components/platform/SubjectBrowser";
import { getCurriculumSubjectStatsBySlugAndSection, listCurriculumSubjects, listCurriculumTopics } from "@/lib/platform/store";

export const metadata = {
  title: "Subjects",
};

type PageProps = {
  searchParams?: Promise<{ section?: string; year?: string }> | { section?: string; year?: string };
};

export default async function SubjectsPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const allSubjects = await listCurriculumSubjects();
  const statsEntries = await Promise.all(
    allSubjects.map(async (s) => [
      s.slug,
      {
        primary: await getCurriculumSubjectStatsBySlugAndSection(s.slug, "primary"),
        jss: await getCurriculumSubjectStatsBySlugAndSection(s.slug, "jss"),
        sss: await getCurriculumSubjectStatsBySlugAndSection(s.slug, "sss"),
      },
    ])
  );
  const stats = Object.fromEntries(statsEntries);
  const initialSection =
    sp?.section === "primary" || sp?.section === "jss" || sp?.section === "sss"
      ? sp.section
      : undefined;

  const section = initialSection ?? "primary";
  const yearGroups =
    section === "primary"
      ? ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"]
      : section === "jss"
        ? ["Year 7", "Year 8", "Year 9"]
        : ["Year 10", "Year 11", "Year 12"];

  const initialYearGroup = yearGroups.includes(sp?.year ?? "") ? (sp?.year ?? undefined) : undefined;

  let subjects = allSubjects;
  if (initialYearGroup) {
    const topics = await listCurriculumTopics();
    const allowedSubjectIds = new Set(
      topics
        .filter((t) => (t.schoolSection ?? null) === section && (t.yearGroup ?? null) === initialYearGroup)
        .map((t) => t.subjectId)
    );
    subjects = allSubjects.filter((s) => allowedSubjectIds.has(s.id));
  }
  return (
    <SubjectBrowser
      subjects={subjects}
      stats={stats}
      initialSection={initialSection}
      yearGroups={yearGroups}
      initialYearGroup={initialYearGroup}
    />
  );
}
