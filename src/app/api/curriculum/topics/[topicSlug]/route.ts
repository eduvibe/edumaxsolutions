import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireTutor, requireAdmin } from "@/app/api/_lib/supabaseAuth";

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  yearGroup: z.string().max(40).nullable().optional(),
  yearOrder: z.number().int().positive().nullable().optional(),
  thread: z.string().max(60).nullable().optional(),
  schoolSection: z.enum(["primary", "jss", "sss"]).nullable().optional(),
  lessonCount: z.number().int().positive().nullable().optional(),
});

function deriveYearOrder(yearGroup: string | null | undefined) {
  if (!yearGroup) return null;
  const m = yearGroup.trim().match(/(\d{1,2})/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  if (!Number.isFinite(n) || n <= 0 || n > 20) return null;
  return n;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ topicSlug: string }> }) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireTutor(req);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const { topicSlug } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof parsed.data.name === "string") update.name = parsed.data.name.trim();
  if ("description" in parsed.data) update.description = parsed.data.description ?? null;
  if ("thread" in parsed.data) update.thread = parsed.data.thread ?? null;
  if ("schoolSection" in parsed.data) update.school_section = parsed.data.schoolSection ?? null;
  if ("lessonCount" in parsed.data) update.lesson_count = parsed.data.lessonCount ?? null;
  if ("yearGroup" in parsed.data) update.year_group = parsed.data.yearGroup ?? null;
  if ("yearOrder" in parsed.data) update.year_order = parsed.data.yearOrder ?? deriveYearOrder(parsed.data.yearGroup);
  if (!("yearOrder" in parsed.data) && "yearGroup" in parsed.data) update.year_order = deriveYearOrder(parsed.data.yearGroup);

  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true }, { status: 200 });

  const { error } = await supabase.from("curriculum_topics").update(update).eq("slug", topicSlug);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ topicSlug: string }> }) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const { topicSlug } = await ctx.params;

  const { error } = await supabase.from("curriculum_topics").delete().eq("slug", topicSlug);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

