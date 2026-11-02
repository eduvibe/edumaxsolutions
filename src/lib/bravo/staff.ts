// Bravo staff accounts: per-person tokens with permission levels, stored as SHA-256
// hashes in Turso. The env BRAVO_STAFF_TOKEN remains a bootstrap super-admin (all permissions).
import type { Client } from "@libsql/client";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const PERMISSIONS = ["mock_manage", "reports_review", "reports_export"] as const;
export type Permission = (typeof PERMISSIONS)[number];

export type StaffContext = {
  staffId: string;
  name: string;
  permissions: Permission[];
  isSuperAdmin: boolean;
};

export function hashStaffToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateStaffToken(): string {
  return `BCSTAFF-${randomBytes(24).toString("base64url")}`;
}

function envSuperAdminToken(): string | null {
  return process.env.BRAVO_STAFF_TOKEN?.trim() || null;
}

/**
 * Authenticates a staff bearer token. Super-admin = the env token (all permissions).
 * Otherwise the token hash must match an active bravo_staff row.
 */
export async function authenticateBravoStaff(req: Request, db: Client): Promise<{ ctx: StaffContext } | { error: NextResponse }> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return { error: NextResponse.json({ error: "staff_access_required" }, { status: 401 }) };

  const envToken = envSuperAdminToken();
  if (envToken) {
    const a = Buffer.from(token, "utf8");
    const b = Buffer.from(envToken, "utf8");
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return {
        ctx: { staffId: "env-super-admin", name: "Super admin (env)", permissions: [...PERMISSIONS], isSuperAdmin: true },
      };
    }
  }

  const hash = hashStaffToken(token);
  const result = await db.execute({
    sql: "SELECT id, name, permissions, active FROM bravo_staff WHERE token_hash = ?",
    args: [hash],
  });
  const row = result.rows[0] as unknown as { id: string; name: string; permissions: string; active: number } | undefined;
  if (!row || row.active !== 1) {
    return { error: NextResponse.json({ error: "staff_access_required" }, { status: 401 }) };
  }
  let permissions: Permission[] = [];
  try {
    const parsed = JSON.parse(row.permissions) as unknown;
    if (Array.isArray(parsed)) permissions = parsed.filter((p): p is Permission => (PERMISSIONS as readonly string[]).includes(p as string));
  } catch {
    permissions = [];
  }
  return { ctx: { staffId: row.id, name: row.name, permissions, isSuperAdmin: false } };
}

/** Authenticates and additionally requires a permission (super-admin always passes). */
export async function requireBravoStaff(req: Request, db: Client, permission?: Permission) {
  const auth = await authenticateBravoStaff(req, db);
  if ("error" in auth) return auth;
  if (permission && !auth.ctx.isSuperAdmin && !auth.ctx.permissions.includes(permission)) {
    return { error: NextResponse.json({ error: "forbidden", message: `Missing permission: ${permission}` }, { status: 403 }) };
  }
  return auth;
}

export type StaffRow = {
  id: string;
  name: string;
  permissions: Permission[];
  active: boolean;
  created_at: string;
  revoked_at: string | null;
};

export async function listStaff(db: Client): Promise<StaffRow[]> {
  const result = await db.execute({ sql: "SELECT id, name, permissions, active, created_at, revoked_at FROM bravo_staff ORDER BY created_at DESC", args: [] });
  return result.rows.map((r) => {
    const row = r as unknown as { id: string; name: string; permissions: string; active: number; created_at: string; revoked_at: string | null };
    let permissions: Permission[] = [];
    try {
      const parsed = JSON.parse(row.permissions) as unknown;
      if (Array.isArray(parsed)) permissions = parsed.filter((p): p is Permission => (PERMISSIONS as readonly string[]).includes(p as string));
    } catch { /* empty */ }
    return { id: row.id, name: row.name, permissions, active: row.active === 1, created_at: row.created_at, revoked_at: row.revoked_at };
  });
}

/** Creates a staff account. Returns the plaintext token exactly once. */
export async function createStaff(
  db: Client,
  input: { name: string; permissions: Permission[] },
  now: string
): Promise<{ staff: StaffRow; token: string }> {
  const name = input.name.trim();
  if (!name || name.length > 80) throw new StaffServiceError("invalid_name", "name must be 1-80 characters");
  const permissions = [...new Set(input.permissions)].filter((p) => (PERMISSIONS as readonly string[]).includes(p));
  if (permissions.length === 0) throw new StaffServiceError("invalid_permissions", "Select at least one permission");
  const token = generateStaffToken();
  const id = randomUUID();
  await db.execute({
    sql: "INSERT INTO bravo_staff (id, name, token_hash, permissions, active, created_at) VALUES (?, ?, ?, ?, 1, ?)",
    args: [id, name, hashStaffToken(token), JSON.stringify(permissions), now],
  });
  return { staff: { id, name, permissions, active: true, created_at: now, revoked_at: null }, token };
}

/** Revokes a staff account immediately (their token stops working at once). */
export async function revokeStaff(db: Client, id: string, now: string): Promise<boolean> {
  const result = await db.execute({
    sql: "UPDATE bravo_staff SET active = 0, revoked_at = ? WHERE id = ? AND active = 1",
    args: [now, id],
  });
  return result.rowsAffected > 0;
}

export class StaffServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
