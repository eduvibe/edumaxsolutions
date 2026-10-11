// Abuse and operations signals for the Bravo order routes. Written as one JSON line per event to the
// server log (Vercel runtime logs). Search for "bravo_signal" to find them.
//
// Never log: status tokens, full emails, Paystack secrets, raw IP addresses. IPs are hashed with a
// short SHA-256 prefix, which is enough to spot one client repeating requests.
import { createHash } from "node:crypto";

export type BravoSignal = "rate_limited" | "checkout_window_closed";

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip, "utf8").digest("hex").slice(0, 12);
}

export function logBravoSignal(signal: BravoSignal, fields: { route?: string; ip?: string; orderRef?: string }) {
  const { ip, ...rest } = fields;
  const line = {
    bravo_signal: signal,
    at: new Date().toISOString(),
    ...rest,
    ...(ip ? { ip_hash: hashIp(ip) } : {}),
  };
  console.warn(JSON.stringify(line));
}
