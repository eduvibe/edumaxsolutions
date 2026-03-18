import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getSupabaseServerClient } from "@/lib/platform/supabase";
import { requireUser } from "@/app/api/_lib/supabaseAuth";
import { checkRateLimit, getClientIp } from "@/app/api/_lib/rateLimit";

const schema = z.object({ code: z.string().min(6) });

function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function POST(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const ip = getClientIp(req);
  const ipLimit = checkRateLimit(`teacher-invites:redeem:ip:${ip}`, 10, 60 * 60 * 1000);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((ipLimit.resetAt - Date.now()) / 1000))) } }
    );
  }
  const userLimit = checkRateLimit(`teacher-invites:redeem:user:${user.id}`, 5, 60 * 60 * 1000);
  if (!userLimit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((userLimit.resetAt - Date.now()) / 1000))) } }
    );
  }

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const code = parsed.data.code.trim();
  if (!code) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  const srv = getSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const codeHash = sha256Hex(code);

  const normalizedEmail = (user.email ?? "").trim().toLowerCase();
  const { data: existing, error: findErr } = await srv
    .from("teacher_invites")
    .select("id,email,expires_at,used_at")
    .eq("code_hash", codeHash)
    .maybeSingle();
  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 400 });
  if (!existing || existing.used_at) return NextResponse.json({ error: "Invite code is invalid or already used" }, { status: 403 });
  if (existing.expires_at && new Date(existing.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Invite code is expired" }, { status: 403 });
  }
  if (existing.email && existing.email.trim().toLowerCase() !== normalizedEmail) {
    return NextResponse.json({ error: "Invite code is not for this email address" }, { status: 403 });
  }

  let claim = srv
    .from("teacher_invites")
    .update({ used_at: nowIso, used_by: user.id })
    .eq("code_hash", codeHash)
    .is("used_at", null);
  if (existing.email) claim = claim.eq("email", existing.email);
  if (existing.expires_at) claim = claim.gt("expires_at", nowIso);
  const { data: invite, error: claimErr } = await claim.select("id").maybeSingle();

  if (claimErr) return NextResponse.json({ error: claimErr.message }, { status: 400 });
  if (!invite) return NextResponse.json({ error: "Invite code is invalid or already used" }, { status: 403 });

  const { error: roleErr } = await srv.from("user_roles").upsert({ user_id: user.id, role: "teacher" }, { onConflict: "user_id" });
  if (roleErr) return NextResponse.json({ error: roleErr.message }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
