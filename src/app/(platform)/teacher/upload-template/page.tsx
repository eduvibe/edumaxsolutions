import { TeacherTemplateForm } from "@/components/platform/TeacherTemplateForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listSubjects } from "@/lib/platform/store";

export const metadata = {
  title: "Upload Template",
};

export default function UploadTemplatePage() {
  const subjects = listSubjects();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Upload Presentation Template</h1>
        <p className="text-sm text-muted-foreground">
          Upload a PPT template for other teachers and students to download.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Template details</CardTitle>
        </CardHeader>
        <CardContent>
          <TeacherTemplateForm subjects={subjects} />
        </CardContent>
      </Card>
    </div>
  );
}

