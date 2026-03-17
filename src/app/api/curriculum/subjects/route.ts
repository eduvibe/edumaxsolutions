import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getSupabaseServerClient } from "@/lib/platform/supabase";
import { requireAdmin } from "@/app/api/_lib/supabaseAuth";

const createSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80),
  keyStages: z.array(z.string().min(2).max(10)).default([]),
  isNew: z.boolean().nullable().optional(),
});

export async function GET() {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ subjects: [] }, { status: 200 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("curriculum_subjects")
    .select("id,name,slug,key_stages,is_new")
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ subjects: data ?? [] }, { status: 200 });
}

export async function POST(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = auth.supabase;
  const { name, slug, keyStages, isNew } = parsed.data;
  const { data, error } = await supabase
    .from("curriculum_subjects")
    .insert({ name: name.trim(), slug: slug.trim(), key_stages: keyStages, is_new: isNew ?? null })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

