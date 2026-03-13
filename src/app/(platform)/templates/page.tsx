import { redirect } from "next/navigation";

export const metadata = {
  title: "Presentation Templates",
};

export default function TemplatesPage() {
  redirect("/learn/templates");
}
