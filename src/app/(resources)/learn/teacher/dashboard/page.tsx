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

  return (
    <div className="bg-[#f3edf6] dark:bg-[#0b0f14]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <TutorDashboardClient />
      </div>
    </div>
  );
}
