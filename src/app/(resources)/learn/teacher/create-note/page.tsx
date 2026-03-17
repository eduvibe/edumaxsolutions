import { getPlatformRole } from "@/lib/platform/session";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Create Note",
};

export default async function CreateNotePage() {
  if ((await getPlatformRole()) !== "teacher") {
    redirect("/learn/teacher/login");
  }
  redirect("/learn/teacher/topic-notes");
}
