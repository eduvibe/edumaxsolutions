/**
 * POST /api/bravo/webhooks/paystack
 *
 * Receives Paystack webhook events (charge.success).
 * HMAC-SHA512 signature verified against PAYSTACK_SECRET_KEY.
 *
 * On charge.success:
 *   1. Verify signature
 *   2. Idempotency check — skip if already paid
 *   3. Generate activation key (HMAC-SHA256 signed with BRAVO_VENDOR_SECRET)
 *   4. Write key to Turso bravo_orders
 *   5. Email key to buyer via existing Zoho SMTP
 */

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getTursoClient } from "@/lib/bravo/db";
import { generateActivationKey } from "@/lib/bravo/keys";
import { sendEmail } from "@/lib/mail";

export const runtime = "nodejs";

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;
  const expected = createHmac("sha512", secret).update(rawBody, "utf8").digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const rawBody = await req.text();

  if (!verifySignature(rawBody, signature)) {
    console.warn("Bravo webhook: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Acknowledge non-payment events immediately
  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const data = event.data;
  const reference = String(data.reference ?? "");
  const paystackEmail = String(
    (data.customer as Record<string, unknown>)?.email ?? ""
  );
  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  const orderId = String(metadata.order_id ?? reference);
  const productId = String(metadata.product_id ?? "");

  if (!orderId || !productId) {
    console.error("Webhook missing orderId/productId", { reference, metadata });
    return NextResponse.json({ received: true }); // 200 so Paystack stops retrying
  }

  try {
    const db = getTursoClient();

    // Fetch order
    const result = await db.execute({
      sql: `SELECT id, status, email, kind, product_id FROM bravo_orders WHERE id = ? LIMIT 1`,
      args: [orderId],
    });

    if (!result.rows.length) {
      console.error("Webhook: order not found", orderId);
      return NextResponse.json({ received: true });
    }

    const order = result.rows[0];

    // Idempotency guard
    if (String(order.status) === "paid") {
      return NextResponse.json({ received: true });
    }

    // Generate activation key
    const activationKey = generateActivationKey({
      productId: String(order.product_id ?? productId),
      kind: (String(order.kind ?? "new")) as "new" | "renewal",
      issuedAt: Math.floor(Date.now() / 1000),
      orderId,
    });

    // Mark paid and store key
    await db.execute({
      sql: `UPDATE bravo_orders
            SET status = 'paid',
                activation_key = ?,
                paystack_ref = ?,
                paid_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
                updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
            WHERE id = ?`,
      args: [activationKey, reference, orderId],
    });

    // Email the key
    const recipientEmail = String(order.email ?? paystackEmail);
    const planLabel = String(order.kind) === "renewal" ? "Renewal" : "New Activation";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#171717">
        <h2 style="margin-bottom:4px">Your Bravo CBT Activation Key</h2>
        <p style="color:#737373;margin-top:0">${planLabel} — Order #${orderId.slice(0,8).toUpperCase()}</p>
        <p>Thank you for your purchase. Here is your activation key:</p>
        <div style="background:#f5f5f5;border:1px solid #e5e5e5;border-radius:8px;padding:16px 20px;margin:20px 0">
          <code style="font-size:13px;word-break:break-all;letter-spacing:0.03em">${activationKey}</code>
        </div>
        <h3 style="margin-bottom:8px">How to activate</h3>
        <ol style="padding-left:20px;line-height:1.8;color:#404040">
          <li>Open <strong>Bravo CBT</strong> on your device.</li>
          <li>Go to <strong>Product → Activate</strong>.</li>
          <li>Paste the key above and press <strong>Activate</strong>.</li>
          <li>The app unlocks immediately — no internet required.</li>
        </ol>
        <p style="color:#737373;font-size:12px;margin-top:32px">
          Keep this email. Need help? WhatsApp
          <a href="https://wa.me/2348067819642" style="color:#171717">+234 806 781 9642</a>
          or reply here.<br>Product ID: <strong>${String(order.product_id ?? productId)}</strong>
        </p>
        <p style="color:#a3a3a3;font-size:11px">Bravo CBT by EduMax Solutions</p>
      </div>`;

    const emailResult = await sendEmail(
      recipientEmail,
      "Your Bravo CBT Activation Key",
      html
    );

    if (!emailResult.success) {
      console.warn("Webhook: email failed —", emailResult.error);
      // Key is stored; browser polling will still surface it
    }

    console.log(`Bravo order ${orderId} paid — key issued to ${recipientEmail}`);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
