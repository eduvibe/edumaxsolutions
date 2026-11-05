import { NextResponse } from "next/server";
import { BravoServiceError } from "./orders";
import { BravoConfigError } from "./config";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export function jsonNoStore(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...extraHeaders } });
}

/** Maps service errors to JSON responses. Internal details are logged, never returned. */
export function bravoErrorResponse(error: unknown) {
  if (error instanceof BravoServiceError) {
    return jsonNoStore({ error: error.code, message: error.message }, error.status);
  }
  if (error instanceof BravoConfigError) {
    console.error("[bravo] configuration error:", error.message);
    return jsonNoStore({ error: "not_configured", message: "Online payment is temporarily unavailable." }, 503);
  }
  console.error("[bravo] unexpected error:", error instanceof Error ? error.message : error);
  return jsonNoStore({ error: "internal_error", message: "Something went wrong. Please try again." }, 500);
}

// CORS for public student endpoints called from the browser (Bravo web build / local origins).
// The Electron main-process transport does not need CORS, but browser fetch does.
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

export function corsPreflight() {
  return new NextResponse(null, { status: 204, headers: { ...CORS_HEADERS, "Access-Control-Max-Age": "86400" } });
}

export async function readJsonObject(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await req.json()) as unknown;
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
