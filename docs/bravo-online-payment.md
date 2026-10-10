# Bravo CBT online activation (Paystack + Turso + Resend)

Status: **website side implemented and tested locally. Not yet live.** Live Turso, Paystack, and Resend
credentials are not configured, so no end-to-end payment has been run. The Bravo desktop app
side is **not implemented in this repository** (see [App-side work](#app-side-work-still-needed-in-the-bravo-repo)).

## Flow

```
Bravo app ──POST /api/bravo/orders──────────────▶ website  (creates pending order, returns orderRef + statusToken)
Bravo app ──opens browser──▶ /bravo/activate?order=REF#t=TOKEN
Browser   ──POST /api/bravo/orders/REF/checkout─▶ website  (Paystack initialize, amount from server)
Browser   ──redirect──▶ Paystack hosted checkout (card or bank transfer)
Paystack  ──POST /api/webhooks/paystack────────▶ website  (HMAC-SHA512 over raw body)
                                                   │ verify transaction with Paystack API (server-to-server)
                                                   │ check reference, status=success, NGN, amount, email
                                                   │ sign key (Bravo format), store once in Turso
                                                   └ email key via Resend (idempotent)
Bravo app ──GET /api/bravo/orders/REF (Bearer token)──▶ website  (returns key only when fulfilled)
Browser   ──/bravo/activate/status──▶ shows key only after the same verified state
```

The browser return from Paystack never issues a key. Only a server-verified transaction does.

## API contract (for the Bravo app)

Base URL: `https://www.edumaxsolutions.com.ng` (Production) or the Preview URL (testing).
All responses are `application/json` with `Cache-Control: no-store`.

### 1. Create a pending order

`POST /api/bravo/orders`

```json
{ "productId": "BCBT-YDR9-G5WQ-0860", "plan": "first", "email": "optional@example.com" }
```

`plan` is `first` (New Activation, ₦4,000) or `renewal` (₦3,000). Any `amount`, `currency`, or `status` sent by the
client is **ignored**. Prices are server-side only.

`201`:
```json
{
  "orderRef": "BCBT_9FF6D2E87A02FF6A342379AA",
  "statusToken": "43-character-secret",
  "status": "pending_payment",
  "productId": "BCBT-YDR9-G5WQ-0860",
  "plan": "first",
  "amountNaira": 4000,
  "currency": "NGN",
  "createdAt": "2026-10-10T12:00:00.000Z"
}
```

Store `orderRef` and `statusToken` together. **The `statusToken` is the only way to read this order.** It is shown once.
The server keeps only its hash.

### 2. Open the checkout page

Open the default browser at:

```
https://www.edumaxsolutions.com.ng/bravo/activate?order=<orderRef>#t=<statusToken>
```

The token is in the URL **fragment**, so it is not sent to the web server or written to logs. The page stores it in
this tab's `sessionStorage`, then removes it from the address bar. The page confirms the Product ID and plan, asks for an email,
starts checkout, and redirects to Paystack.

Optional deep link without an order (the buyer enters the email and the page creates the order):

```
https://www.edumaxsolutions.com.ng/bravo/activate?productId=BCBT-YDR9-G5WQ-0860&plan=first
```

### 3. Poll the exact order

`GET /api/bravo/orders/{orderRef}` with header `Authorization: Bearer {statusToken}`

`200`:
```json
{
  "orderRef": "BCBT_...",
  "status": "pending_payment | paid | fulfilled | needs_review",
  "productId": "BCBT-YDR9-G5WQ-0860",
  "plan": "first",
  "amountNaira": 4000,
  "currency": "NGN",
  "email": "pa***@example.com",
  "createdAt": "...",
  "paidAt": null,
  "emailSent": false,
  "activationKey": null,
  "issuedAt": null,
  "message": "Waiting for payment confirmation."
}
```

- `activationKey` is **non-null only when `status` is `fulfilled`**. Verify it offline with the committed public key before you activate.
- `paid` means payment is verified but the key is still being prepared. Keep polling.
- `needs_review` means a mismatch was detected. Stop, and show the order reference to support. Do not retry.
- Desktop app: poll every 5 seconds, back off on `429` and `5xx`, and stop after about 30 minutes.
- Website status page (`/bravo/activate/status`): polls every 4 seconds and stops after 15 minutes. It only shows the key once the order is `fulfilled`.

Errors (all JSON `{ "error": "...", "message": "..." }`):

| HTTP | `error` | Meaning |
|---|---|---|
| 400 | `invalid_product_id`, `invalid_plan`, `invalid_email`, `invalid_body`, `email_required` | Bad input |
| 404 | `not_found` | Unknown order **or** wrong token (indistinguishable on purpose) |
| 409 | `order_not_payable`, `checkout_already_started` | Order already paid, or email changed after checkout |
| 429 | `rate_limited` | Slow down |
| 502 | `payment_provider_error` | Paystack unavailable. Retry later |
| 503 | `not_configured` | Server env vars missing |

Product ID alone never grants access to an order.

### 4. Paystack webhook (not called by the app)

`POST /api/webhooks/paystack`. Configure in the Paystack dashboard. See [Webhook URLs](#webhook-urls).

## Security properties

- Prices live only in `src/lib/bravo/pricing.ts` and are pinned by a SQL `CHECK` constraint per plan.
- Webhook signature: HMAC-SHA512 of the **raw** body, compared in constant time. Bad signatures return 401 and touch nothing.
- Fulfilment requires a **Paystack verify API** response with `status=success`, `currency=NGN`, `amount` equal to the order amount, the same `reference`, and (when present) the same customer email. Any mismatch moves the order to `needs_review` and issues no key. The webhook body is never trusted for amount.
- Idempotency: `bravo_orders.order_ref` is the primary key, `paystack_transaction_id` is unique (one transaction, one order), `bravo_issued_keys.order_ref` is the primary key (one key per order), and key strings are unique. Key insertion uses `INSERT OR IGNORE`, and the stored key is the only one ever displayed or emailed.
- Webhook responses: 401 for a bad signature, 400 for bad JSON, 500 when the payment is verified but the key cannot be issued yet or processing fails (Paystack retries, and the key is issued later without a second charge), and 200 otherwise (including ignored events and unknown references).
- Status tokens: 256-bit random, stored as SHA-256 only, compared in constant time, sent as `Authorization: Bearer`.
- Keys are signed by the server only. The private key is never in the repo, the browser, or logs.
- `PAYSTACK_SECRET_KEY` is validated against `VERCEL_ENV`: Production refuses `sk_test_`, Preview refuses `sk_live_`.
- Provider error details are logged, never returned to the browser.

## Activation key signer

Keys use the format in the Bravo app's `shared/license-core.js` (ECDSA P-256 over a 20-byte payload, base32, `BCBTK1-` prefix).
A copy is vendored at `src/lib/bravo/vendor/license-core.js` (verbatim from `eduvibe/bravo` main, commit `7feb3ca`), with types in `license-core.d.ts`.

`createLicenseCoreSigner` (in `src/lib/bravo/activation-key.ts`) signs each key and then **verifies it against the committed public key** before returning it. A wrong private key therefore cannot reach a buyer.

**Edition per order.** `BRAVO_EDITION_YEAR` is read when an order is created and stored on that order (`bravo_orders.edition_year`, migration `0002`). The key is signed with the order's stored edition, so changing the variable later never changes keys for orders already placed. Order creation returns `503 not_configured` while the variable is unset. Keys are issued only when `BRAVO_ACTIVATION_PRIVATE_KEY` is set.

**Editions.** The edition is the year of the app build a key unlocks. The app decides renewal versus new activation from the device, not from the key. When a new edition ships, change `BRAVO_EDITION_YEAR` before the first sale of that edition. Mock tests and question edits within the year do not need a new edition year.

Current defaults, which are product decisions and should be confirmed:
- Bundle: `BOTH` (3) for every order. Orders do not carry a bundle yet.
- Expiry: lifetime (`expiresAt = 0`), `flags = 1`. Keys do not expire.

The committed public key matches the key pair from the Bravo repo (checked against the PEM supplied for this work).

## Environment variables

| Name | Scope | Preview | Production | Notes |
|---|---|---|---|---|
| `PAYSTACK_SECRET_KEY` | server | `sk_test_…` | `sk_live_…` | Mark as Sensitive in Vercel |
| `TURSO_DATABASE_URL` | server | Preview DB `libsql://…` | Prod DB `libsql://…` | Separate databases |
| `TURSO_AUTH_TOKEN` | server | token for Preview DB | token for Prod DB | Sensitive |
| `RESEND_API_KEY` | server | key | key | Sensitive |
| `EMAIL_FROM` | server | `Bravo CBT <no-reply@edumaxsolutions.ng>` | same | Domain must be verified in Resend |
| `BRAVO_ACTIVATION_PRIVATE_KEY` | server | **leave unset** (see below) | production PKCS#8 PEM | Sensitive. Must match the committed public key |
| `BRAVO_EDITION_YEAR` | server | `2026` (current edition) | same | Four-digit year recorded on each new order. Order creation fails while unset. Change it when a new edition ships |
| `BRAVO_SITE_URL` | server | Preview origin | `https://www.edumaxsolutions.com.ng` | Used in Paystack callback URL |

No variable here uses the `NEXT_PUBLIC_` prefix. Nothing is committed to Git. `.env.example` lists the names with empty values.

**Preview and the signing key.** A Preview deployment accepts test payments from anyone who can reach its URL. If it had the
production signing key, a test-mode payment could mint a valid activation key. Leave `BRAVO_ACTIVATION_PRIVATE_KEY` unset in Preview.
Checkout and payment verification still work there, and keys fail closed (500, retry) until the signer is wired.

## Webhook URLs

- Production: `https://www.edumaxsolutions.com.ng/api/webhooks/paystack`, configured with the **live** key in the Paystack live dashboard.
- Preview (test mode): `https://<preview-host>/api/webhooks/paystack`, configured in the Paystack **test** dashboard. Use a stable branch alias, since preview hostnames change.

## Database setup

1. Create two Turso databases, one for Preview and one for Production (for example `edumax-bravo-preview` and `edumax-bravo`), and create an auth token for each.
2. Apply the migration from a trusted machine. Do not run it in CI with production credentials unless you need to.

   ```bash
   TURSO_DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… npm run db:migrate
   ```

   Migrations live in `db/migrations/`. The runner records applied files in `schema_migrations`, and every statement is idempotent.

## Operations notes

- A `needs_review` order is intentionally blocked. Resolve it by hand, then update the row, after checking Paystack.
- An email failure leaves `email_status = 'failed'`. The key is still stored and shown on the status page. Re-sending is a manual step for now.
- Rate limits use in-memory counters, so they are per serverless instance. Use a shared limiter (for example Upstash or Vercel WAF rules) before heavy traffic.
- Pending orders are never deleted. A cleanup job can be added later.

## Tests

```bash
npm test              # vitest: 61 tests against an in-memory libSQL DB using the real migration
npm run typecheck
npm run lint          # 2 pre-existing errors in src/components/sections/bravo/* remain
npm run build
```

Covered: invalid and tampered webhook signatures, amount/currency/reference/email mismatches, transaction reuse across orders,
webhook retries, concurrent fulfilment, fail-closed key issuance and retry, email failure, protected status and key retrieval,
server-side pricing, DB constraints, and the route handlers end to end.

**Not covered yet (requires credentials):** real Turso, real Paystack test charge, real Resend delivery.

## App-side work still needed in the Bravo repo

1. Vendor `shared/license-core.js` and `vendor/keygen.mjs` mapping into the website (see above). Required before any key can be issued.
2. In the Pay Online flow: `POST /api/bravo/orders`, persist `orderRef` and `statusToken` securely (for example Electron `safeStorage`, or the `%APPDATA%` install file with restricted permissions), open `…/bravo/activate?order=…#t=…` in the system browser.
3. Poll `GET /api/bravo/orders/{orderRef}` on the schedule above. When `activationKey` appears, verify it offline with the committed public key, then activate, exactly like a pasted key.
4. Handle `needs_review` and timeout states in the UI. Store nothing else.
5. Replace `server/web.js` / JSON order storage in the steering doc (`.kiro/steering/bravo-cbt-backend.md`), which still describes the older prototype.
