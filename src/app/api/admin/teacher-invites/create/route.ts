import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireAdmin } from "@/app/api/_lib/supabaseAuth";
import { sendEmail } from "@/lib/mail";

const schema = z.object({
  email: z.string().email().optional(),
  expiresInDays: z.number().int().min(1).max(90).optional(),
});

function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function newCode() {
  return crypto.randomBytes(16).toString("hex");
}

export async function POST(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const code = newCode();
  const codeHash = sha256Hex(code);
  const email = parsed.data.email?.trim().toLowerCase() || null;
  const expiresAt =
    typeof parsed.data.expiresInDays === "number"
      ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const { error } = await supabase.from("teacher_invites").insert({
    id: crypto.randomUUID(),
    code_hash: codeHash,
    email,
    expires_at: expiresAt,
    created_by: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (email) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #111;">EduMax Tutor Invite</h2>
        <p>You’ve been invited to join EduMax as a tutor.</p>
        <p><strong>Invite code:</strong></p>
        <p style="font-size: 18px; letter-spacing: 1px;"><code>${code}</code></p>
        <p>Sign in on the tutor login page and paste this code in the <strong>Tutor invite code</strong> field.</p>
        ${expiresAt ? `<p>This code expires on: <strong>${new Date(expiresAt).toLocaleString()}</strong></p>` : ""}
      </div>
    `;
    await sendEmail(email, "Your EduMax Tutor Invite Code", html);
  }

  return NextResponse.json({ ok: true, code }, { status: 201 });
}

