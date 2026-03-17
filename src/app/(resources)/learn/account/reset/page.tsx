import { StudentPasswordResetForm } from "@/components/platform/StudentPasswordResetForm";

export const metadata = {
  title: "Set New Password",
};

export default async function StudentResetPage({ searchParams }: { searchParams?: Promise<{ token?: string }> | { token?: string } }) {
  const sp = searchParams ? await searchParams : undefined;
  const token = sp?.token ?? "";

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#e7eefc] dark:bg-[#0b0f14]">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5 md:p-8">
          <div className="space-y-1">
            <div className="text-lg font-extrabold tracking-tight text-black dark:text-white">Set a new password</div>
            <div className="text-sm text-black/70 dark:text-white/70">Choose a strong password (letters + numbers).</div>
          </div>
          <div className="mt-6">
            <StudentPasswordResetForm token={token} />
          </div>
        </div>
      </div>
    </div>
  );
}

