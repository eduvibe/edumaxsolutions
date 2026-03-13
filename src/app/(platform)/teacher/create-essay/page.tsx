import { TeacherEssayForm } from "@/components/platform/TeacherEssayForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAllTopics, listSubjects } from "@/lib/platform/store";

export const metadata = {
  title: "Create Essay Question",
};

export default function CreateEssayPage() {
  const subjects = listSubjects();
  const topics = listAllTopics();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Create Essay Question</h1>
        <p className="text-sm text-muted-foreground">
          Students can view these and practice writing structured answers.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Essay question details</CardTitle>
        </CardHeader>
        <CardContent>
          <TeacherEssayForm subjects={subjects} topics={topics} />
        </CardContent>
      </Card>
    </div>
  );
}

