import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireAdmin, requireUser } from "@/app/api/_lib/supabaseAuth";

const createSchema = z.object({
  phone: z.string().min(7).max(30),
  school: z.string().min(2).max(120),
  location: z.string().min(2).max(120),
});

export async function POST(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;
  const { supabase, user, role } = auth;
  if (role !== "student") return NextResponse.json({ error: "Application not allowed" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existing } = await supabase.from("teacher_applications").select("id,status").eq("user_id", user.id).maybeSingle();
  if (existing?.status === "pending") {
    return NextResponse.json({ error: "Application already submitted" }, { status: 400 });
  }
  if (existing?.status === "approved") {
    return NextResponse.json({ error: "Already approved" }, { status: 400 });
  }

  const { phone, school, location } = parsed.data;
  const { error } = await supabase.from("teacher_applications").upsert(
    {
      user_id: user.id,
      email: user.email ?? "",
      phone,
      school,
      location,
      status: "pending",
    },
    { onConflict: "user_id" }
  );
  if (error) {
    const msg =
      error.message.includes("schema cache") && error.message.includes("teacher_applications")
        ? "Teacher applications table is not deployed in Supabase. Run supabase/teacher_applications.sql (and roles_admin.sql), then refresh Supabase API schema cache."
        : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending";
  const { data, error } = await supabase
    .from("teacher_applications")
    .select("id,user_id,email,phone,school,location,status,created_at")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ applications: data ?? [] }, { status: 200 });
}
