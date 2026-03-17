import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getSupabaseServerClient } from "@/lib/platform/supabase";

const schema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8),
});

function isStrongPassword(pw: string) {
  if (pw.length < 8) return false;
  if (!/[A-Za-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  return true;
}

export async function POST(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported" }, { status: 501 });
  }

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  if (!isStrongPassword(parsed.data.newPassword)) {
    return NextResponse.json({ error: "Password must be at least 8 characters and include letters and numbers" }, { status: 400 });
  }

  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const srv = getSupabaseServerClient();

  const { data: row, error } = await srv
    .from("student_password_resets")
    .select("id,user_id,expires_at,used_at")
    .eq("token_hash", tokenHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !row) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  if (row.used_at) return NextResponse.json({ error: "Token already used" }, { status: 400 });
  if (new Date(row.expires_at).getTime() < Date.now()) return NextResponse.json({ error: "Token expired" }, { status: 400 });

  const admin = srv.auth.admin;
  const upd = await admin.updateUserById(row.user_id, { password: parsed.data.newPassword });
  if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 400 });

  await srv.from("student_password_resets").update({ used_at: new Date().toISOString() }).eq("id", row.id);

  return NextResponse.json({ ok: true }, { status: 200 });
}

