import { NextResponse } from "next/server";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireTutor } from "@/app/api/_lib/supabaseAuth";
import { topicNoteSuggestionCreateSchema } from "@/lib/schemas";

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
  const status = url.searchParams.get("status") ?? "pending";
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
  if (!noteRow) return NextResponse.json({ suggestions: [] }, { status: 200 });

  const { data, error } = await supabase
    .from("note_suggestions")
    .select("id,note_id,proposed_content,suggested_by,change_summary,status,created_at")
    .eq("note_id", noteRow.id)
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ suggestions: data ?? [] }, { status: 200 });
}

export async function POST(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireTutor(req);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = topicNoteSuggestionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { subjectSlug, topicSlug, lessonNumber, proposedContent, changeSummary } = parsed.data;

  const { data: lockRows, error: lockErr } = await supabase
    .from("topic_note_locks")
    .select("locked_by,locked_until")
    .eq("topic_slug", topicSlug)
    .eq("lesson_number", lessonNumber)
    .maybeSingle();
  if (lockErr) return NextResponse.json({ error: lockErr.message }, { status: 400 });
  const lockedBy = (lockRows as { locked_by?: string } | null)?.locked_by ?? null;
  const lockedUntil = (lockRows as { locked_until?: string } | null)?.locked_until ?? null;
  if (!lockedBy || lockedBy !== user.id) {
    return NextResponse.json({ error: "This note is being edited by another tutor. Try again later." }, { status: 409 });
  }
  if (lockedUntil && new Date(lockedUntil).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Edit session expired. Re-open Suggest edit to continue." }, { status: 409 });
  }

  const { data: existing, error: existErr } = await supabase
    .from("topic_notes")
    .select("id")
    .eq("topic_slug", topicSlug)
    .eq("lesson_number", lessonNumber)
    .maybeSingle();
  if (existErr) return NextResponse.json({ error: existErr.message }, { status: 400 });

  let noteId = existing?.id as string | undefined;
  if (!noteId) {
    const { data: created, error: createErr } = await supabase
      .from("topic_notes")
      .insert({
        subject_slug: subjectSlug,
        topic_slug: topicSlug,
        lesson_number: lessonNumber,
        content: "",
      })
      .select("id")
      .single();
    if (createErr || !created) return NextResponse.json({ error: createErr?.message ?? "Unable to create note" }, { status: 400 });
    noteId = created.id;
  }

  const { data: suggestion, error } = await supabase
    .from("note_suggestions")
    .insert({
      note_id: noteId,
      proposed_content: proposedContent,
      suggested_by: user.id,
      change_summary: changeSummary,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !suggestion) return NextResponse.json({ error: error?.message ?? "Unable to submit suggestion" }, { status: 400 });
  return NextResponse.json({ ok: true, id: suggestion.id }, { status: 201 });
}
