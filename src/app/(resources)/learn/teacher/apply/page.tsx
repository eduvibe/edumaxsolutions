import { TeacherApplicationClient } from "@/components/platform/TeacherApplicationClient";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import Link from "next/link";

export const metadata = {
  title: "Tutor Application",
};

export default function TeacherApplyPage() {
  const env = getPlatformPublicEnv();
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f3edf6] dark:bg-[#0b0f14]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_460px] lg:items-start">
          <div className="space-y-6">
            <h1 className="text-4xl font-extrabold tracking-tight text-black dark:text-white">Apply as a tutor</h1>
            <p className="max-w-xl text-sm text-black/70 dark:text-white/70">
              Tutors can suggest edits, review community notes, and publish resources. Applications are reviewed before approval.
            </p>
            <div className="text-sm text-black/70 dark:text-white/70">
              Already approved?{" "}
              <Link href="/learn/teacher/login" className="font-semibold hover:underline underline-offset-4">
                Sign in
              </Link>
              .
            </div>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5 md:p-8">
            <div className="space-y-1">
              <div className="text-lg font-extrabold tracking-tight text-black dark:text-white">Tutor application</div>
              <div className="text-sm text-black/70 dark:text-white/70">Create an account, then submit your details.</div>
            </div>

            <div className="mt-6 grid gap-4">
              <TeacherApplicationClient />

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

