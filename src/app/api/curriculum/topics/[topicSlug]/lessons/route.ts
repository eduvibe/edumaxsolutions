import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getSupabaseServerClient } from "@/lib/platform/supabase";
import { requireTutor } from "@/app/api/_lib/supabaseAuth";

const upsertSchema = z.object({
  lessons: z
    .array(
      z.object({
        lessonNumber: z.number().int().positive(),
        title: z.string().min(2).max(200),
        objective: z.string().max(500).nullable().optional(),
      })
    )
    .min(1),
});

export async function GET(req: Request, ctx: { params: Promise<{ topicSlug: string }> }) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ lessons: [] }, { status: 200 });
  }

  const { topicSlug } = await ctx.params;
  const supabase = getSupabaseServerClient();
  const { data: topic } = await supabase.from("curriculum_topics").select("id").eq("slug", topicSlug).maybeSingle();
  if (!topic) return NextResponse.json({ lessons: [] }, { status: 200 });

  const { data, error } = await supabase
    .from("curriculum_lessons")
    .select("id,topic_id,lesson_number,title,objective")
    .eq("topic_id", topic.id)
    .order("lesson_number", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ lessons: data ?? [] }, { status: 200 });
}

export async function POST(req: Request, ctx: { params: Promise<{ topicSlug: string }> }) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireTutor(req);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const { topicSlug } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const { data: topic, error: topicErr } = await supabase.from("curriculum_topics").select("id").eq("slug", topicSlug).single();
  if (topicErr || !topic) return NextResponse.json({ error: "Invalid topic" }, { status: 400 });

  const rows = parsed.data.lessons.map((l) => ({
    topic_id: topic.id,
    lesson_number: l.lessonNumber,
    title: l.title.trim(),
    objective: l.objective ?? null,
  }));

  const { error } = await supabase.from("curriculum_lessons").upsert(rows, { onConflict: "topic_id,lesson_number" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

