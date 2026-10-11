# Bravo CBT online activation (Paystack + Turso + Resend)

Status: **website side implemented and tested locally. Not yet live.** Live Turso, Paystack, and Resend
credentials are not configured, so no end-to-end payment has been run. The Bravo desktop app
side is **not implemented in this repository** (see [App-side work](#app-side-work-still-needed-in-the-bravo-repo)).

## Flow

```
Bravo app ──POST /api/bravo/orders──────────────▶ website  (creates pending order, returns orderRef + statusToken)
Bravo app ──opens browser──▶ /bravo/activate?order=REF#t=TOKEN   (protected: nothing shown without a valid token)
Browser   ──GET /api/bravo/orders/REF (Bearer)──▶ website  (Product ID, plan, price, emailOnFile: masked email only)
Browser   ──POST /api/bravo/orders/REF/checkout─▶ website  (Paystack initialize; saved email used server-side,
                                                           or the buyer's email when the app sent none)
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

`plan` is `first` (New Activation, ₦4,000) or `renewal` (₦3,000). Prices, currency, edition and status are server-side only.
Sending `amount`, `amountKobo`, `currency`, `status`, `editionYear`, `token`, or any other field that sets a server-owned value
is **rejected** with `400 authoritative_field_rejected`. Unrelated extra fields are ignored.

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
this tab's `sessionStorage`, then removes it from the address bar. The page loads the order with the token, shows the
Product ID, plan, and server price, and offers Pay Online and Bank Transfer.

- **Saved email (sent by the app):** Pay Online is one click. The browser never receives the full email, and the server
  uses the stored address for Paystack.
- **No saved email:** the page asks the buyer for an email once. The server stores it before Paystack starts. Until then,
  the buyer can correct it. After Paystack starts, the email is locked.
- **Without a valid token,** the page shows only instructions to start from the Bravo CBT app. It has no order data,
  no bank details, and no payment form. It is marked `noindex`.
- **The website no longer creates orders.** There is no public Product ID form or deep link. Orders come only from the app.
- **Checkout-start window: 30 minutes from order creation** (`CHECKOUT_WINDOW_MINUTES` in `src/lib/bravo/orders.ts`).
  The window limits only **starting or restarting** checkout: creating a new Paystack transaction, or changing the buyer's
  email before one exists. After it, checkout returns `410 checkout_window_closed` with a buyer-facing message, and the status
  shows `checkoutExpired: true`.
  - It **never rejects a Paystack transaction that was already started.** That order keeps its link. If Paystack confirms
    payment, the webhook or poll reconciliation fulfils it, even after the window.
  - Because the window counts from creation, the app must open the browser straight after `POST /api/bravo/orders`.
    A buyer who waits more than 30 minutes before opening the link gets the closed-window message and must start a new order.

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
  "emailOnFile": true,
  "checkoutExpired": false,
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
| 400 | `authoritative_field_rejected` | The body tries to set price, currency, edition, status, token, or (at checkout) Product ID or plan |
| 404 | `not_found` | Unknown order **or** wrong token (indistinguishable on purpose) |
| 409 | `order_not_payable` | Order already paid or fulfilled |
| 409 | `email_locked` | A different email was sent for an order whose email came from the app, or whose email was locked by checkout |
| 409 | `checkout_already_started` | Paystack already started with another email |
| 410 | `checkout_window_closed` | The 30-minute checkout-start window has closed and no Paystack checkout was started. Starting a new order is required. A payment already started on Paystack is still processed |
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
- Website checkout is reachable only with a valid handoff token. The page renders no order data without one. Missing, malformed,
  wrong, and other-order tokens all return the same `404`.
- Email privacy: the browser receives a masked email (`pa***@example.com`) and `emailOnFile`. It never receives the full
  address. The server initialises Paystack with the stored address.
- Email source: `bravo_orders.email_source` is `creation` (from the app, locked) or `checkout` (typed by the buyer, changeable
  until Paystack starts). Conditional SQL updates enforce this, so a race cannot overwrite an app-supplied email.
- Payment completion is still driven only by the Paystack verify API, through the webhook or a poll reconcile. The browser return
  and the handoff token never issue a key. An order stuck in `paid` after a crash is completed from the stored key row.
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
- Pending orders are never deleted. A cleanup job can be added later. Expired pending orders are harmless: they cannot start a new checkout.
- **Order creation (`POST /api/bravo/orders`) is still open at the HTTP layer,** because the app has no credential to present.
  Protection comes from the rules above: the key is issued only after a verified payment, the token is unguessable, orders expire,
  and creation is rate limited. A per-app credential would be a further hardening step, but it requires an app change.
- **No shared secret is added to the app.** Order creation is not authenticated by a shared key. The Bravo app is a
  distributed desktop build, so any key in it can be extracted, and the app cannot be changed in this session. The controls
  are the ones below.

### Rate limits and abuse monitoring

| Route | Limit (per client IP, per minute) | Signal on breach |
|---|---|---|
| `POST /api/bravo/orders` | 20 | `rate_limited`, `route: create` |
| `POST /api/bravo/orders/{ref}/checkout` | 20 | `rate_limited`, `route: checkout` |
| `GET /api/bravo/orders/{ref}` | 120 | 429 only (polling) |

- Limits are **in memory per serverless instance**, so they are approximate. A shared limiter (Upstash, or Vercel WAF rules)
  is the stronger control and is still a recommended follow-up.
- Signals are single JSON log lines, for example `{"bravo_signal":"rate_limited","route":"create","ip_hash":"…"}`. IP addresses
  are hashed (12 hex characters of SHA-256). Tokens, full emails, and raw IPs are never logged. Other signals: `checkout_window_closed`.
- Search the Vercel runtime logs for `bravo_signal`. Alert on a burst of `rate_limited` from one `ip_hash`.
- Spot-check creation abuse in Turso. The count of unpaid orders with no checkout started should stay low:
  `SELECT COUNT(*) FROM bravo_orders WHERE status = 'pending_payment' AND authorization_url IS NULL AND created_at > datetime('now','-1 day');`
  Pending orders are never deleted. Expired ones cannot be paid through checkout, so they cost storage only.

- **Migration `0003` must be applied before the new code goes live** (`npm run db:migrate`). It adds `bravo_orders.email_source`.

## Tests

```bash
npm test              # vitest: 93 tests against an in-memory libSQL DB using the real migrations
npm run typecheck
npm run lint          # passes with --max-warnings=0
npm run build
```

Covered: invalid and tampered webhook signatures, amount/currency/reference/email mismatches, transaction reuse across orders,
webhook retries, concurrent fulfilment, fail-closed key issuance and retry, email failure, protected status and key retrieval,
server-side pricing, DB constraints, and the route handlers end to end.

**Not covered yet (requires credentials):** real Turso, real Paystack test charge, real Resend delivery.

## App-side work still needed in the Bravo repo

1. Vendor `shared/license-core.js` and `vendor/keygen.mjs` mapping into the website (see above). Required before any key can be issued.
2. In the Pay Online flow: `POST /api/bravo/orders` (send `productId`, `plan`, and `email` if the candidate has a saved one; do not send amounts), persist `orderRef` and `statusToken` securely (for example Electron `safeStorage`, or the `%APPDATA%` install file with restricted permissions), open `…/bravo/activate?order=…#t=…` in the system browser.
3. Poll `GET /api/bravo/orders/{orderRef}` on the schedule above. When `activationKey` appears, verify it offline with the committed public key, then activate, exactly like a pasted key.
4. Handle `needs_review` and timeout states in the UI. Store nothing else.
5. Replace `server/web.js` / JSON order storage in the steering doc (`.kiro/steering/bravo-cbt-backend.md`), which still describes the older prototype.
