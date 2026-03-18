export function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim();
  if (first) return first;
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

type Bucket = {
  count: number;
  resetAt: number;
};

function getBuckets() {
  const g = globalThis as unknown as { __edumax_rate_limit_buckets?: Map<string, Bucket> };
  if (!g.__edumax_rate_limit_buckets) g.__edumax_rate_limit_buckets = new Map();
  return g.__edumax_rate_limit_buckets;
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const buckets = getBuckets();
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    const next: Bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, next);
    return { ok: true, remaining: Math.max(0, limit - next.count), resetAt: next.resetAt };
  }
  b.count += 1;
  buckets.set(key, b);
  if (b.count > limit) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }
  return { ok: true, remaining: Math.max(0, limit - b.count), resetAt: b.resetAt };
}

