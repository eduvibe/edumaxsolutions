import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { sendEmail } from "@/lib/mail";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getSupabaseServerClient } from "@/lib/platform/supabase";

const schema = z.object({
  email: z.string().email(),
});

function baseUrlFromRequest(req: Request) {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: true }, { status: 200 });

  const recoveryEmail = parsed.data.email.trim().toLowerCase();
  if (!recoveryEmail) return NextResponse.json({ ok: true }, { status: 200 });

  const srv = getSupabaseServerClient();
  const { data: identity } = await srv
    .from("student_identities")
    .select("user_id,recovery_email")
    .eq("recovery_email", recoveryEmail)
    .maybeSingle();

  const userId = (identity as { user_id?: string } | null)?.user_id ?? null;
  if (!userId) return NextResponse.json({ ok: true }, { status: 200 });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();

  await srv.from("student_password_resets").insert({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt });

  const base = baseUrlFromRequest(req);
  const resetUrl = `${base}/learn/account/reset?token=${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <h2 style="color:#111;">Reset your EduMax password</h2>
      <p>Click the button below to set a new password. This link expires in 30 minutes.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="display:inline-block;padding:12px 16px;background:#111;color:#fff;text-decoration:none;border-radius:10px;">Reset password</a>
      </p>
      <p style="color:#555;font-size:12px;">If you did not request this, you can ignore this email.</p>
    </div>
  `;

  await sendEmail(recoveryEmail, "Reset your EduMax password", html);

  return NextResponse.json({ ok: true }, { status: 200 });
}
