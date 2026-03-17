import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireAdmin } from "@/app/api/_lib/supabaseAuth";

const patchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  isNew: z.boolean().nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ subjectSlug: string }> }) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const { subjectSlug } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof parsed.data.name === "string") update.name = parsed.data.name.trim();
  if ("isNew" in parsed.data) update.is_new = parsed.data.isNew ?? null;
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true }, { status: 200 });

  const { error } = await supabase.from("curriculum_subjects").update(update).eq("slug", subjectSlug);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ subjectSlug: string }> }) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const { subjectSlug } = await ctx.params;

  const { error } = await supabase.from("curriculum_subjects").delete().eq("slug", subjectSlug);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

