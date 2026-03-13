import { SubjectBrowser } from "@/components/platform/SubjectBrowser";
import { getSubjectStatsBySlugAndSection, listSubjects } from "@/lib/platform/store";

export const metadata = {
  title: "Subjects",
};

type PageProps = {
  searchParams?: { section?: string };
};

export default function SubjectsPage({ searchParams }: PageProps) {
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
    searchParams?.section === "primary" || searchParams?.section === "jss" || searchParams?.section === "sss"
      ? searchParams.section
      : undefined;
  return (
    <SubjectBrowser subjects={subjects} stats={stats} initialSection={initialSection} />
  );
}
