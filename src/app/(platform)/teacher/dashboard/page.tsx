import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getTeacherById, listAllEssays, listAllNotes, listAllQuestions, listTemplates } from "@/lib/platform/store";

export const metadata = {
  title: "Teacher Dashboard",
};

export default function TeacherDashboardPage() {
  const env = getPlatformPublicEnv();
  const teacher = getTeacherById("teacher_demo_1");

  const notes = listAllNotes().filter((n) => n.authorId === "teacher_demo_1");
  const questions = listAllQuestions().filter((q) => q.authorId === "teacher_demo_1");
  const essays = listAllEssays().filter((e) => e.authorId === "teacher_demo_1");
  const templates = listTemplates().filter((t) => t.uploadedBy === "teacher_demo_1");

  const totalViews = notes.reduce((acc, n) => acc + n.views, 0);
  const totalDownloads = templates.reduce((acc, t) => acc + t.downloads, 0);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {teacher ? `Signed in as ${teacher.name} (demo)` : "Demo mode"}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{notes.length}</div>
            <div className="text-sm text-muted-foreground">Total views: {totalViews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>MCQ Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{questions.length}</div>
            <div className="text-sm text-muted-foreground">Across all topics</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Essay Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{essays.length}</div>
            <div className="text-sm text-muted-foreground">Across all topics</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{templates.length}</div>
            <div className="text-sm text-muted-foreground">Total downloads: {totalDownloads}</div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2 xl:col-span-2">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <div>Platform mode: {env.platformMode}</div>
            <div>Supabase: {env.supabaseConfigured ? "configured" : "not configured"}</div>
            <div>Cloudinary: {env.cloudinaryConfigured ? "configured" : "not configured"}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

