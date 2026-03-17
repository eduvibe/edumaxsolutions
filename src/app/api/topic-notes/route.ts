import { NextResponse } from "next/server";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getSupabaseServerClient } from "@/lib/platform/supabase";

export async function GET(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const url = new URL(req.url);
  const topicSlug = url.searchParams.get("topicSlug") ?? "";
  const lessonNumber = Number(url.searchParams.get("lessonNumber") ?? "");
  if (!topicSlug || !Number.isFinite(lessonNumber) || lessonNumber <= 0) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("topic_notes")
    .select("id,subject_slug,topic_slug,lesson_number,content,last_updated")
    .eq("topic_slug", topicSlug)
    .eq("lesson_number", lessonNumber)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ note: null }, { status: 200 });

  return NextResponse.json({
    note: {
      id: data.id,
      subjectSlug: data.subject_slug,
      topicSlug: data.topic_slug,
      lessonNumber: data.lesson_number,
      content: data.content,
      lastUpdated: data.last_updated,
    },
  });
}

