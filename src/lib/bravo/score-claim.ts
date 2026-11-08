// Bravo signed scoreClaim v1 verification. The claim proves licence eligibility only;
// it does not authenticate the score, attempt times, profile, or mock ID.
import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import { normalizeProductId } from "./vendor/license-core.js";
import { BRAVO_ACTIVATION_PUBLIC_KEY_PEM } from "./activation-key";

// Matches the public key supplied for scoreClaim v1 and the committed Bravo activation key.
// Production-issued v3 key compatibility still requires confirmation before deployment.
export const BRAVO_SCORE_CLAIM_PUBLIC_KEY_PEM = BRAVO_ACTIVATION_PUBLIC_KEY_PEM;

const BASE32_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const SCORE_CLAIM_PATTERN = /^BCBTSC1-([0-9A-HJKMNP-TV-Z]{5}(?:-[0-9A-HJKMNP-TV-Z]{5}){27}-[0-9A-HJKMNP-TV-Z]{4})$/;
const PAYLOAD_BYTES = 26;
const SIGNATURE_BYTES = 64;
const TOKEN_BYTES = PAYLOAD_BYTES + SIGNATURE_BYTES;

export type ScoreClaimPayload = {
  version: number;
  bundle: number;
  editionYear: number;
  productIdHash: Buffer;
  issuedAt: number;
  expiresAt: number;
  flags: number;
  keyEpoch: number;
  rootYear: number;
};

export type ScoreClaimMock = {
  title: string;
  exam_id: string;
  edition_year: number;
};

export class ScoreClaimError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "ScoreClaimError";
  }
}

function decodeCrockfordBase32(text: string): Buffer {
  let value = 0;
  let bits = 0;
  const bytes: number[] = [];
  for (const char of text) {
    const digit = BASE32_ALPHABET.indexOf(char);
    if (digit < 0) throw new ScoreClaimError("invalid_score_claim", "Malformed scoreClaim encoding");
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
      value &= (1 << bits) - 1;
    }
  }
  if (bits !== 0) throw new ScoreClaimError("invalid_score_claim", "Malformed scoreClaim padding");
  return Buffer.from(bytes);
}

function decodeScoreClaim(text: string): { payloadBytes: Buffer; signatureBytes: Buffer } {
  const match = SCORE_CLAIM_PATTERN.exec(text);
  if (!match) throw new ScoreClaimError("invalid_score_claim", "Malformed scoreClaim format");
  const decoded = decodeCrockfordBase32(match[1].replace(/-/g, ""));
  if (decoded.length !== TOKEN_BYTES) {
    throw new ScoreClaimError("invalid_score_claim", "Malformed scoreClaim length");
  }
  return {
    payloadBytes: decoded.subarray(0, PAYLOAD_BYTES),
    signatureBytes: decoded.subarray(PAYLOAD_BYTES),
  };
}

function unpackPayload(bytes: Buffer): ScoreClaimPayload {
  return {
    version: bytes.readUInt8(0),
    bundle: bytes.readUInt8(1),
    editionYear: bytes.readUInt16LE(2),
    productIdHash: bytes.subarray(4, 8),
    issuedAt: bytes.readUInt32LE(8),
    expiresAt: bytes.readUInt32LE(12),
    flags: bytes.readUInt32LE(16),
    keyEpoch: bytes.readUInt32LE(20),
    rootYear: bytes.readUInt16LE(24),
  };
}

function requiredBundleForMock(mock: ScoreClaimMock): 1 | 2 | 3 {
  // Event IDs are generated identifiers, so use the organizer-supplied title as the
  // family hint. Ambiguous/generic titles conservatively require the BOTH bundle.
  const label = `${mock.title} ${mock.exam_id}`.toLowerCase();
  const jamb = /\b(?:jamb|utme)\b/.test(label);
  const waec = /\b(?:waec|ssce)\b/.test(label);
  if (jamb && waec) return 3;
  if (jamb) return 1;
  if (waec) return 2;
  return 3;
}

function bundleCovers(bundle: number, required: 1 | 2 | 3): boolean {
  if (required === 3) return bundle === 3;
  return bundle === required || bundle === 3;
}

/**
 * Verifies the exact Bravo scoreClaim v1 envelope. `publicKeyPem` is injectable only
 * to allow tests to use an ephemeral test key; production callers use the committed key.
 */
export function verifyScoreClaim(
  text: unknown,
  productId: string,
  mock: ScoreClaimMock,
  now: number | Date = Date.now(),
  publicKeyPem = BRAVO_SCORE_CLAIM_PUBLIC_KEY_PEM,
): ScoreClaimPayload {
  if (typeof text !== "string" || text.length > 200) {
    throw new ScoreClaimError("invalid_score_claim", "scoreClaim is required");
  }
  const { payloadBytes, signatureBytes } = decodeScoreClaim(text);
  const payload = unpackPayload(payloadBytes);
  if (payload.version !== 1 || ![1, 2, 3].includes(payload.bundle)) {
    throw new ScoreClaimError("invalid_score_claim", "Unsupported scoreClaim version or bundle");
  }

  let validSignature = false;
  try {
    validSignature = verifySignature(
      "sha256",
      payloadBytes,
      { key: createPublicKey(publicKeyPem), dsaEncoding: "ieee-p1363" },
      signatureBytes,
    );
  } catch {
    validSignature = false;
  }
  if (!validSignature) throw new ScoreClaimError("invalid_score_claim", "scoreClaim signature is invalid");

  const canonicalProductId = normalizeProductId(productId);
  if (!canonicalProductId) throw new ScoreClaimError("invalid_product_id", "Enter a valid Bravo Product ID");
  const expectedHash = createHash("sha256").update(canonicalProductId, "ascii").digest().subarray(0, 4);
  if (!expectedHash.equals(payload.productIdHash)) {
    throw new ScoreClaimError("invalid_score_claim", "scoreClaim does not match this Product ID");
  }

  const nowSeconds = Math.floor((now instanceof Date ? now.getTime() : now) / 1000);
  if (payload.expiresAt !== 0 && nowSeconds > payload.expiresAt) {
    throw new ScoreClaimError("invalid_score_claim", "scoreClaim has expired");
  }
  if (payload.editionYear < mock.edition_year) {
    throw new ScoreClaimError("invalid_score_claim", "scoreClaim edition does not cover this mock");
  }
  if (!bundleCovers(payload.bundle, requiredBundleForMock(mock))) {
    throw new ScoreClaimError("invalid_score_claim", "scoreClaim bundle does not cover this mock");
  }
  return payload;
}
