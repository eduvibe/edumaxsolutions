import { NextResponse } from "next/server";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireAdmin } from "@/app/api/_lib/supabaseAuth";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await ctx.params;

  const { data: appRow, error: appErr } = await supabase
    .from("teacher_applications")
    .select("id,user_id,status")
    .eq("id", id)
    .single();
  if (appErr || !appRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (appRow.status !== "pending") return NextResponse.json({ error: "Not pending" }, { status: 400 });

  const { error: roleErr } = await supabase.from("user_roles").upsert({ user_id: appRow.user_id, role: "teacher" }, { onConflict: "user_id" });
  if (roleErr) return NextResponse.json({ error: roleErr.message }, { status: 400 });

  const { error: updErr } = await supabase
    .from("teacher_applications")
    .update({ status: "approved", decided_at: new Date().toISOString(), decided_by: user.id })
    .eq("id", appRow.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 200 });
}

