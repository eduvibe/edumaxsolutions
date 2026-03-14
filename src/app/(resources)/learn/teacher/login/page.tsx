import { TutorSignInButton } from "@/components/platform/TutorSignInButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { Lock, School, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Tutor Login",
};

export default function TutorLoginPage() {
  const env = getPlatformPublicEnv();

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f3edf6] dark:bg-[#0b0f14]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_420px] lg:items-start">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/10 px-4 py-2 text-sm font-semibold text-black/80 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white/80">
              <ShieldCheck className="h-4 w-4" />
              Tutor access
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-black dark:text-white">Sign in to contribute</h1>
            <p className="max-w-xl text-sm text-black/70 dark:text-white/70">
              Students can browse for free. Tutors sign in to create lessons, upload resources, and add quizzes.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-black/10 bg-white/10 p-5 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-2 text-sm font-semibold text-black dark:text-white">
                  <School className="h-4 w-4" />
                  Structured curriculum
                </div>
                <div className="mt-2 text-sm text-black/70 dark:text-white/70">Units, lessons, notes, worksheets and tests.</div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white/10 p-5 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-2 text-sm font-semibold text-black dark:text-white">
                  <Lock className="h-4 w-4" />
                  Role-based tools
                </div>
                <div className="mt-2 text-sm text-black/70 dark:text-white/70">Tutor dashboard and upload flows.</div>
              </div>
            </div>

            <div className="text-sm text-black/70 dark:text-white/70">
              <Link href="/learn" className="font-semibold hover:underline underline-offset-4">
                Continue as student
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5 md:p-8">
            <div className="space-y-1">
              <div className="text-lg font-extrabold tracking-tight text-black dark:text-white">Tutor login</div>
              <div className="text-sm text-black/70 dark:text-white/70">Use your tutor account to sign in.</div>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="grid gap-2">
                <div className="text-sm font-medium text-black/80 dark:text-white/80">Email</div>
                <Input className="bg-white/40 dark:bg-white/5" placeholder="tutor@example.com" type="email" disabled={!env.supabaseConfigured} />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium text-black/80 dark:text-white/80">Password</div>
                <Input className="bg-white/40 dark:bg-white/5" placeholder="••••••••" type="password" disabled={!env.supabaseConfigured} />
              </div>

              <div className="flex flex-col gap-2">
                <TutorSignInButton className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90" />
                <Button
                  disabled={!env.supabaseConfigured}
                  variant="secondary"
                  className="rounded-md border-2 border-black bg-transparent text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                >
                  Continue with Google
                </Button>
              </div>

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
