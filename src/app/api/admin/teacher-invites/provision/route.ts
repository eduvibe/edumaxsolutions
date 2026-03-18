import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireAdmin } from "@/app/api/_lib/supabaseAuth";
import { getSupabaseServerClient } from "@/lib/platform/supabase";
import { sendEmail } from "@/lib/mail";

const schema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(1).optional(),
});

export async function POST(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const fullName = parsed.data.fullName?.trim() || undefined;

  const srv = getSupabaseServerClient();
  const { data, error } = await srv.auth.admin.generateLink({
    type: "invite",
    email,
    options: fullName ? { data: { full_name: fullName } } : undefined,
  });
  const actionLink = data?.properties?.action_link;
  if (error || !actionLink || !data?.user?.id) {
    return NextResponse.json({ error: error?.message ?? "Unable to provision tutor" }, { status: 400 });
  }

  const { error: roleErr } = await srv.from("user_roles").upsert({ user_id: data.user.id, role: "teacher" }, { onConflict: "user_id" });
  if (roleErr) return NextResponse.json({ error: roleErr.message }, { status: 400 });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <h2 style="color: #111;">EduMax Tutor Access</h2>
      <p>You’ve been invited to EduMax as a tutor.</p>
      <p>Click the button below to set your password and access tutor tools:</p>
      <p style="margin: 18px 0;">
        <a href="${actionLink}" style="display:inline-block;background:#111;color:#fff;padding:12px 16px;border-radius:8px;text-decoration:none;">
          Activate tutor account
        </a>
      </p>
      <p>If the button doesn’t work, copy and paste this link:</p>
      <p><a href="${actionLink}">${actionLink}</a></p>
    </div>
  `;
  await sendEmail(email, "EduMax Tutor Access", html);

  return NextResponse.json({ ok: true }, { status: 201 });
}
