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
export const CONTENT_KEY_LICENSE_VERSION = 2;
export const CONTENT_KEY_LICENSE_VERSION_V3 = 3;
export const SCORE_CLAIM_VERSION = 1;
export const CONTENT_KEY_BYTES = 32;
export const PRODUCT_ID_PREFIX = 'BCBT';
export const KEY_PREFIX = 'BCBTK1';
export const KEY_PREFIX_V2 = 'BCBTK2';
export const KEY_PREFIX_V3 = 'BCBTK3';
export const SCORE_CLAIM_PREFIX = 'BCBTSC1';

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
export function formatActivationKey(base32Body, prefix = KEY_PREFIX) {
  const groups = base32Body.match(/.{1,5}/g) || [];
  return `${prefix}-${groups.join('-')}`;
}

export function normalizeActivationKey(input) {
  const raw = String(input || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const prefix = raw.startsWith(KEY_PREFIX_V3)
    ? KEY_PREFIX_V3
    : raw.startsWith(KEY_PREFIX_V2)
      ? KEY_PREFIX_V2
      : raw.startsWith(KEY_PREFIX) ? KEY_PREFIX : '';
  const body = prefix ? raw.slice(prefix.length) : raw;
  if (body.length < 40) return null;
  return {
    prefixOK: Boolean(prefix),
    keyVersion: prefix === KEY_PREFIX_V3
      ? CONTENT_KEY_LICENSE_VERSION_V3
      : prefix === KEY_PREFIX_V2 ? CONTENT_KEY_LICENSE_VERSION : (prefix === KEY_PREFIX ? KEY_VERSION : null),
    body,
  };
}

export function normalizeScoreClaim(input) {
  const raw = String(input || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const prefix = raw.startsWith(SCORE_CLAIM_PREFIX) ? SCORE_CLAIM_PREFIX : '';
  const body = prefix ? raw.slice(SCORE_CLAIM_PREFIX.length) : raw;
  if (body.length < 20) return null;
  return { prefixOK: Boolean(prefix), body };
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

function examNamesForBundle(bundle) {
  if (![BUNDLE.JAMB, BUNDLE.WAEC, BUNDLE.BOTH].includes(Number(bundle))) throw new Error('Unknown exam bundle.');
  const exams = [];
  if (Number(bundle) & BUNDLE.JAMB) exams.push('jamb');
  if (Number(bundle) & BUNDLE.WAEC) exams.push('waec');
  return exams;
}

function contentKeyBytes(value, name) {
  let bytes;
  if (value instanceof Uint8Array) bytes = new Uint8Array(value);
  else if (value instanceof ArrayBuffer) bytes = new Uint8Array(value);
  else if (typeof value === 'string') {
    const encoded = value.replace(/-/g, '+').replace(/_/g, '/');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw new Error(`${name} is not valid base64url.`);
    const binary = atob(encoded + '='.repeat((4 - (encoded.length % 4)) % 4));
    bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } else throw new Error(`${name} must be 32 bytes.`);
  if (bytes.byteLength !== CONTENT_KEY_BYTES) throw new Error(`${name} must be 32 bytes.`);
  return bytes;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).split('+').join('-').split('/').join('_').replace(/=+$/g, '');
}

/** Version 2/3 payload: the v1 claims plus per-exam edition keys. */
export function packPayloadV2(p) {
  const exams = examNamesForBundle(p.bundle);
  const keyEpoch = Number(p.keyEpoch);
  const editionYear = Number(p.editionYear);
  const rootYear = Number(p.rootYear);
  if (!Number.isSafeInteger(keyEpoch) || keyEpoch < 1 || keyEpoch > 0xffffffff) throw new Error('keyEpoch required.');
  if (!Number.isInteger(editionYear) || editionYear < 1900 || editionYear > 9999) throw new Error('Invalid editionYear.');
  if (!Number.isInteger(rootYear) || rootYear < editionYear || rootYear > 9999) throw new Error('rootYear must be >= editionYear.');
  if (!p.productIdHash || p.productIdHash.length !== 4) throw new Error('productIdHash required (4 bytes)');
  if (!p.contentKeys || typeof p.contentKeys !== 'object') throw new Error('contentKeys required.');

  const payload = new Uint8Array(26 + exams.length * CONTENT_KEY_BYTES);
  const v = new DataView(payload.buffer);
  const version = Number(p.version ?? CONTENT_KEY_LICENSE_VERSION);
  if (![CONTENT_KEY_LICENSE_VERSION, CONTENT_KEY_LICENSE_VERSION_V3].includes(version)) throw new Error('Invalid content-key license version.');
  v.setUint8(0, version);
  v.setUint8(1, p.bundle);
  v.setUint16(2, editionYear, true);
  payload.set(p.productIdHash, 4);
  v.setUint32(8, p.issuedAt >>> 0, true);
  v.setUint32(12, (p.expiresAt || 0) >>> 0, true);
  v.setUint32(16, (p.flags ?? 1) >>> 0, true);
  v.setUint32(20, keyEpoch, true);
  v.setUint16(24, rootYear, true);
  let offset = 26;
  for (const exam of exams) {
    payload.set(contentKeyBytes(p.contentKeys[exam], `contentKeys.${exam}`), offset);
    offset += CONTENT_KEY_BYTES;
  }
  return payload;
}

export function packPayloadV3(p) {
  return packPayloadV2({ ...p, version: CONTENT_KEY_LICENSE_VERSION_V3 });
}

export function unpackPayloadV2(bytes) {
  if (!bytes || bytes.length < 26) throw new Error('Payload too short');
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const bundle = v.getUint8(1);
  const exams = examNamesForBundle(bundle);
  if (bytes.length !== 26 + exams.length * CONTENT_KEY_BYTES) throw new Error('Invalid content-key payload length.');
  const editionYear = v.getUint16(2, true);
  const keyEpoch = v.getUint32(20, true);
  const rootYear = v.getUint16(24, true);
  if (editionYear < 1900 || rootYear < editionYear || keyEpoch < 1) throw new Error('Invalid content-key payload metadata.');
  const contentKeys = {};
  let offset = 26;
  for (const exam of exams) {
    contentKeys[exam] = bytes.slice(offset, offset + CONTENT_KEY_BYTES);
    offset += CONTENT_KEY_BYTES;
  }
  return {
    version: v.getUint8(0), bundle, editionYear,
    productIdHash: bytes.slice(4, 8),
    issuedAt: v.getUint32(8, true), expiresAt: v.getUint32(12, true), flags: v.getUint32(16, true),
    keyEpoch, rootYear, contentKeys,
  };
}

export function packScoreClaimPayload(p) {
  const bundle = Number(p.bundle);
  examNamesForBundle(bundle);
  const editionYear = Number(p.editionYear);
  const keyEpoch = Number(p.keyEpoch);
  const rootYear = Number(p.rootYear);
  if (!Number.isInteger(editionYear) || editionYear < 1900 || editionYear > 9999) throw new Error('Invalid editionYear.');
  if (!Number.isSafeInteger(keyEpoch) || keyEpoch < 1 || keyEpoch > 0xffffffff) throw new Error('keyEpoch required.');
  if (!Number.isInteger(rootYear) || rootYear < editionYear || rootYear > 9999) throw new Error('rootYear must be >= editionYear.');
  if (!p.productIdHash || p.productIdHash.length !== 4) throw new Error('productIdHash required (4 bytes)');
  const payload = new Uint8Array(26);
  const v = new DataView(payload.buffer);
  v.setUint8(0, SCORE_CLAIM_VERSION); v.setUint8(1, bundle); v.setUint16(2, editionYear, true);
  payload.set(p.productIdHash, 4);
  v.setUint32(8, p.issuedAt >>> 0, true); v.setUint32(12, (p.expiresAt || 0) >>> 0, true);
  v.setUint32(16, (p.flags ?? 1) >>> 0, true); v.setUint32(20, keyEpoch, true); v.setUint16(24, rootYear, true);
  return payload;
}

export function unpackScoreClaimPayload(bytes) {
  if (!bytes || bytes.length !== 26) throw new Error('Invalid score-claim payload length.');
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = v.getUint8(0), bundle = v.getUint8(1), editionYear = v.getUint16(2, true);
  const keyEpoch = v.getUint32(20, true), rootYear = v.getUint16(24, true);
  examNamesForBundle(bundle);
  if (version !== SCORE_CLAIM_VERSION || editionYear < 1900 || rootYear < editionYear || keyEpoch < 1) throw new Error('Invalid score-claim metadata.');
  return {
    version, bundle, editionYear, productIdHash: bytes.slice(4, 8),
    issuedAt: v.getUint32(8, true), expiresAt: v.getUint32(12, true), flags: v.getUint32(16, true), keyEpoch, rootYear,
  };
}

function sameBytes(a, b) {
  return Boolean(a && b && a.length === b.length && a.every((byte, index) => byte === b[index]));
}

function scoreClaimMatchesActivation(claim, activation) {
  return claim.bundle === activation.bundle && claim.editionYear === activation.editionYear &&
    sameBytes(claim.productIdHash, activation.productIdHash) && claim.issuedAt === activation.issuedAt &&
    claim.expiresAt === activation.expiresAt && claim.flags === activation.flags &&
    claim.keyEpoch === activation.keyEpoch && claim.rootYear === activation.rootYear;
}

function joinBytes(...parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const joined = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { joined.set(part, offset); offset += part.length; }
  return joined;
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

/** Sign a legacy activation or a v3 content-key license with a separate score credential. */
export async function signActivationKey({
  privateKeyPem, productId, bundle, editionYear, expiresAt = 0, flags = 1, issuedAt,
  contentKeys = null, keyEpoch = null, rootYear = null, includeScoreClaim = true,
}) {
  const hash = await productIdHashBytes(productId);
  const issued = issuedAt ?? Math.floor(Date.now() / 1000);
  const hasContentKeys = contentKeys != null || keyEpoch != null || rootYear != null;
  const version3 = hasContentKeys && includeScoreClaim !== false;
  const payload = hasContentKeys
    ? packPayloadV2({
        version: version3 ? CONTENT_KEY_LICENSE_VERSION_V3 : CONTENT_KEY_LICENSE_VERSION,
        bundle, editionYear, productIdHash: hash, issuedAt: issued, expiresAt, flags,
        contentKeys, keyEpoch, rootYear,
      })
    : packPayload({
        version: KEY_VERSION, bundle, editionYear, productIdHash: hash,
        issuedAt: issued, expiresAt, flags,
      });
  const key = await importPrivateKeyPkcs8(privateKeyPem);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, payload));
  const parts = [payload, sig];
  if (version3) {
    const scoreClaimPayload = packScoreClaimPayload({
      bundle, editionYear, productIdHash: hash, issuedAt: issued, expiresAt, flags, keyEpoch, rootYear,
    });
    const scoreClaimSignature = new Uint8Array(
      await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, scoreClaimPayload)
    );
    parts.push(scoreClaimPayload, scoreClaimSignature);
  }
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const token = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { token.set(part, offset); offset += part.length; }
  const prefix = version3 ? KEY_PREFIX_V3 : (hasContentKeys ? KEY_PREFIX_V2 : KEY_PREFIX);
  return formatActivationKey(bytesToBase32(token), prefix);
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
    try { token = base32ToBytes(norm.body); } catch { return { ok: false, reason: 'bad_encoding' }; }

    let payloadBytes, signature, scoreClaimPayloadBytes = null, scoreClaimSignature = null, payload;
    try {
      if (norm.keyVersion === KEY_VERSION) {
        if (token.length !== 84) return { ok: false, reason: 'bad_length' };
        payloadBytes = token.slice(0, 20);
        signature = token.slice(20);
        payload = unpackPayload(payloadBytes);
      } else if ([CONTENT_KEY_LICENSE_VERSION, CONTENT_KEY_LICENSE_VERSION_V3].includes(norm.keyVersion)) {
        if (token.length < 26 + CONTENT_KEY_BYTES + 64) return { ok: false, reason: 'bad_length' };
        const keyCount = examNamesForBundle(token[1]).length;
        const payloadLength = 26 + keyCount * CONTENT_KEY_BYTES;
        const scoreClaimLength = norm.keyVersion === CONTENT_KEY_LICENSE_VERSION_V3 ? 26 + 64 : 0;
        if (token.length !== payloadLength + 64 + scoreClaimLength) return { ok: false, reason: 'bad_length' };
        payloadBytes = token.slice(0, payloadLength);
        signature = token.slice(payloadLength, payloadLength + 64);
        payload = unpackPayloadV2(payloadBytes);
        if (norm.keyVersion === CONTENT_KEY_LICENSE_VERSION_V3) {
          const claimStart = payloadLength + 64;
          scoreClaimPayloadBytes = token.slice(claimStart, claimStart + 26);
          scoreClaimSignature = token.slice(claimStart + 26);
          payload.scoreClaimPayload = unpackScoreClaimPayload(scoreClaimPayloadBytes);
        }
      } else return { ok: false, reason: 'bad_version' };
    } catch { return { ok: false, reason: 'bad_payload' }; }
    if (payload.version !== norm.keyVersion) return { ok: false, reason: 'bad_version' };

    const pub = await importPublicKeyPem(publicKeyPem);
    const validSig = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' }, pub, signature, payloadBytes
    );
    if (!validSig) return { ok: false, reason: 'bad_signature' };
    if (norm.keyVersion === CONTENT_KEY_LICENSE_VERSION_V3) {
      if (!scoreClaimMatchesActivation(payload.scoreClaimPayload, payload)) return { ok: false, reason: 'bad_score_claim' };
      const validScoreClaim = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' }, pub, scoreClaimSignature, scoreClaimPayloadBytes
      );
      if (!validScoreClaim) return { ok: false, reason: 'bad_score_claim_signature' };
      payload.scoreClaim = formatActivationKey(
        bytesToBase32(joinBytes(scoreClaimPayloadBytes, scoreClaimSignature)), SCORE_CLAIM_PREFIX
      );
      delete payload.scoreClaimPayload;
    }

    const myHash = await productIdHashBytes(productId);
    if (myHash[0] !== payload.productIdHash[0] || myHash[1] !== payload.productIdHash[1] ||
        myHash[2] !== payload.productIdHash[2] || myHash[3] !== payload.productIdHash[3]) {
      return { ok: false, reason: 'wrong_device' };
    }
    if (payload.expiresAt !== 0 && now > payload.expiresAt) return { ok: false, reason: 'expired', payload };
    return { ok: true, payload };
  } catch (e) {
    return { ok: false, reason: 'verify_error', detail: String(e && e.message ? e.message : e) };
  }
}

export async function verifyScoreClaim({ scoreClaim, productId, publicKeyPem, now = Math.floor(Date.now() / 1000) }) {
  try {
    const norm = normalizeScoreClaim(scoreClaim);
    if (!norm) return { ok: false, reason: 'score_claim_too_short' };
    if (!norm.prefixOK) return { ok: false, reason: 'bad_score_claim_prefix' };
    let token;
    try { token = base32ToBytes(norm.body); } catch { return { ok: false, reason: 'bad_encoding' }; }
    if (token.length !== 26 + 64) return { ok: false, reason: 'bad_length' };
    const payloadBytes = token.slice(0, 26);
    const signature = token.slice(26);
    let payload;
    try { payload = unpackScoreClaimPayload(payloadBytes); } catch { return { ok: false, reason: 'bad_payload' }; }
    const pub = await importPublicKeyPem(publicKeyPem);
    const validSig = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' }, pub, signature, payloadBytes
    );
    if (!validSig) return { ok: false, reason: 'bad_signature' };
    const myHash = await productIdHashBytes(productId);
    if (!sameBytes(myHash, payload.productIdHash)) return { ok: false, reason: 'wrong_device' };
    if (payload.expiresAt !== 0 && now > payload.expiresAt) return { ok: false, reason: 'expired', payload };
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
    ...(payload.version === CONTENT_KEY_LICENSE_VERSION || payload.version === CONTENT_KEY_LICENSE_VERSION_V3 ? {
      keyEpoch: payload.keyEpoch,
      rootYear: payload.rootYear,
      contentKeys: Object.fromEntries(Object.entries(payload.contentKeys).map(([exam, key]) => [exam, bytesToBase64Url(key)])),
    } : {}),
    ...(payload.version === CONTENT_KEY_LICENSE_VERSION_V3 && payload.scoreClaim ? { scoreClaim: payload.scoreClaim } : {}),
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
