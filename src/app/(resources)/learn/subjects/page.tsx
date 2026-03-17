import { SubjectBrowser } from "@/components/platform/SubjectBrowser";
import { getCurriculumSubjectStatsBySlugAndSection, listCurriculumSubjects } from "@/lib/platform/store";

export const metadata = {
  title: "Subjects",
};

type PageProps = {
  searchParams?: Promise<{ section?: string }> | { section?: string };
};

export default async function SubjectsPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const subjects = await listCurriculumSubjects();
  const statsEntries = await Promise.all(
    subjects.map(async (s) => [
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
  return (
    <SubjectBrowser subjects={subjects} stats={stats} initialSection={initialSection} />
  );
}
