# Handoff: Bravo CBT app session (eduvibe/bravo)

Written from the website session (`arena/6828d715-edumaxsolutions`, head `200137d`). Read with
`docs/bravo-online-payment.md`, which is the full API contract. This note lists what the app must do.

## Status

- Website side is implemented and tested (113 tests). A real Production payment has already succeeded
  through the flow. Do not change the payment path without re-testing.
- The app side is **not** implemented in this session. Nothing in `eduvibe/bravo` was modified.
- Not yet live: migration `0003` must be applied to Production Turso before the new website code is deployed.
  Follow `docs/bravo-production-migration-runbook.md` (preflight first, then back up, then migrate).

## What the app must do

1. **Create the order** when the user chooses Pay Online:
   `POST https://www.edumaxsolutions.com.ng/api/bravo/orders`
   with `{ "productId", "plan": "first" | "renewal", "email"? }`.
   Send `email` only when the candidate has a saved email. Never send `amount`, `currency`, `editionYear`,
   `status`, or any token. Those are rejected with `400 authoritative_field_rejected`.
   Store `orderRef` and `statusToken` securely. The token is shown once.
2. **Open the browser immediately** at
   `https://www.edumaxsolutions.com.ng/bravo/activate?order=<orderRef>#t=<statusToken>`.
   The checkout-start window is **30 minutes from creation**. Opening late gives a
   `checkout_window_closed` message and requires a new order. A payment already started on Paystack
   is still processed.
3. **Poll** `GET /api/bravo/orders/<orderRef>` with `Authorization: Bearer <statusToken>`, every 5 seconds.
   Back off on 429 and 5xx. Stop after about 30 minutes.
   - `activationKey` is non-null only when `status == "fulfilled"`. Verify it offline against the
     committed public key before activating.
   - `paid` means keep polling. `needs_review` means stop and show the order reference to support.
4. Handle these errors: `404 not_found` (unknown or wrong token, same response on purpose),
   `409 email_locked`, `409 checkout_already_started`, `410 checkout_window_closed`, `429`, `502`, `503`.

Do not add a shared secret. The decision is recorded in the main doc.

## Website behaviour the app can rely on

- `/bravo/activate` without a valid order handoff shows only a generic "not available" page. It
  redirects to `/bravo` when `?order=` is missing.
- The public marketing page opens an explanation modal. It does not link to the checkout route.
- The status response includes `email` (masked), `emailOnFile`, and `checkoutExpired`. The full email
  is never returned.
- Rate limits: 20 creates per minute per IP, 20 checkouts per minute per IP, 120 status polls per minute.
  These are in-memory per instance, so they are approximate.

## Open items

- Confirm the app sends `email` only when a saved email exists, and does not send amount fields.
- Confirm the browser opens within the 30-minute window (see point 2).
- Decide whether to add a per-app credential later. That needs a change in the app build.
- Run a Preview build of the website before merging (the sandbox could not fetch Google Fonts).
- Apply migration `0003` on Turso before deploying the new website code.

## Paystack callback (direct app flow)

The app creates an order with `POST /api/bravo/orders`, calls `POST /api/bravo/orders/{ref}/checkout` with the
bearer status token, and opens the Paystack URL directly. It never visits `/bravo/activate`.

The Paystack callback is `/bravo/activate/status?order={ref}`. It contains no token. Without a status token saved
in this browser's `sessionStorage`, the page shows only a generic message: "Payment is being confirmed. Return to
Bravo CBT. Your activation key will be emailed to you." It shows no order reference, product, or key, and makes no
API call. A 404 from the status API gets the same generic view.

With a saved token (the in-browser flow from `/bravo/activate`), the status page polls and shows the order as before.
The app activates by polling and the key is also emailed. Pricing, Paystack verification, fulfilment, rate limits,
and the 30-minute checkout-start window are unchanged.
