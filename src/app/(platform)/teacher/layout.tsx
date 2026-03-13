import Link from "next/link";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto px-4 md:px-6 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        <aside className="space-y-2">
          <div className="text-lg font-semibold">Teacher</div>
          <nav className="flex flex-col gap-1 text-sm">
            <Link href="/teacher/dashboard" className="text-primary hover:underline">
              Dashboard
            </Link>
            <Link href="/teacher/create-note" className="text-primary hover:underline">
              Create note
            </Link>
            <Link href="/teacher/create-question" className="text-primary hover:underline">
              Create MCQ
            </Link>
            <Link href="/teacher/create-essay" className="text-primary hover:underline">
              Create essay question
            </Link>
            <Link href="/teacher/upload-template" className="text-primary hover:underline">
              Upload template
            </Link>
            <Link href="/learn" className="text-primary hover:underline">
              View public library
            </Link>
          </nav>
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}

