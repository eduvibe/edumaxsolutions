---
inclusion: always
---

# Bravo CBT — Backend & Operations Reference

This file documents the server infrastructure, Paystack payment flow, update mechanism, pricing rules, and activation key system for Bravo CBT. Use this context whenever working on `/bravo/activate`, the payment API routes, or any pricing/activation-related UI.

---

## Pricing

Defined in `data/store-config.json`:

| Type | Price | When |
|---|---|---|
| First activation | ₦4,000 | New device, never activated |
| Renewal / Family install | ₦3,000 | Edition renewal on same device, OR a family member installing on their own PC |

The `/bravo/activate` pay page must offer three options:
1. **New activation** — ₦4,000
2. **Edition renewal** (existing customer, same device) — ₦3,000
3. **Family member's new install** — ₦3,000

The `POST /api/orders` endpoint uses a `kind` field to distinguish these and charge accordingly.

Manual key generation (bank transfer orders):
```bash
node vendor/keygen.mjs --product … --edition …
```

---

## Payment Server

The seller runs `server/web.js` alongside the website:

```bash
PAYSTACK_SECRET_KEY=sk_live_… \
RESEND_API_KEY=re_… \
EMAIL_FROM="Bravo CBT <no-reply@edumaxsolutions.ng>" \
MOCK_ADMIN_TOKEN=… \
node server/web.js   # default port 4180
```

### Online Self-Payment Flow (end-to-end, no third-party app)

1. In the app the buyer presses **Pay online — ₦4,000** (Product ID attached automatically) → payment page opens at `/pay`.
2. They pay with **card or bank transfer** via Paystack checkout.
3. Paystack calls `POST /api/webhooks/paystack` (HMAC-verified) → server signs the activation key with the vendor key and stores the paid order.
4. The activation key is **displayed on the payment page and emailed** to the buyer (Resend API; falls back to console log if no API key is set).
5. The app **polls `/api/orders/status`** — picks up the key and **activates automatically**. Manual paste also auto-activates.

### Dev / Local Mode (no Paystack key configured)

The payment page shows a **"Confirm payment (dev mode)"** button that simulates step 3 instantly — fully testable in the browser preview without a live Paystack key.

Set `apiBaseUrl` and `websiteUrl` in `data/store-config.json` to the production origin before going live.

---

## App Updates

### Build & Upload

1. Build: `npm run dist` → `dist/BravoCBT-Setup-<version>.exe`
2. Upload to `https://edumaxsolutions.ng/updates/`:
   - The installer `.exe`
   - A `version.json` feed:
     ```json
     {
       "version": "1.1.0",
       "url": "https://edumaxsolutions.ng/updates/BravoCBT-Setup-1.1.0.exe",
       "notes": "Adds 2026 questions."
     }
     ```
3. Set `data/store-config.json → updateFeedUrl` to point at that `version.json`.

### How the App Receives Updates

- The app checks the feed **silently at startup** and via **Settings → Updates → Check for updates**.
- It opens the download link in the browser; the user runs the new installer over the existing one.
- Per-user data (`install.json`, licence, results) lives in `%APPDATA%` — untouched by the installer. **Product ID and activation survive every upgrade.**
- Optional hardening: code-sign the `.exe`. `electron-updater` can be added later for fully in-app downloads — the feed contract above remains the same.

### New Edition (new questions, new year)

Students receive new questions through the **app update flow** — same installer, run over the old one. Licence and results are preserved. No re-activation required unless the edition itself changes.

---

## Centralised Mock Exams

The seller publishes a challenge; every activated installation builds the same paper locally (fixed seed + licensed question bank) and syncs its score.

### Create a Mock (admin token required)

```bash
curl -X POST https://edumaxsolutions.ng/api/mock/create \
  -H 'x-admin-token: …' \
  -H 'content-type: application/json' \
  -d '{
    "examId": "jamb",
    "title": "July Nationwide Mock",
    "durationMin": 120,
    "expiresInMin": 720
  }'
```

### Student Experience

- Students see a **CENTRAL MOCK LIVE** banner on the dashboard.
- They can take it until it expires.
- On submit the score is `POST`-ed with the activation key — the server verifies the key **offline-style with the committed public key** before accepting, so only activated installs count.

### Leaderboard

`GET /api/mock/:id/leaderboard` — returns names and masked Product IDs only. Powers the live Leaderboard screen in the app.

---

## Activation Key System

- Keys are signed with the vendor private key (`vendor/keygen.mjs`).
- The app verifies locally using the committed public key — no internet needed for verification.
- The server verifies the same way before accepting leaderboard scores.
- Key generation command: `node vendor/keygen.mjs --product … --edition …`

---

## Website Integration Checklist (pending)

- [ ] Deploy `server/web.js` alongside website
- [ ] Set `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `MOCK_ADMIN_TOKEN` env vars
- [ ] Update `data/store-config.json` — set `apiBaseUrl` and `websiteUrl` to production origin
- [ ] Upload initial installer + `version.json` to `/updates/`
- [ ] Enable the "Pay Online" button on `/bravo/activate` (currently disabled — Paystack not yet wired)
- [ ] Enable the "Download App" button on `/bravo` hero and CTA (currently disabled — awaiting final build)
- [ ] Add the third plan option ("Family member's new install" at ₦3,000) to the activate page
