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

  return { supabase, user: data.user };
}
