import { redirect } from "next/navigation";

export const metadata = {
  title: "Create Note",
};

export default function CreateNotePage() {
  redirect("/learn/teacher/create-note");
}
