import { SubjectBrowser } from "@/components/platform/SubjectBrowser";
import { getSubjectStatsBySlugAndSection, listSubjects } from "@/lib/platform/store";

export const metadata = {
  title: "Subjects",
};

type PageProps = {
  searchParams?: Promise<{ section?: string }> | { section?: string };
};

export default async function SubjectsPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const subjects = listSubjects();
  const stats = Object.fromEntries(
    subjects.map((s) => [
      s.slug,
      {
        primary: getSubjectStatsBySlugAndSection(s.slug, "primary"),
        jss: getSubjectStatsBySlugAndSection(s.slug, "jss"),
        sss: getSubjectStatsBySlugAndSection(s.slug, "sss"),
      },
    ])
  );
  const initialSection =
    sp?.section === "primary" || sp?.section === "jss" || sp?.section === "sss"
      ? sp.section
      : undefined;
  return (
    <SubjectBrowser subjects={subjects} stats={stats} initialSection={initialSection} />
  );
}
