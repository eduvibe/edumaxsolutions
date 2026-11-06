// Server-only receipt view model for /bravo/receipt.
// The page never trusts URL-supplied details: everything is loaded from the database by
// reference, and the one-time status token (from order creation) is required before any
// order data — especially the activation key — is shown. A bare reference shows nothing.
import type { BravoDeps } from "./orders";
import { getOrderStatus, statusMessage, type PublicOrderStatus } from "./orders";

export type ReceiptView =
  | { kind: "ok"; order: PublicOrderStatus & { message: string } }
  | { kind: "unauthorized" }
  | { kind: "not_found" };

export async function getReceiptView(deps: BravoDeps, reference: string, statusToken: string | null): Promise<ReceiptView> {
  const ref = reference.trim();
  if (!ref) return { kind: "not_found" };
  // No token -> never reveal order data (a reference alone must not grant access to the key).
  if (!statusToken) return { kind: "unauthorized" };
  try {
    const order = await getOrderStatus(deps, { orderRef: ref, statusToken });
    return { kind: "ok", order };
  } catch (error) {
    const code = (error as { code?: string }).code;
    // Unknown order and wrong token both surface as not_found (the API already hides which).
    if (code === "not_found" || code === "unauthorized") return { kind: "not_found" };
    throw error;
  }
}

export { statusMessage };
