import { TeacherMcqForm } from "@/components/platform/TeacherMcqForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAllTopics, listSubjects } from "@/lib/platform/store";

export const metadata = {
  title: "Create MCQ",
};

export default function CreateQuestionPage() {
  const subjects = listSubjects();
  const topics = listAllTopics();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Create Multiple Choice Question</h1>
        <p className="text-sm text-muted-foreground">
          Create exam-style questions for students to practice by topic.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Question details</CardTitle>
        </CardHeader>
        <CardContent>
          <TeacherMcqForm subjects={subjects} topics={topics} />
        </CardContent>
      </Card>
    </div>
  );
}

