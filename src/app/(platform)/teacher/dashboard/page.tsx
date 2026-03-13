import { redirect } from "next/navigation";

export const metadata = {
  title: "Teacher Dashboard",
};

export default function TeacherDashboardPage() {
  redirect("/learn/teacher/dashboard");
}
