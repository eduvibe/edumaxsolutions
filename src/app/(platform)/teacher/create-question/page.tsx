import { redirect } from "next/navigation";

export const metadata = {
  title: "Create MCQ",
};

export default function CreateQuestionPage() {
  redirect("/learn/teacher/create-question");
}
