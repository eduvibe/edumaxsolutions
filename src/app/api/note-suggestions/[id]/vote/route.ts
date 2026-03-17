import { NextResponse } from "next/server";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireTutor } from "@/app/api/_lib/supabaseAuth";
import { suggestionVoteSchema } from "@/lib/schemas";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const { id } = await ctx.params;
  const auth = await requireTutor(req);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = suggestionVoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { data: suggestion, error } = await supabase
    .from("note_suggestions")
    .select("id,suggested_by,status")
    .eq("id", id)
    .single();
  if (error || !suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (suggestion.status !== "pending") return NextResponse.json({ error: "Suggestion is not pending" }, { status: 400 });
  if (suggestion.suggested_by === user.id) return NextResponse.json({ error: "You cannot vote on your own suggestion" }, { status: 403 });

  const { error: voteErr } = await supabase.from("suggestion_votes").insert({
    suggestion_id: suggestion.id,
    teacher_id: user.id,
    vote_type: parsed.data.voteType,
  });
  if (voteErr) return NextResponse.json({ error: voteErr.message }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 201 });
}

