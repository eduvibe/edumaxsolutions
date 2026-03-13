import { redirect } from "next/navigation";

export const metadata = {
  title: "Teacher Login",
};

export default function TeacherLoginPage() {
  redirect("/learn/teacher/login");
}
