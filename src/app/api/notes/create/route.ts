import { NextResponse } from "next/server";
import { noteCreateSchema } from "@/lib/schemas";
import { createNote } from "@/lib/platform/store";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireTutor } from "@/app/api/_lib/supabaseAuth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = noteCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { subjectSlug, topicSlug, lessonNumber, title, content, featuredImageUrl, published } =
      parsed.data;

    const env = getPlatformPublicEnv();
    if (env.platformMode === "supabase" && env.supabaseConfigured) {
      const auth = await requireTutor(req);
      if ("error" in auth) return auth.error;
      const { supabase, user } = auth;
      const { error, data } = await supabase
        .from("notes")
        .insert({
          id: crypto.randomUUID(),
          subject_slug: subjectSlug,
          topic_slug: topicSlug,
          lesson_number: lessonNumber,
          title,
          content,
          featured_image_url: featuredImageUrl ? featuredImageUrl : null,
          author_id: user.id,
          published,
        })
        .select("id")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ note: { id: data.id } }, { status: 201 });
    }

    const note = await createNote({
      subjectSlug,
      topicSlug,
      lessonNumber,
      title,
      content,
      featuredImageUrl: featuredImageUrl ? featuredImageUrl : null,
      published,
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
