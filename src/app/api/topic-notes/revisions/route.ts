import { NextResponse } from "next/server";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireTutor } from "@/app/api/_lib/supabaseAuth";

export async function GET(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireTutor(req);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const url = new URL(req.url);
  const topicSlug = url.searchParams.get("topicSlug") ?? "";
  const lessonNumber = Number(url.searchParams.get("lessonNumber") ?? "");
  if (!topicSlug || !Number.isFinite(lessonNumber) || lessonNumber <= 0) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { data: noteRow, error: noteErr } = await supabase
    .from("topic_notes")
    .select("id")
    .eq("topic_slug", topicSlug)
    .eq("lesson_number", lessonNumber)
    .maybeSingle();
  if (noteErr) return NextResponse.json({ error: noteErr.message }, { status: 400 });
  if (!noteRow) return NextResponse.json({ revisions: [] }, { status: 200 });

  const { data, error } = await supabase
    .from("note_revisions")
    .select("id,note_id,previous_content,updated_content,updated_by,change_summary,created_at")
    .eq("note_id", noteRow.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ revisions: data ?? [] }, { status: 200 });
}

