/**
 * Bravo CBT web API — self-payment activation + centralized mock exams.
 * Dependency-free Node (fetch + WebCrypto are built in).
 *
 * Endpoints (all JSON unless noted):
 *   POST /api/orders                 {productId,email,name?,kind?,bundle?} → pay page / checkout
 *   GET  /api/orders/status?reference= | ?productId=   → {status, activationKey?}
 *   POST /api/webhooks/paystack      Paystack webhook (HMAC verified) → fulfils key + email
 *   POST /api/dev/pay?reference=     DEV ONLY (no Paystack key configured)
 *   GET  /pay                        HTML pay page (created order form / status + key display)
 *   GET  /api/mock/current           live centralized mock (or {mock:null})
 *   POST /api/mock/create            x-admin-token header, creates challenge (fixed seed)
 *   POST /api/mock/:id/score         {productId,activationKey,displayName,correct,total}
 *   GET  /api/mock/:id/leaderboard   top scores
 *
 * Fulfilment signs a real activation key with the vendor private key (same
 * shared/license-core.js the desktop app verifies offline).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { signActivationKey, verifyActivationKey, normalizeProductId, BUNDLE } from '../shared/license-core.js';

const BUNDLE_NUM = { jamb: BUNDLE.JAMB, waec: BUNDLE.WAEC, both: BUNDLE.BOTH, 1: 1, 2: 2, 3: 3 };

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, file);
}
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    // The desktop app (origin: its bundled local server) and any hosted page
    // must be able to read mock/announcement responses from this service.
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}
async function readBody(req, limit = 64 * 1024) {
  let body = '', bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > limit) throw Object.assign(new Error('Payload too large'), { status: 413 });
    body += chunk;
  }
  return body || '{}';
}

export function createApi(opts) {
  const {
    store,                     // data/store-config.json object
    announceFile,              // optional: data/central-mock.json (bundled into the app)
    privateKeyPem,             // vendor private key (PEM)
    publicKeyPem,              // shared/public-key.pem (for mock score verification)
    dataDir,                   // e.g. server/data
    adminToken = process.env.MOCK_ADMIN_TOKEN || '',
    paystackSecret = process.env.PAYSTACK_SECRET_KEY || '',
    emailApiKey = process.env.RESEND_API_KEY || '',
    emailFrom = process.env.EMAIL_FROM || 'Bravo CBT <no-reply@yourwebsite.com>',
    devMode = !paystackSecret, // serve the dev confirm endpoint when Paystack is not configured
  } = opts;

  const ordersFile = path.join(dataDir, 'orders.json');
  const mocksFile = path.join(dataDir, 'mocks.json');

  const prices = () => {
    const s = typeof store === 'function' ? store() : (store || {});
    return {
      newPrice: Number(s.priceNaira || 4000),
      renewalPrice: Number(s.renewalPriceNaira || 3000),
      editionYear: Number(s.editionYear || 2025),
    };
  };

  function loadOrders() { return readJson(ordersFile, {}); }
  function saveOrders(o) { writeJson(ordersFile, o); }
  function loadMocks() { return readJson(mocksFile, { current: null, scores: {} }); }
  function saveMocks(m) { writeJson(mocksFile, m); }

  async function sendKeyEmail(to, { productId, activationKey, editionYear, price }) {
    const text = [
      'Your Bravo CBT activation key',
      '',
      `Product ID: ${productId}`,
      `Activation key: ${activationKey}`,
      `Edition: ${editionYear}`,
      `Paid: ₦${price}`,
      '',
      'Open Bravo CBT, paste the key on the activation screen and press Activate.',
      'The key is bound to this installation\'s Product ID and works offline.',
    ].join('\n');
    if (emailApiKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${emailApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: emailFrom, to: [to], subject: 'Your Bravo CBT activation key', text }),
        });
        return true;
      } catch (e) {
        console.error('[api] email send failed:', e.message);
        return false;
      }
    }
    console.log(`[api] EMAIL (dev — configure RESEND_API_KEY to send for real)\n  to: ${to}\n${text.split('\n').map((l) => '  ' + l).join('\n')}`);
    return false;
  }

  async function fulfilOrder(order) {
    if (order.status === 'paid') return order;
    const { editionYear } = prices();
    const activationKey = await signActivationKey({
      privateKeyPem,
      productId: order.productId,
      bundle: BUNDLE_NUM[order.bundle] || BUNDLE.BOTH,
      editionYear: order.editionYear || editionYear,
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: 0,
      flags: 1,
    });
    order.status = 'paid';
    order.paidAt = Date.now();
    order.activationKey = activationKey;
    const orders = loadOrders();
    orders[order.reference] = order;
    saveOrders(orders);
    await sendKeyEmail(order.email, {
      productId: order.productId, activationKey,
      editionYear: order.editionYear || editionYear, price: order.amount,
    });
    return order;
  }

  async function paystackInitialize({ reference, email, amount }) {
    const r = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amount * 100, currency: 'NGN', email, reference }),
    });
    const j = await r.json();
    if (!j.status || !j.data?.authorization_url) throw new Error(j.message || 'Paystack initialize failed');
    return j.data.authorization_url;
  }

  function verifyPaystackSignature(rawBody, header) {
    if (!paystackSecret || !header) return false;
    const expected = crypto.createHmac('sha512', paystackSecret).update(rawBody).digest('hex');
    try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(header))); } catch { return false; }
  }

  async function sendEmailSafe(...args) {
    try { return await sendKeyEmail(...args); } catch (e) { console.error('[api] email error', e.message); return false; }
  }

  // ---------------------------------------------------------------- handlers
  async function createOrder(req, res, url) {
    const d = JSON.parse(await readBody(req));
    const productId = normalizeProductId(d.productId || '');
    if (!productId) return sendJson(res, 400, { error: 'Invalid Product ID' });
    const email = String(d.email || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return sendJson(res, 400, { error: 'Valid email required' });
    const kind = ['new', 'renewal', 'family'].includes(d.kind) ? d.kind : 'new';
    const { newPrice, renewalPrice, editionYear } = prices();
    const amount = kind === 'new' ? newPrice : renewalPrice;
    const reference = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const order = {
      reference, productId, email,
      name: String(d.name || '').slice(0, 60),
      kind, amount,
      bundle: ['jamb', 'waec', 'both'].includes(d.bundle) ? d.bundle : 'both',
      editionYear: Number(d.editionYear) || editionYear,
      status: 'pending',
      createdAt: Date.now(),
    };
    const orders = loadOrders();
    orders[reference] = order;
    saveOrders(orders);

    let authorizationUrl;
    if (paystackSecret) {
      authorizationUrl = await paystackInitialize({ reference, email, amount });
    } else {
      const origin = url.origin || 'http://localhost';
      authorizationUrl = `${origin}/pay/confirm?reference=${reference}`;
    }
    sendJson(res, 200, { reference, authorizationUrl, amount, kind, status: 'pending' });
  }

  async function orderStatus(req, res, url) {
    const reference = url.searchParams.get('reference');
    const productId = url.searchParams.get('productId');
    const orders = loadOrders();
    let order = reference ? orders[reference] : null;
    if (!order && productId) {
      const matches = Object.values(orders)
        .filter((o) => o.productId === productId)
        .sort((a, b) => b.createdAt - a.createdAt);
      order = matches[0] || null;
    }
    if (!order) return sendJson(res, 404, { status: 'none' });
    const out = { status: order.status, reference: order.reference, kind: order.kind, amount: order.amount };
    if (order.status === 'paid' && order.activationKey) out.activationKey = order.activationKey;
    sendJson(res, 200, out);
  }

  async function webhook(req, res, url) {
    const raw = await readBody(req, 256 * 1024);
    if (!verifyPaystackSignature(raw, req.headers['x-paystack-signature'])) {
      return sendJson(res, 401, { error: 'Invalid signature' });
    }
    let event;
    try { event = JSON.parse(raw); } catch { return sendJson(res, 400, { error: 'bad json' }); }
    if (event.event === 'charge.success' && event.data?.reference) {
      const orders = loadOrders();
      const order = orders[event.data.reference];
      if (order && order.status !== 'paid') await fulfilOrder(order);
    }
    sendJson(res, 200, { received: true });
  }

  async function devPay(req, res, url) {
    if (!devMode) return sendJson(res, 404, { error: 'Not found' });
    const reference = url.searchParams.get('reference');
    const orders = loadOrders();
    const order = reference ? orders[reference] : null;
    if (!order) return sendJson(res, 404, { error: 'Unknown reference' });
    await fulfilOrder(order);
    res.writeHead(302, { Location: `/pay?reference=${reference}` });
    res.end();
  }

  // -------------------------------------------------------------- mock
  async function mockCreate(req, res) {
    const token = req.headers['x-admin-token'] || '';
    if (!adminToken || token !== adminToken) return sendJson(res, 403, { error: 'Admin token required' });
    const d = JSON.parse(await readBody(req));
    const examId = ['jamb', 'waec'].includes(d.examId) ? d.examId : 'jamb';
    const expiresInMin = Math.min(7 * 24 * 60, Math.max(5, Number(d.expiresInMin) || 120));
    // Optional schedule: startsAt in the future → students see the announcement
    // first, then the "Take it now" button once the window opens.
    let startsAt = null;
    if (d.startsAt) {
      const t = Date.parse(d.startsAt);
      if (Number.isFinite(t)) startsAt = t;
    }
    const baseTime = startsAt && startsAt > Date.now() ? startsAt : Date.now();
    const mock = {
      id: 'M' + Date.now().toString(36).toUpperCase(),
      title: String(d.title || `Central Mock — ${examId.toUpperCase()}`).slice(0, 80),
      examId,
      subjectIds: Array.isArray(d.subjectIds) && d.subjectIds.length ? d.subjectIds.slice(0, 10) : null,
      countPerSubject: Number(d.countPerSubject) || null,
      durationMin: Math.min(300, Math.max(5, Number(d.durationMin) || 180)),
      editionYear: Number(d.editionYear) || prices().editionYear,
      seed: Number(d.seed) || 20260901, // fixed seed → every student builds the same paper
      createdAt: Date.now(),
      startsAt,
      expiresAt: baseTime + expiresInMin * 60000,
    };
    const mocks = loadMocks();
    mocks.current = mock;
    mocks.scores[mock.id] = [];
    saveMocks(mocks);
    if (announceFile) {
      try { writeJson(announceFile, mock); } catch (e) { console.error('[api] announce write failed:', e.message); }
    }
    sendJson(res, 200, { mock });
  }

  function activeMock() {
    const mocks = loadMocks();
    const m = mocks.current;
    if (!m || m.expiresAt < Date.now()) return null;
    return m;
  }

  async function mockCurrent(req, res) {
    const m = activeMock();
    sendJson(res, 200, m ? { mock: publicMock(m) } : { mock: null });
  }
  function publicMock(m) {
    const { id, title, examId, subjectIds, countPerSubject, durationMin, editionYear, seed, expiresAt, startsAt } = m;
    return { id, title, examId, subjectIds, countPerSubject, durationMin, editionYear, seed, expiresAt, startsAt: startsAt || null };
  }

  async function mockEnd(req, res) {
    const token = req.headers['x-admin-token'] || '';
    if (!adminToken || token !== adminToken) return sendJson(res, 403, { error: 'Admin token required' });
    const mocks = loadMocks();
    if (!mocks.current || mocks.current.expiresAt < Date.now()) return sendJson(res, 404, { error: 'No active mock' });
    mocks.current.expiresAt = Date.now() - 1; // strictly past → activeMock() drops it immediately
    saveMocks(mocks);
    if (announceFile) { try { writeJson(announceFile, mocks.current); } catch { /* disk */ } }
    sendJson(res, 200, { ok: true });
  }

  async function mockScore(req, res, url) {
    const id = url.pathname.split('/')[3]; // /api/mock/:id/score
    const mocks = loadMocks();
    const m = mocks.current;
    if (!m || m.id !== id) return sendJson(res, 404, { error: 'Mock not found or ended' });
    const d = JSON.parse(await readBody(req));
    const productId = normalizeProductId(d.productId || '');
    if (!productId) return sendJson(res, 400, { error: 'Invalid Product ID' });
    const check = await verifyActivationKey({
      activationKey: d.activationKey || '', productId, publicKeyPem,
    });
    if (!check.ok) return sendJson(res, 403, { error: 'Activation key not valid for this Product ID' });
    const correct = Math.max(0, Number(d.correct) || 0);
    const total = Math.max(1, Number(d.total) || 1);
    const prof = (d.profile && typeof d.profile === 'object') ? d.profile : {};
    const row = {
      productId,
      displayName: String(prof.name || d.displayName || 'Candidate').slice(0, 40),
      state: String(prof.state || '').slice(0, 40),
      school: String(prof.school || '').slice(0, 80),
      phone: String(prof.phone || '').slice(0, 20),
      email: String(prof.email || '').slice(0, 80),
      correct, total,
      pct: Math.round((correct / total) * 100),
      submittedAt: Date.now(),
    };
    mocks.scores[m.id] = mocks.scores[m.id] || [];
    const i = mocks.scores[m.id].findIndex((r) => r.productId === productId);
    if (i >= 0) {
      if (correct > mocks.scores[m.id][i].correct) mocks.scores[m.id][i] = row;
    } else {
      mocks.scores[m.id].push(row);
    }
    saveMocks(mocks);
    const sorted = mocks.scores[m.id]
      .slice()
      .sort((a, b) => b.pct - a.pct || b.correct - a.correct || a.submittedAt - b.submittedAt);
    const rank = sorted.findIndex((r) => r.productId === productId) + 1;
    sendJson(res, 200, { ok: true, rank });
  }

  function leaderboardFor(id) {
    const mocks = loadMocks();
    return (mocks.scores[id] || [])
      .slice()
      .sort((a, b) => b.pct - a.pct || b.correct - a.correct || a.submittedAt - b.submittedAt)
      .map((r) => ({
        displayName: r.displayName,
        state: r.state || '', school: r.school || '',
        correct: r.correct, total: r.total, pct: r.pct,
        mask: r.productId.replace(/.(?=.{4})/g, '*'), // BCBT-••••-••••-XXXX
      }));
  }

  async function mockLeaderboard(req, res, url) {
    const id = url.pathname.split('/')[3];
    sendJson(res, 200, { id, top: leaderboardFor(id).slice(0, 50) });
  }

  // -------------------------------------------------------------- pay page
  function payPage(url) {
    const { newPrice, renewalPrice, editionYear } = prices();
    const productId = url.searchParams.get('productId') || '';
    const kind = url.searchParams.get('kind') || 'new';
    const reference = url.searchParams.get('reference') || '';
    const orders = loadOrders();
    const order = reference ? orders[reference] : null;
    const statusBlock = order
      ? (order.status === 'paid'
          ? `<div class="ok"><h2>Payment confirmed</h2>
               <p>Activation key for <b>${order.productId}</b>:</p>
               <pre class="key">${order.activationKey}</pre>
               <p>It has also been sent to <b>${order.email}</b>.<br>
               Open Bravo CBT (on that device) — the app detects the key automatically — or paste it and press Activate.</p></div>`
          : `<div class="pend">Order <b>${order.reference}</b> — ₦${order.amount} pending.
               ${devMode ? `<p><a class="btn" href="/pay/confirm?reference=${order.reference}">Confirm payment (dev mode)</a></p>` : ''}</div>`)
      : '';
    const formBlock = reference ? '' : `
      <form id="f">
        <label>Product ID<br><input name="productId" value="${productId}" placeholder="BCBT-XXXX-XXXX-XXXX" required></label>
        <label>Email (key is sent here)<br><input type="email" name="email" required></label>
        <label>Full name (optional)<br><input name="name"></label>
        <label>Payment type<br>
          <select name="kind">
            <option value="new" ${kind === 'new' ? 'selected' : ''}>New activation — ₦${newPrice}</option>
            <option value="renewal" ${kind === 'renewal' ? 'selected' : ''}>Existing customer: edition renewal — ₦${renewalPrice}</option>
            <option value="family" ${kind === 'family' ? 'selected' : ''}>Family member's new install — ₦${renewalPrice}</option>
          </select></label>
        <button class="btn" type="submit">Pay with card or transfer</button>
      </form>`;
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Bravo CBT — Pay & Activate</title>
      <style>body{font-family:Segoe UI,Arial,sans-serif;background:#eef4e2;margin:0;padding:30px;color:#22301f}
      .wrap{max-width:520px;margin:auto;background:#fff;border-radius:14px;padding:26px 28px;box-shadow:0 10px 30px rgba(27,94,32,.14)}
      h1{font-size:20px;margin:0 0 6px;color:#14532d}p{line-height:1.5}label{display:block;font-size:13px;font-weight:700;margin:14px 0 4px;color:#66795f}
      input,select{width:100%;padding:10px 12px;border:1.5px solid #c3d6b4;border-radius:9px;font-size:15px;box-sizing:border-box}
      .btn{display:inline-block;background:#2e7d32;color:#fff;border:0;border-radius:99px;padding:12px 26px;font-weight:700;font-size:15px;margin-top:18px;cursor:pointer;text-decoration:none}
      .ok{background:#e7f6e9;border:1px solid #b7e4bc;border-radius:10px;padding:14px 16px;margin-top:16px}
      .pend{background:#fff4e0;border:1px solid #ffd9a0;border-radius:10px;padding:14px 16px;margin-top:16px}
      .key{background:#12331d;color:#7dffab;padding:12px;border-radius:8px;word-break:break-all;font-size:13px}
      .note{font-size:12.5px;color:#66795f}</style></head>
      <body><div class="wrap">
        <h1>Bravo CBT — Activation (Edition ${editionYear})</h1>
        <p class="note">Card & bank transfer payments are processed securely. Your key is generated instantly and emailed to you.</p>
        ${statusBlock}${formBlock}
      </div>
      <script>
        const f = document.getElementById('f');
        if (f) f.addEventListener('submit', async (e) => {
          e.preventDefault();
          const d = Object.fromEntries(new FormData(f).entries());
          const r = await fetch('/api/orders', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(d)});
          const j = await r.json();
          if (j.error) { alert(j.error); return; }
          window.location = j.authorizationUrl;
        });
      </script></body></html>`;
  }

  // -------------------------------------------------------------- router
  return async function handleApi(req, res, url) {
    const p = url.pathname;
    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type, x-admin-token, x-paystack-signature',
          'Access-Control-Max-Age': '86400',
        });
        res.end();
        return true;
      }
      if (p === '/pay' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(payPage(url));
        return true;
      }
      if (p === '/pay/confirm' && req.method === 'GET') { await devPay(req, res, url); return true; }

      if (p === '/api/orders' && req.method === 'POST') { await createOrder(req, res, url); return true; }
      if (p === '/api/orders/status' && req.method === 'GET') { await orderStatus(req, res, url); return true; }
      if (p === '/api/webhooks/paystack' && req.method === 'POST') { await webhook(req, res, url); return true; }
      if (p === '/api/dev/pay' && req.method === 'POST') { await devPay(req, res, url); return true; }

      if (p === '/api/mock/current' && req.method === 'GET') { await mockCurrent(req, res); return true; }
      if (p === '/api/mock/create' && req.method === 'POST') { await mockCreate(req, res); return true; }
      if (p === '/api/mock/end' && req.method === 'POST') { await mockEnd(req, res); return true; }
      if (/^\/api\/mock\/[^/]+\/score$/.test(p) && req.method === 'POST') { await mockScore(req, res, url); return true; }
      if (/^\/api\/mock\/[^/]+\/leaderboard$/.test(p) && req.method === 'GET') { await mockLeaderboard(req, res, url); return true; }

      return false;
    } catch (e) {
      console.error('[api] error:', e && e.message);
      try { sendJson(res, e.status || 500, { error: String(e && e.message ? e.message : e) }); } catch { /* closed */ }
      return true;
    }
  };
}
