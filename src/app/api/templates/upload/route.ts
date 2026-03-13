import { NextResponse } from "next/server";
import { templateUploadSchema } from "@/lib/schemas";
import { createTemplate } from "@/lib/platform/store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = templateUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const fileUrl = parsed.data.fileUrl?.trim();
    if (!fileUrl) {
      return NextResponse.json(
        { error: "fileUrl is required (use a hosted URL until storage is configured)" },
        { status: 400 }
      );
    }

    const template = createTemplate({
      title: parsed.data.title,
      description: parsed.data.description,
      subjectSlug: parsed.data.subjectSlug,
      topicSlug: parsed.data.topicSlug ? parsed.data.topicSlug : null,
      resourceType: parsed.data.resourceType,
      fileUrl,
      previewImageUrl: parsed.data.previewImageUrl ? parsed.data.previewImageUrl : null,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
