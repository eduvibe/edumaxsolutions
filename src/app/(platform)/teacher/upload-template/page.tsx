import { redirect } from "next/navigation";

export const metadata = {
  title: "Upload Template",
};

export default function UploadTemplatePage() {
  redirect("/learn/teacher/upload-template");
}
