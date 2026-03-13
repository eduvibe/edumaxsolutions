import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listTemplates } from "@/lib/platform/store";
import Link from "next/link";

export const metadata = {
  title: "Presentation Templates",
};

export default function TemplatesPage() {
  const templates = listTemplates();

  return (
    <div className="container mx-auto px-4 md:px-6 py-10 space-y-8">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">PPT Templates</h1>
          <Link href="/learn" className="text-sm text-primary hover:underline">
            Learning Resources
          </Link>
        </div>
        <p className="text-muted-foreground">
          Download presentation templates contributed by teachers.
        </p>
      </section>

      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No templates yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle className="text-lg">{t.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">{t.description}</div>
                <div className="text-xs text-muted-foreground">
                  Category: {t.subjectCategory} • Downloads: {t.downloads}
                </div>
                <Button asChild size="sm" className="w-full">
                  <Link href={`/api/templates/${t.id}`}>Download</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

