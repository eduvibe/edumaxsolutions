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
  const { supabase, user } = auth;

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "queue";
  const status = url.searchParams.get("status") ?? "pending";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50") || 50, 100);

  let q = supabase
    .from("note_suggestions")
    .select("id,note_id,proposed_content,suggested_by,change_summary,status,created_at")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (scope === "mine") {
    q = q.eq("suggested_by", user.id);
  } else {
    q = q.neq("suggested_by", user.id);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ suggestions: data ?? [] }, { status: 200 });
}

