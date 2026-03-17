import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/platform/supabase";
import { requireUser } from "@/app/api/_lib/supabaseAuth";
import { getPlatformPublicEnv } from "@/lib/platform/env";

export async function POST(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  // Service role client to bypass RLS for role assignment
  const srv = getSupabaseServerClient();
  const { error } = await srv.from("user_roles").upsert({ user_id: user.id, role: "teacher" }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

