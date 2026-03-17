import { getPlatformRole } from "@/lib/platform/session";
import { redirect } from "next/navigation";
import { NoteSuggestionReviewClient } from "@/components/platform/NoteSuggestionReviewClient";
import Link from "next/link";

export const metadata = {
  title: "Review Suggestion",
};

export default async function NoteSuggestionReviewPage({ params }: { params: Promise<{ id: string }> }) {
  if ((await getPlatformRole()) !== "teacher") {
    redirect("/learn/teacher/login");
  }
  const { id } = await params;

  return (
    <div className="bg-[#f3edf6] dark:bg-[#0b0f14]">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-black/80 dark:text-white/80">
            <Link href="/learn/teacher/dashboard" className="hover:underline underline-offset-4">
              Dashboard
            </Link>
            <span className="text-black/40 dark:text-white/40">•</span>
            <Link href="/learn/teacher/note-suggestions" className="hover:underline underline-offset-4">
              Note suggestions
            </Link>
            <span className="text-black/40 dark:text-white/40">•</span>
            <span>Review</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-black dark:text-white">Review suggestion</h1>
        </header>

        <NoteSuggestionReviewClient suggestionId={id} />
      </div>
    </div>
  );
}

