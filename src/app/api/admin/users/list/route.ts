import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getSupabaseServerClient } from "@/lib/platform/supabase";
import { requireAdmin } from "@/app/api/_lib/supabaseAuth";
import { getPlatformServerEnv } from "@/lib/platform/env";

const schema = z.object({
  page: z.number().int().min(1).max(1000).optional(),
  perPage: z.number().int().min(1).max(200).optional(),
  q: z.string().max(200).optional(),
});

type ListedUser = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  role: "student" | "teacher" | "admin";
};

export async function POST(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const srvEnv = getPlatformServerEnv();
  if (!srvEnv.supabase.serviceRoleKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required for user management" }, { status: 501 });
  }

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const page = parsed.data.page ?? 1;
  const perPage = parsed.data.perPage ?? 25;
  const q = parsed.data.q?.trim().toLowerCase() ?? "";

  const srv = getSupabaseServerClient();
  const { data, error } = await srv.auth.admin.listUsers({ page, perPage });
  if (error || !data?.users) {
    return NextResponse.json({ error: error?.message ?? "Unable to list users" }, { status: 400 });
  }

  const filtered = q
    ? data.users.filter((u) => (u.email ?? "").toLowerCase().includes(q) || (u.id ?? "").toLowerCase().includes(q))
    : data.users;

  const ids = filtered.map((u) => u.id).filter(Boolean);
  const rolesById = new Map<string, ListedUser["role"]>();
  if (ids.length) {
    const { data: roles } = await srv.from("user_roles").select("user_id,role").in("user_id", ids);
    for (const r of (roles ?? []) as Array<{ user_id?: string; role?: string }>) {
      const role = r.role === "admin" || r.role === "teacher" ? (r.role as ListedUser["role"]) : "student";
      if (r.user_id) rolesById.set(r.user_id, role);
    }
  }

  const users: ListedUser[] = filtered.map((u) => ({
    id: u.id,
    email: u.email ?? null,
    created_at: (u as unknown as { created_at?: string | null }).created_at ?? null,
    last_sign_in_at: (u as unknown as { last_sign_in_at?: string | null }).last_sign_in_at ?? null,
    email_confirmed_at: (u as unknown as { email_confirmed_at?: string | null }).email_confirmed_at ?? null,
    banned_until: (u as unknown as { banned_until?: string | null }).banned_until ?? null,
    role: rolesById.get(u.id) ?? "student",
  }));

  return NextResponse.json(
    {
      users,
      page,
      perPage,
      total: data.total ?? null,
    },
    { status: 200 }
  );
}

