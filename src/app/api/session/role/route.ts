import { platformRoleCookieName, type PlatformRole } from "@/lib/platform/session";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTutor } from "@/app/api/_lib/supabaseAuth";

const roleSchema = z.object({
  role: z.enum(["student", "teacher"]),
});

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const role: PlatformRole = parsed.data.role;
  if (role === "teacher") {
    const auth = await requireTutor(req);
    if ("error" in auth) return auth.error;
  }
  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(platformRoleCookieName, role, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
