import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/platform/supabase";
import { requireUser } from "@/app/api/_lib/supabaseAuth";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { z } from "zod";

const schema = z.object({ code: z.string().min(1) });

export async function POST(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const inviteCode = process.env.TEACHER_INVITE_CODE?.trim();
  if (!inviteCode) {
    return NextResponse.json({ error: "Teacher registration is disabled" }, { status: 501 });
  }

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (parsed.data.code.trim() !== inviteCode) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 403 });
  }

  // Service role client to bypass RLS for role assignment
  const srv = getSupabaseServerClient();
  const { error } = await srv.from("user_roles").upsert({ user_id: user.id, role: "teacher" }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

