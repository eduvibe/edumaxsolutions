import { getSupabaseServerClientWithAccessToken } from "@/lib/platform/supabase";
import { NextResponse } from "next/server";

export async function requireTutor(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return { error: NextResponse.json({ error: "Missing Authorization header" }, { status: 401 }) };
  }

  const supabase = getSupabaseServerClientWithAccessToken(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { error: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };
  }

  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).maybeSingle();
  const role = String((roleRow as { role?: string } | null)?.role ?? "student");
  if (role !== "teacher" && role !== "admin") {
    return { error: NextResponse.json({ error: "Tutor access required" }, { status: 403 }) };
  }

  return { supabase, user: data.user, role };
}

export async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return { error: NextResponse.json({ error: "Missing Authorization header" }, { status: 401 }) };
  }

  const supabase = getSupabaseServerClientWithAccessToken(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { error: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };
  }

  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).maybeSingle();
  const role = String((roleRow as { role?: string } | null)?.role ?? "student");
  if (role !== "admin") {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }

  return { supabase, user: data.user, role };
}
