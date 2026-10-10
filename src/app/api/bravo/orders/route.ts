/**
 * POST /api/bravo/orders
 *   Initialises a Paystack transaction and creates a pending order row in Turso.
 *   Body: { productId, kind, email }
 *   Returns: { orderId, authorizationUrl }
 *
 * GET /api/bravo/orders?orderId=<uuid>
 *   Polls order status after buyer returns from Paystack.
 *   Returns: { status: "pending"|"paid"|"failed", activationKey?: string }
 */

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getTursoClient, ensureBravoSchema } from "@/lib/bravo/db";
import { checkRateLimit, getClientIp } from "@/app/api/_lib/rateLimit";

// ─── Paystack ─────────────────────────────────────────────────────────────────

const PAYSTACK_API = "https://api.paystack.co";

const PLAN_PRICES: Record<string, number> = {
  new: 400000,      // ₦4,000 in kobo
  renewal: 300000,  // ₦3,000 in kobo
};

async function paystackInit(params: {
  email: string;
  amountKobo: number;
  reference: string;
  metadata: Record<string, unknown>;
  callbackUrl: string;
}) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY is not configured");

  const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      metadata: params.metadata,
      callback_url: params.callbackUrl,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Paystack init failed (${res.status}): ${err}`);
  }

  const json = await res.json() as {
    status: boolean;
    data: { authorization_url: string; reference: string };
  };
  return json.data;
}

// ─── POST — create order ──────────────────────────────────────────────────────

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`bravo:order:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { productId?: string; kind?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { productId, kind, email } = body;

  if (!productId || !kind || !email) {
    return NextResponse.json(
      { error: "productId, kind and email are required" },
      { status: 400 }
    );
  }
  if (!["new", "renewal"].includes(kind)) {
    return NextResponse.json({ error: "Invalid plan kind" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const amountKobo = PLAN_PRICES[kind];
  const orderId = randomUUID();
  const origin = new URL(req.url).origin;

  try {
    // Ensure table exists (safe on every cold start)
    await ensureBravoSchema();

    const db = getTursoClient();

    // Insert pending order
    await db.execute({
      sql: `INSERT INTO bravo_orders (id, email, kind, amount_kobo, product_id, status)
            VALUES (?, ?, ?, ?, ?, 'pending')`,
      args: [orderId, email.trim().toLowerCase(), kind, amountKobo, productId.toUpperCase().trim()],
    });

    // Initialise Paystack transaction
    const psData = await paystackInit({
      email: email.trim().toLowerCase(),
      amountKobo,
      reference: orderId,
      metadata: {
        order_id: orderId,
        product_id: productId,
        kind,
        custom_fields: [
          { display_name: "Product ID", variable_name: "product_id", value: productId },
          { display_name: "Plan",       variable_name: "kind",       value: kind },
        ],
      },
      callbackUrl: `${origin}/bravo/activate?order=${orderId}`,
    });

    // Store Paystack reference (fire-and-forget — non-critical)
    db.execute({
      sql: `UPDATE bravo_orders SET paystack_ref = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
            WHERE id = ?`,
      args: [psData.reference, orderId],
    }).catch((err) => console.warn("Paystack ref update failed:", err));

    return NextResponse.json({ orderId, authorizationUrl: psData.authorization_url });
  } catch (err) {
    console.error("POST /api/bravo/orders:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── GET — poll order status ──────────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(orderId)) {
    return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
  }

  try {
    const db = getTursoClient();
    const result = await db.execute({
      sql: `SELECT status, activation_key FROM bravo_orders WHERE id = ? LIMIT 1`,
      args: [orderId],
    });

    if (!result.rows.length) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const row = result.rows[0];
    const status = String(row.status ?? "pending");

    return NextResponse.json({
      status,
      activationKey: status === "paid" ? row.activation_key : undefined,
    });
  } catch (err) {
    console.error("GET /api/bravo/orders:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
