import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/app/api/_lib/supabaseAuth";

const schema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["student", "teacher", "admin"]),
});

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { userId, role } = parsed.data;

  const { error } = await supabase.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 200 });
}

