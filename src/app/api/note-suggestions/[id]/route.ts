import { NextResponse } from "next/server";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireTutor } from "@/app/api/_lib/supabaseAuth";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const { id } = await ctx.params;
  const auth = await requireTutor(req);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: suggestion, error } = await supabase
    .from("note_suggestions")
    .select("id,note_id,proposed_content,suggested_by,change_summary,status,created_at")
    .eq("id", id)
    .single();
  if (error || !suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: note, error: noteErr } = await supabase
    .from("topic_notes")
    .select("id,subject_slug,topic_slug,lesson_number,content,last_updated")
    .eq("id", suggestion.note_id)
    .single();
  if (noteErr || !note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: votes, error: voteErr } = await supabase
    .from("suggestion_votes")
    .select("teacher_id,vote_type")
    .eq("suggestion_id", suggestion.id);
  if (voteErr) return NextResponse.json({ error: voteErr.message }, { status: 400 });

  const approveCount = (votes ?? []).filter((v) => v.vote_type === "approve").length;
  const rejectCount = (votes ?? []).filter((v) => v.vote_type === "reject").length;
  const myVote = (votes ?? []).find((v) => v.teacher_id === user.id)?.vote_type ?? null;
  const canVote = suggestion.status === "pending" && suggestion.suggested_by !== user.id && !myVote;

  return NextResponse.json({
    suggestion,
    note: {
      id: note.id,
      subjectSlug: note.subject_slug,
      topicSlug: note.topic_slug,
      lessonNumber: note.lesson_number,
      content: note.content,
      lastUpdated: note.last_updated,
    },
    votes: { approveCount, rejectCount, myVote, canVote },
  });
}

