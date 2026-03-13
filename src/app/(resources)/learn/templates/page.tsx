import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPlatformRole } from "@/lib/platform/session";
import { listTemplates } from "@/lib/platform/store";
import Link from "next/link";

export const metadata = {
  title: "Templates",
};

export default async function TemplatesPage() {
  const role = await getPlatformRole();
  const templates = listTemplates().filter((t) => {
    const type = t.resourceType ?? "slides";
    if (role === "teacher") return true;
    return type === "worksheet";
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Templates</h1>
          <Link href="/learn" className="text-sm text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
            Back to resources
          </Link>
        </div>
        <p className="text-sm text-black/70 dark:text-white/70">
          {role === "teacher" ? "Download slides, worksheets and schemes." : "Download worksheets."}
        </p>
      </header>

      <div className="rounded-2xl border border-black/10 bg-transparent dark:border-white/10">
        <Table className="bg-transparent">
          <TableHeader className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
            <TableRow className="hover:bg-transparent">
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="hidden md:table-cell">Downloads</TableHead>
              <TableHead className="text-right">Download</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr]:border-black/10 dark:[&_tr]:border-white/10">
            {templates.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="text-sm text-black/70 dark:text-white/70">
                  No templates yet.
                </TableCell>
              </TableRow>
            ) : (
              templates.map((t) => (
                <TableRow key={t.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell className="hidden md:table-cell text-black/70 dark:text-white/70">
                      {(t.resourceType ?? "slides").replace(/^\w/, (c) => c.toUpperCase())}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-black/70 dark:text-white/70">
                    {t.downloads}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost" className="rounded-full">
                      <Link href={`/api/templates/${t.id}`}>Download</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
