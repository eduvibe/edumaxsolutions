import type { PlanId } from "./pricing";

export type ActivationEmail = {
  to: string;
  productId: string;
  plan: PlanId;
  orderRef: string;
  activationKey: string;
  /** Stable per order so repeated sends of the same key are de-duplicated by Resend. */
  idempotencyKey: string;
};

export type Mailer = (
  message: ActivationEmail
) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export function renderActivationEmail(message: Pick<ActivationEmail, "productId" | "plan" | "orderRef" | "activationKey">) {
  const { productId, plan, orderRef, activationKey } = message;
  const planLabel = plan === "first" ? "New Activation" : "Renewal";
  const subject = "Your Bravo CBT activation key";
  const text = [
    "Thank you for your payment to EduMax Solutions.",
    "",
    `Product ID: ${productId}`,
    `Plan: ${planLabel}`,
    `Order reference: ${orderRef}`,
    "",
    `Activation key: ${activationKey}`,
    "",
    "Open Bravo CBT, go to Product > Activate, paste this key and press Activate.",
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Your Bravo CBT activation key</h2>
      <p>Thank you for your payment to EduMax Solutions.</p>
      <p><strong>Product ID:</strong> ${escapeHtml(productId)}<br/>
         <strong>Plan:</strong> ${escapeHtml(planLabel)}<br/>
         <strong>Order reference:</strong> ${escapeHtml(orderRef)}</p>
      <p style="font-size: 18px; font-family: monospace; background: #f4f4f5; padding: 12px; border-radius: 8px;">
        ${escapeHtml(activationKey)}
      </p>
      <p>Open Bravo CBT, go to <strong>Product &rarr; Activate</strong>, paste this key and press <strong>Activate</strong>.</p>
    </div>`;
  return { subject, text, html };
}

export function createResendMailer(options: { apiKey: string; from: string; fetchImpl?: typeof fetch }): Mailer {
  const fetchImpl = options.fetchImpl ?? fetch;
  return async (message) => {
    const { subject, text, html } = renderActivationEmail(message);
    try {
      const res = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": message.idempotencyKey,
        },
        body: JSON.stringify({ from: options.from, to: [message.to], subject, text, html }),
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!res.ok || !json.id) {
        return { ok: false, error: `Resend ${res.status}: ${json.message ?? "no id returned"}` };
      }
      return { ok: true, id: json.id };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "unknown email error" };
    }
  };
}
