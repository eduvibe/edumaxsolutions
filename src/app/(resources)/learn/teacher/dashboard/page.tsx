import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getPlatformRole } from "@/lib/platform/session";
import { redirect } from "next/navigation";
import { TutorDashboardClient } from "@/components/platform/TutorDashboardClient";

export const metadata = {
  title: "Tutor Dashboard",
};

export default async function TutorDashboardPage() {
  if ((await getPlatformRole()) !== "teacher") {
    redirect("/learn/teacher/login");
  }

  const env = getPlatformPublicEnv();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <TutorDashboardClient />

      <div className="rounded-3xl border border-black/10 bg-transparent p-5 text-sm text-black/70 dark:border-white/10 dark:text-white/70">
        Supabase: {env.supabaseConfigured ? "configured" : "not configured"} • Cloudinary:{" "}
        {env.cloudinaryConfigured ? "configured" : "not configured"}
      </div>
    </div>
  );
}
