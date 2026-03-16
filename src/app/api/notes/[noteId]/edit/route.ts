import { NextResponse } from "next/server";
import { noteCreateSchema } from "@/lib/schemas";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireTutor } from "@/app/api/_lib/supabaseAuth";

export async function GET(req: Request, ctx: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await ctx.params;
  const env = getPlatformPublicEnv();

  if (env.platformMode === "supabase" && env.supabaseConfigured) {
    const auth = await requireTutor(req);
    if ("error" in auth) return auth.error;
    const { supabase, user } = auth;

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .eq("author_id", user.id)
      .single();
    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      note: {
        id: data.id,
        subjectSlug: data.subject_slug,
        topicSlug: data.topic_slug,
        lessonNumber: data.lesson_number,
        title: data.title,
        content: data.content,
        featuredImageUrl: data.featured_image_url ?? "",
        published: Boolean(data.published),
      },
    });
  }

  return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await ctx.params;
  try {
    const body = await req.json();
    const parsed = noteCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const env = getPlatformPublicEnv();
    if (env.platformMode === "supabase" && env.supabaseConfigured) {
      const auth = await requireTutor(req);
      if ("error" in auth) return auth.error;
      const { supabase, user } = auth;
      const input = parsed.data;

      const { data, error } = await supabase
        .from("notes")
        .update({
          subject_slug: input.subjectSlug,
          topic_slug: input.topicSlug,
          lesson_number: input.lessonNumber,
          title: input.title,
          content: input.content,
          featured_image_url: input.featuredImageUrl ? input.featuredImageUrl : null,
          published: input.published,
        })
        .eq("id", noteId)
        .eq("author_id", user.id)
        .select("id")
        .single();
      if (error || !data) return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 400 });
      return NextResponse.json({ ok: true, id: data.id }, { status: 200 });
    }

    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
