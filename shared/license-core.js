/**
 * Bravo CBT — offline license core (works in browser, Electron renderer and Node).
 *
 * Activation key layout (binary, little-endian):
 *   payload (20 bytes) || ECDSA-P256/SHA-256 signature (64 bytes, raw r||s) = 84 bytes
 *   encoded with Crockford base32 -> human-transmissible activation key.
 *
 * payload:
 *   0  u8   version (1)
 *   1  u8   examBundle  (1=JAMB, 2=WAEC, 3=BOTH)
 *   2  u16  editionYear (e.g. 2025  -> unlocks questions bankFromYear..editionYear)
 *   4  u32  productIdHash = first 4 bytes of SHA-256(productId ascii)
 *   8  u32  issuedAt   (unix seconds)
 *   12 u32  expiresAt  (unix seconds, 0 = lifetime)
 *   16 u32  flags      (bit0 = full activation)
 */

const B32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford (no I, L, O, U)
const B32_LOOKUP = (() => {
  const m = Object.create(null);
  for (let i = 0; i < B32_ALPHABET.length; i++) m[B32_ALPHABET[i]] = i;
  // Crockford aliases
  m['I'] = 1; m['L'] = 1; m['O'] = 0;
  return m;
})();

export const BUNDLE = Object.freeze({ JAMB: 1, WAEC: 2, BOTH: 3 });
export const BUNDLE_NAME = Object.freeze({ 1: 'JAMB', 2: 'WAEC', 3: 'JAMB + WAEC' });
export const KEY_VERSION = 1;
export const PRODUCT_ID_PREFIX = 'BCBT';
export const KEY_PREFIX = 'BCBTK1';

export function bytesToBase32(bytes) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32ToBytes(str) {
  const clean = String(str || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const v = B32_LOOKUP[ch];
    if (v === undefined) throw new Error('Bad base32 character: ' + ch);
    value = (value << 5) | v;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

/** Pretty product id: BCBT-XXXX-XXXX-XXXX */
export function formatProductId(raw12) {
  const s = String(raw12 || '').toUpperCase().replace(/[^0-9A-HJKMNP-TV-Z]/g, '');
  if (s.length !== 12) throw new Error('Product ID must be 12 characters');
  return `${PRODUCT_ID_PREFIX}-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export function normalizeProductId(input) {
  const raw = String(input || '').toUpperCase().replace(/[^0-9A-HJKMNP-TV-Z]/g, '');
  const body = raw.startsWith('BCBT') ? raw.slice(4) : raw;
  if (body.length !== 12) return null;
  try {
    return formatProductId(body);
  } catch {
    return null;
  }
}

/** User-facing activation keys are grouped for readability. */
export function formatActivationKey(base32Body) {
  const groups = base32Body.match(/.{1,5}/g) || [];
  return `${KEY_PREFIX}-${groups.join('-')}`;
}

export function normalizeActivationKey(input) {
  const raw = String(input || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const body = raw.startsWith(KEY_PREFIX) ? raw.slice(KEY_PREFIX.length) : raw;
  if (body.length < 40) return null;
  return { prefixOK: raw.startsWith(KEY_PREFIX), body };
}

export async function sha256Bytes(str) {
  const data = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(digest);
}

export async function productIdHashBytes(productId) {
  const h = await sha256Bytes(productId);
  return h.slice(0, 4);
}

export function packPayload(p) {
  const buf = new ArrayBuffer(20);
  const v = new DataView(buf);
  v.setUint8(0, p.version ?? KEY_VERSION);
  v.setUint8(1, p.bundle);
  v.setUint16(2, p.editionYear, true);
  const hash = p.productIdHash;
  if (!hash || hash.length !== 4) throw new Error('productIdHash required (4 bytes)');
  v.setUint8(4, hash[0]);
  v.setUint8(5, hash[1]);
  v.setUint8(6, hash[2]);
  v.setUint8(7, hash[3]);
  v.setUint32(8, p.issuedAt >>> 0, true);
  v.setUint32(12, (p.expiresAt || 0) >>> 0, true);
  v.setUint32(16, (p.flags ?? 1) >>> 0, true);
  return new Uint8Array(buf);
}

export function unpackPayload(bytes) {
  if (!bytes || bytes.length < 20) throw new Error('Payload too short');
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    version: v.getUint8(0),
    bundle: v.getUint8(1),
    editionYear: v.getUint16(2, true),
    productIdHash: bytes.slice(4, 8),
    issuedAt: v.getUint32(8, true),
    expiresAt: v.getUint32(12, true),
    flags: v.getUint32(16, true),
  };
}

function pemToBinary(pem) {
  const b64 = String(pem)
    .replace(/-----(BEGIN|END)[^-]+-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function importPublicKeyPem(pem) {
  return crypto.subtle.importKey(
    'spki',
    pemToBinary(pem).buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );
}

export async function importPrivateKeyPkcs8(pem) {
  return crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(pem).buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

/** Sign a payload and return the full activation key string (vendor side). */
export async function signActivationKey({ privateKeyPem, productId, bundle, editionYear, expiresAt = 0, flags = 1, issuedAt }) {
  const hash = await productIdHashBytes(productId);
  const payload = packPayload({
    version: KEY_VERSION,
    bundle,
    editionYear,
    productIdHash: hash,
    issuedAt: issuedAt ?? Math.floor(Date.now() / 1000),
    expiresAt,
    flags,
  });
  const key = await importPrivateKeyPkcs8(privateKeyPem);
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, payload)
  );
  const token = new Uint8Array(payload.length + sig.length);
  token.set(payload, 0);
  token.set(sig, payload.length);
  return formatActivationKey(bytesToBase32(token));
}

/**
 * Verify an activation key for THIS installation, fully offline.
 * @returns {Promise<{ok:boolean, reason?:string, payload?:object}>}
 */
export async function verifyActivationKey({ activationKey, productId, publicKeyPem, now = Math.floor(Date.now() / 1000) }) {
  try {
    const norm = normalizeActivationKey(activationKey);
    if (!norm) return { ok: false, reason: 'key_too_short' };
    if (!norm.prefixOK) return { ok: false, reason: 'bad_prefix' };

    let token;
    try {
      token = base32ToBytes(norm.body);
    } catch {
      return { ok: false, reason: 'bad_encoding' };
    }
    if (token.length !== 84) return { ok: false, reason: 'bad_length' };

    const payloadBytes = token.slice(0, 20);
    const sig = token.slice(20);
    let payload;
    try {
      payload = unpackPayload(payloadBytes);
    } catch {
      return { ok: false, reason: 'bad_payload' };
    }
    if (payload.version !== KEY_VERSION) return { ok: false, reason: 'bad_version' };

    const pub = await importPublicKeyPem(publicKeyPem);
    const validSig = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pub,
      sig,
      payloadBytes
    );
    if (!validSig) return { ok: false, reason: 'bad_signature' };

    const myHash = await productIdHashBytes(productId);
    if (
      myHash[0] !== payload.productIdHash[0] ||
      myHash[1] !== payload.productIdHash[1] ||
      myHash[2] !== payload.productIdHash[2] ||
      myHash[3] !== payload.productIdHash[3]
    ) {
      return { ok: false, reason: 'wrong_device' };
    }

    if (payload.expiresAt !== 0 && now > payload.expiresAt) {
      return { ok: false, reason: 'expired', payload };
    }

    return { ok: true, payload };
  } catch (e) {
    return { ok: false, reason: 'verify_error', detail: String(e && e.message ? e.message : e) };
  }
}

export function payloadToLicense(payload) {
  return {
    version: payload.version,
    bundle: payload.bundle,
    bundleName: BUNDLE_NAME[payload.bundle] || '?',
    editionYear: payload.editionYear,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    flags: payload.flags,
    activatedAt: Math.floor(Date.now() / 1000),
  };
}

export const REASON_MESSAGE = Object.freeze({
  key_too_short: 'That key looks incomplete. Paste the full activation key you received.',
  bad_prefix: 'This does not look like a Bravo CBT activation key.',
  bad_encoding: 'The key contains invalid characters. Please copy it again.',
  bad_length: 'The key is damaged or incomplete. Please copy the full key again.',
  bad_payload: 'The key is damaged. Please request a new copy from the seller.',
  bad_version: 'This key was created for an older version of Bravo CBT.',
  bad_signature: 'This key is not valid for this installation. Copy the full key again; if it still fails, update the app or request a fresh key.',
  wrong_device: 'This key was issued for a different Product ID. Check the Product ID above.',
  expired: 'This activation key has expired. Purchase a new edition key to continue.',
  verify_error: 'Could not verify the key. Please try again.',
});
