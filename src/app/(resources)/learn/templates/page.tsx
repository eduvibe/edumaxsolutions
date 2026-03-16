import { Button } from "@/components/ui/button";
import { getPlatformRole } from "@/lib/platform/session";
import { getTeacherById, listTemplates } from "@/lib/platform/store";
import { Download, Eye, Presentation, Upload } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Templates",
};

export default async function TemplatesPage() {
  const role = await getPlatformRole();
  if (role !== "teacher") redirect("/learn/subjects?section=primary");
  const templates = await listTemplates();
  const slidesOnly = templates.filter((t) => (t.resourceType ?? "slides") === "slides");

  return (
    <div className="bg-[#f3edf6] dark:bg-[#0b0f14]">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-black dark:text-white">Templates</h1>
            <Link
              href="/learn/subjects?section=primary"
              className="text-sm font-semibold text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white"
            >
              Back to subjects
            </Link>
          </div>
          <p className="max-w-2xl text-sm text-black/70 dark:text-white/70">
            PowerPoint slide templates created and shared by tutors. Pick a deck, download, and adapt for your class.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
              <Link href="/learn/teacher/upload-template?type=slides">
                <Upload className="mr-2 h-4 w-4" />
                Upload template
              </Link>
            </Button>
          </div>
        </header>

        {slidesOnly.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
            <div className="text-sm text-black/70 dark:text-white/70">No templates yet.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {slidesOnly.map((t) => {
              const author = getTeacherById(t.uploadedBy);
              const hasPreview = Boolean(t.previewImageUrl);
              return (
                <div
                  key={t.id}
                  className="rounded-2xl border border-black/10 bg-white/10 p-5 backdrop-blur-md dark:border-white/10 dark:bg-white/5"
                >
                  <div className="overflow-hidden rounded-xl border border-black/10 bg-white/10 dark:border-white/10 dark:bg-white/5">
                    <div className="relative aspect-[16/9] w-full">
                      {hasPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.previewImageUrl ?? ""}
                          alt={`${t.title} preview`}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/5 to-black/0 dark:from-white/10 dark:to-white/0">
                          <div className="flex items-center gap-2 text-sm font-semibold text-black/60 dark:text-white/60">
                            <Presentation className="h-5 w-5" />
                            Preview
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3">
                        <div className="truncate text-sm font-semibold text-white">{t.title}</div>
                        <div className="shrink-0 rounded-full bg-white/15 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                          {t.downloads} downloads
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mt-4 truncate text-lg font-extrabold tracking-tight text-black dark:text-white">{t.title}</div>
                      <div className="mt-1 text-sm text-black/70 dark:text-white/70">By {author?.name ?? "Tutor"}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {hasPreview ? (
                      <Button
                        asChild
                        variant="secondary"
                        className="flex-1 rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                      >
                        <a href={t.previewImageUrl ?? ""} target="_blank" rel="noreferrer">
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      asChild
                      className="flex-1 rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    >
                      <Link href={`/api/templates/${t.id}`}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
