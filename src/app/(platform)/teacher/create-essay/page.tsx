import { redirect } from "next/navigation";

export const metadata = {
  title: "Create Essay Question",
};

export default function CreateEssayPage() {
  redirect("/learn/teacher/create-essay");
}
