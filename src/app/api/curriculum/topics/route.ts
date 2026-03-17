import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getSupabaseServerClient } from "@/lib/platform/supabase";
import { requireTutor } from "@/app/api/_lib/supabaseAuth";

const createSchema = z.object({
  subjectSlug: z.string().min(2).max(80),
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120),
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

export async function GET(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ topics: [] }, { status: 200 });
  }
  const url = new URL(req.url);
  const subjectSlug = url.searchParams.get("subjectSlug");

  const supabase = getSupabaseServerClient();
  let q = supabase
    .from("curriculum_topics")
    .select("id,subject_id,name,slug,description,year_group,year_order,thread,school_section,lesson_count")
    .order("year_order", { ascending: true })
    .order("name", { ascending: true });

  if (subjectSlug) {
    const { data: subj } = await supabase.from("curriculum_subjects").select("id").eq("slug", subjectSlug).maybeSingle();
    if (!subj) return NextResponse.json({ topics: [] }, { status: 200 });
    q = q.eq("subject_id", subj.id);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ topics: data ?? [] }, { status: 200 });
}

export async function POST(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireTutor(req);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const { data: subj, error: subjErr } = await supabase.from("curriculum_subjects").select("id").eq("slug", parsed.data.subjectSlug).single();
  if (subjErr || !subj) return NextResponse.json({ error: "Invalid subject" }, { status: 400 });

  const t = parsed.data;
  const { data, error } = await supabase
    .from("curriculum_topics")
    .insert({
      subject_id: subj.id,
      name: t.name.trim(),
      slug: t.slug.trim(),
      description: t.description ?? null,
      year_group: t.yearGroup ?? null,
      year_order: t.yearOrder ?? deriveYearOrder(t.yearGroup),
      thread: t.thread ?? null,
      school_section: t.schoolSection ?? null,
      lesson_count: t.lessonCount ?? null,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
