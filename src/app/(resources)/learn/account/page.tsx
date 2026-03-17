import { StudentAuthForm } from "@/components/platform/StudentAuthForm";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import Link from "next/link";

export const metadata = {
  title: "Student Account",
};

export default function StudentAccountPage() {
  const env = getPlatformPublicEnv();

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#e7eefc] dark:bg-[#0b0f14]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_420px] lg:items-start">
          <div className="space-y-6">
            <h1 className="text-4xl font-extrabold tracking-tight text-black dark:text-white">Student account</h1>
            <p className="max-w-xl text-sm text-black/70 dark:text-white/70">
              Create an account to keep your progress and access resources quickly.
            </p>
            <div className="text-sm text-black/70 dark:text-white/70">
              Want to contribute as a tutor?{" "}
              <Link href="/learn/teacher/apply" className="font-semibold hover:underline underline-offset-4">
                Apply here
              </Link>
              .
            </div>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5 md:p-8">
            <div className="space-y-1">
              <div className="text-lg font-extrabold tracking-tight text-black dark:text-white">Sign in / Sign up</div>
              <div className="text-sm text-black/70 dark:text-white/70">Email + password. Phone number is optional.</div>
            </div>

            <div className="mt-6 grid gap-4">
              <StudentAuthForm />

              {!env.supabaseConfigured ? (
                <div className="rounded-xl border border-black/10 bg-white/10 p-4 text-sm text-black/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  Supabase is not configured yet. Auth buttons are disabled.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

