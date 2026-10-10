/**
 * Bravo CBT — activation key generation and verification.
 *
 * Keys are HMAC-SHA256 signatures over a canonical payload string so the
 * desktop app can verify them fully offline using the same shared secret
 * (BRAVO_VENDOR_SECRET env var).
 *
 * Format returned to the buyer:
 *   BRAVO-<BASE64URL_PAYLOAD>.<BASE64URL_SIG>
 *
 * The desktop app splits on ".", base64url-decodes both halves, then
 * re-computes HMAC-SHA256(payload, secret) and compares to sig.
 */

import { createHmac, timingSafeEqual } from "crypto";

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export interface KeyPayload {
  productId: string; // e.g. BCBT-YDR9-G5WQ-0860
  kind: "new" | "renewal"; // plan type
  issuedAt: number; // Unix seconds
  orderId: string; // our internal order UUID
}

/**
 * Generate a signed activation key.
 * Requires BRAVO_VENDOR_SECRET to be set.
 */
export function generateActivationKey(payload: KeyPayload): string {
  const secret = process.env.BRAVO_VENDOR_SECRET;
  if (!secret) throw new Error("BRAVO_VENDOR_SECRET is not configured");

  const canonical = JSON.stringify({
    pid: payload.productId,
    kind: payload.kind,
    iat: payload.issuedAt,
    oid: payload.orderId,
  });

  const payloadBuf = Buffer.from(canonical, "utf8");
  const sig = createHmac("sha256", secret).update(payloadBuf).digest();

  return `BRAVO-${b64url(payloadBuf)}.${b64url(sig)}`;
}

/**
 * Verify a key returned by the buyer (used in leaderboard endpoint later).
 * Returns the decoded payload or null if invalid.
 */
export function verifyActivationKey(key: string): KeyPayload | null {
  const secret = process.env.BRAVO_VENDOR_SECRET;
  if (!secret) return null;

  try {
    const withoutPrefix = key.startsWith("BRAVO-") ? key.slice(6) : key;
    const dotIdx = withoutPrefix.lastIndexOf(".");
    if (dotIdx === -1) return null;

    const rawPayload = Buffer.from(withoutPrefix.slice(0, dotIdx), "base64");
    const rawSig = Buffer.from(withoutPrefix.slice(dotIdx + 1), "base64");

    const expected = createHmac("sha256", secret).update(rawPayload).digest();
    if (rawSig.length !== expected.length) return null;
    if (!timingSafeEqual(rawSig, expected)) return null;

    const obj = JSON.parse(rawPayload.toString("utf8"));
    return {
      productId: obj.pid,
      kind: obj.kind,
      issuedAt: obj.iat,
      orderId: obj.oid,
    };
  } catch {
    return null;
  }
}
