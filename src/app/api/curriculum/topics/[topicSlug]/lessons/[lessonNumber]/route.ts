import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireTutor, requireAdmin } from "@/app/api/_lib/supabaseAuth";
import { getSupabaseServerClient } from "@/lib/platform/supabase";

const patchSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  objective: z.string().max(500).nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ topicSlug: string; lessonNumber: string }> }) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireTutor(req);
  if ("error" in auth) return auth.error;
  const { topicSlug, lessonNumber: lessonNumberRaw } = await ctx.params;
  const lessonNumber = Number.parseInt(lessonNumberRaw, 10);
  if (!Number.isFinite(lessonNumber) || lessonNumber <= 0) return NextResponse.json({ error: "Invalid lesson number" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof parsed.data.title === "string") update.title = parsed.data.title.trim();
  if ("objective" in parsed.data) update.objective = parsed.data.objective ?? null;
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true }, { status: 200 });

  const srv = getSupabaseServerClient();
  const { data: topic } = await srv.from("curriculum_topics").select("id").eq("slug", topicSlug).maybeSingle();
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

  const { error } = await auth.supabase.from("curriculum_lessons").update(update).eq("topic_id", topic.id).eq("lesson_number", lessonNumber);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ topicSlug: string; lessonNumber: string }> }) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { topicSlug, lessonNumber: lessonNumberRaw } = await ctx.params;
  const lessonNumber = Number.parseInt(lessonNumberRaw, 10);
  if (!Number.isFinite(lessonNumber) || lessonNumber <= 0) return NextResponse.json({ error: "Invalid lesson number" }, { status: 400 });

  const srv = getSupabaseServerClient();
  const { data: topic } = await srv.from("curriculum_topics").select("id").eq("slug", topicSlug).maybeSingle();
  if (!topic) return NextResponse.json({ ok: true }, { status: 200 });

  const { error } = await auth.supabase.from("curriculum_lessons").delete().eq("topic_id", topic.id).eq("lesson_number", lessonNumber);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

