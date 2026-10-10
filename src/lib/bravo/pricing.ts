// Server-side price list for Bravo CBT activation keys.
// The browser may send a plan ID only; amounts are NEVER accepted from the client.
// Keep in sync with the copy on /bravo/activate and the CHECK constraint in db/migrations.

export const PLAN_IDS = ["first", "renewal"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const CURRENCY = "NGN" as const;

export const PLANS: Record<PlanId, { id: PlanId; label: string; amountNaira: number; amountKobo: number }> = {
  first: { id: "first", label: "New Activation", amountNaira: 4000, amountKobo: 400000 },
  renewal: { id: "renewal", label: "Renewal / additional installation", amountNaira: 3000, amountKobo: 300000 },
};

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

// Product IDs look like BCBT-YDR9-G5WQ-0860. The shape is validated loosely here
// (BCBT- prefix, then uppercase alphanumeric groups). Tighten once the Bravo generator is confirmed.
const PRODUCT_ID_RE = /^BCBT-[A-Z0-9]{4}(?:-[A-Z0-9]{4}){1,3}$/;

export function normalizeProductId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return PRODUCT_ID_RE.test(normalized) ? normalized : null;
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,24}$/;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 254 || !EMAIL_RE.test(normalized)) return null;
  return normalized;
}

export function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [user, domain] = email.split("@");
  if (!user || !domain) return null;
  return `${user.slice(0, 2)}***@${domain}`;
}
