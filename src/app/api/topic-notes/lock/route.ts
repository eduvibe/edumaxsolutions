import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireTutor } from "@/app/api/_lib/supabaseAuth";

const schema = z.object({
  topicSlug: z.string().min(2),
  lessonNumber: z.number().int().positive(),
});

export async function POST(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireTutor(req);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase.rpc("acquire_topic_note_lock", {
    p_topic_slug: parsed.data.topicSlug,
    p_lesson_number: parsed.data.lessonNumber,
    p_ttl_seconds: 900,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const row = Array.isArray(data)
    ? (data[0] as
        | { acquired?: boolean; locked_by?: string | null; locked_until?: string | null; locked_by_email?: string | null; locked_by_name?: string | null }
        | undefined)
    : undefined;
  const acquired = Boolean(row?.acquired);
  const lockedBy = row?.locked_by ?? null;
  const lockedUntil = row?.locked_until ?? null;
  const lockedByEmail = row?.locked_by_email ?? null;
  const lockedByName = row?.locked_by_name ?? null;

  return NextResponse.json(
    { acquired, mine: acquired && lockedBy === user.id, lockedBy, lockedUntil, lockedByEmail, lockedByName },
    { status: 200 }
  );
}

export async function DELETE(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireTutor(req);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const { error } = await supabase.rpc("release_topic_note_lock", {
    p_topic_slug: parsed.data.topicSlug,
    p_lesson_number: parsed.data.lessonNumber,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}
