import { TeacherNoteForm } from "@/components/platform/TeacherNoteForm";
import { listAllTopics, listSubjects } from "@/lib/platform/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Create Note",
};

export default function CreateNotePage() {
  const subjects = listSubjects();
  const topics = listAllTopics();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Create Note</h1>
        <p className="text-sm text-muted-foreground">
          Notes become publicly accessible after publishing.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Note details</CardTitle>
        </CardHeader>
        <CardContent>
          <TeacherNoteForm subjects={subjects} topics={topics} />
        </CardContent>
      </Card>
    </div>
  );
}
