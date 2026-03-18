import { NextResponse } from "next/server";
import { templateUploadSchema } from "@/lib/schemas";
import { createTemplate } from "@/lib/platform/store";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireTutor } from "@/app/api/_lib/supabaseAuth";

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
        { error: "File is required (upload a file or paste a hosted URL)" },
        { status: 400 }
      );
    }

    const env = getPlatformPublicEnv();
    if (env.platformMode === "supabase" && env.supabaseConfigured) {
      const auth = await requireTutor(req);
      if ("error" in auth) return auth.error;
      const { supabase, user } = auth;
      const input = parsed.data;
      const { error, data } = await supabase
        .from("templates")
        .insert({
          id: crypto.randomUUID(),
          title: input.title,
          description: input.description,
          subject_slug: input.subjectSlug,
          topic_slug: input.topicSlug ? input.topicSlug : null,
          lesson_number: input.lessonNumber ?? null,
          resource_type: input.resourceType,
          file_url: fileUrl,
          preview_image_url: input.previewImageUrl ? input.previewImageUrl : null,
          uploaded_by: user.id,
        })
        .select("id")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ template: { id: data.id } }, { status: 201 });
    }

    const template = await createTemplate({
      title: parsed.data.title,
      description: parsed.data.description,
      subjectSlug: parsed.data.subjectSlug,
      topicSlug: parsed.data.topicSlug ? parsed.data.topicSlug : null,
      lessonNumber: parsed.data.lessonNumber ?? null,
      resourceType: parsed.data.resourceType,
      fileUrl,
      previewImageUrl: parsed.data.previewImageUrl ? parsed.data.previewImageUrl : null,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
