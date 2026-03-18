import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformPublicEnv, getPlatformServerEnv } from "@/lib/platform/env";
import { getSupabaseServerClient } from "@/lib/platform/supabase";
import { requireAdmin } from "@/app/api/_lib/supabaseAuth";

const schema = z.object({
  userId: z.string().min(10),
});

export async function POST(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const srvEnv = getPlatformServerEnv();
  if (!srvEnv.supabase.serviceRoleKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required for user management" }, { status: 501 });
  }

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const userId = parsed.data.userId.trim();
  const srv = getSupabaseServerClient();
  const { error } = await srv.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

