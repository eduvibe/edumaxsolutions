// Browser-safe helpers for the Bravo online payment UI. Must NOT import server-only modules
// (tokens.ts, config.ts, orders.ts use node:crypto and server env vars).

export const ORDER_REF_CLIENT_RE = /^BCBT_[A-F0-9]{24}$/;

/** Per-order status token lives only in this tab's sessionStorage (never localStorage). */
export function statusTokenStorageKey(orderRef: string) {
  return `bravo:order-token:${orderRef}`;
}

export function readStatusToken(orderRef: string): string | null {
  try {
    return window.sessionStorage.getItem(statusTokenStorageKey(orderRef));
  } catch {
    return null;
  }
}

export function storeStatusToken(orderRef: string, token: string) {
  try {
    window.sessionStorage.setItem(statusTokenStorageKey(orderRef), token);
  } catch {
    /* private mode: the token is still in the URL fragment for this visit */
  }
}

/** Paystack checkout links are the only redirect target the browser may follow. */
export function isPaystackCheckoutUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && (parsed.hostname === "checkout.paystack.com" || parsed.hostname.endsWith(".paystack.com"));
  } catch {
    return false;
  }
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
  }
}

export async function bravoFetch<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown; statusToken?: string | null } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.statusToken) headers.Authorization = `Bearer ${options.statusToken}`;
  const res = await fetch(path, {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
    credentials: "same-origin",
  });
  const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string } & T;
  if (!res.ok) {
    throw new ApiRequestError(json.message ?? "Something went wrong. Please try again.", res.status, json.error ?? "error");
  }
  return json as T;
}
