import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Order reference = Paystack transaction reference. Format is enforced on every route. */
export const ORDER_REF_RE = /^BCBT_[A-F0-9]{24}$/;

export function newOrderRef(): string {
  return `BCBT_${randomBytes(12).toString("hex").toUpperCase()}`;
}

/** Unguessable per-order secret returned once to the creator (Bravo app or browser). */
export function newStatusToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only the SHA-256 hash of the token is stored in Turso. */
export function hashStatusToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function statusTokenMatches(token: string | null | undefined, storedHash: string): boolean {
  if (!token || token.length > 256 || !/^[A-Za-z0-9_-]+$/.test(token)) return false;
  const a = Buffer.from(hashStatusToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}
