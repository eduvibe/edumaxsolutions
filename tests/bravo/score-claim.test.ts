import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizeProductId } from "@/lib/bravo/vendor/license-core.js";
import { ScoreClaimError, verifyScoreClaim, type ScoreClaimMock } from "@/lib/bravo/score-claim";
import { VALID_PRODUCT_ID } from "./helpers";

const TEST_NOW = Date.parse("2026-11-02T12:00:00.000Z");
const mock: ScoreClaimMock = { title: "WAEC Mock", exam_id: "jamb", edition_year: 2026 };
const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();

function encodeBase32(bytes: Buffer): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  const groups = out.match(/.{1,5}/g) ?? [];
  return `BCBTSC1-${groups.join("-")}`;
}

function makeClaim(overrides: Partial<{ productId: string; bundle: number; editionYear: number; expiresAt: number }> = {}) {
  const payload = Buffer.alloc(26);
  payload.writeUInt8(1, 0);
  payload.writeUInt8(overrides.bundle ?? 1, 1);
  payload.writeUInt16LE(overrides.editionYear ?? 2026, 2);
  const canonicalProductId = normalizeProductId(overrides.productId ?? VALID_PRODUCT_ID)!;
  createHash("sha256").update(canonicalProductId, "ascii").digest().copy(payload, 4, 0, 4);
  payload.writeUInt32LE(1_798_000_000, 8); // issuedAt
  payload.writeUInt32LE(overrides.expiresAt ?? 0, 12);
  payload.writeUInt32LE(1, 16); // flags
  payload.writeUInt32LE(3, 20); // keyEpoch
  payload.writeUInt16LE(2025, 24); // rootYear
  const signature = sign("sha256", payload, { key: privateKey, dsaEncoding: "ieee-p1363" });
  return encodeBase32(Buffer.concat([payload, signature]));
}

function expectClaimRejected(claim: string, productId = VALID_PRODUCT_ID, target = mock) {
  expect(() => verifyScoreClaim(claim, productId, target, TEST_NOW, publicKeyPem)).toThrow(ScoreClaimError);
}

function expectClaimErrorCode(claim: string, target: ScoreClaimMock, code: string) {
  let caught: unknown;
  try {
    verifyScoreClaim(claim, VALID_PRODUCT_ID, target, TEST_NOW, publicKeyPem);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(ScoreClaimError);
  expect(caught).toMatchObject({ code });
}

describe("Bravo scoreClaim v1", () => {
  it("verifies the P-256/SHA-256 raw P1363 signature and matching Product ID", () => {
    const claim = makeClaim();
    expect(claim.startsWith("BCBTSC1-")).toBe(true);
    expect(verifyScoreClaim(claim, VALID_PRODUCT_ID, mock, TEST_NOW, publicKeyPem)).toMatchObject({
      version: 1,
      bundle: 1,
      editionYear: 2026,
      keyEpoch: 3,
      rootYear: 2025,
    });
  });

  it("rejects a malformed claim, wrong Product ID, and tampered signature", () => {
    const claim = makeClaim();
    expectClaimRejected("BCBTSC1-INVALID");
    expectClaimRejected(claim, "BCBT-OTHER-0001");
    const tampered = `${claim.slice(0, -1)}${claim.endsWith("0") ? "1" : "0"}`;
    expectClaimRejected(tampered);
  });

  it("rejects expired claims and claims whose edition or bundle does not cover the mock", () => {
    const expired = makeClaim({ expiresAt: Math.floor(TEST_NOW / 1000) - 1 });
    expectClaimRejected(expired);
    expectClaimRejected(makeClaim({ editionYear: 2025 }));
    expectClaimRejected(makeClaim({ bundle: 2 }));
  });

  it("authorizes from normalized exam_id only; a misleading title cannot override it", () => {
    const jambMock = { ...mock, title: "WAEC nationwide mock", exam_id: "  JAMB  " };
    const waecMock = { ...mock, title: "JAMB practice paper", exam_id: " WAEC " };
    expect(() => verifyScoreClaim(makeClaim({ bundle: 1 }), VALID_PRODUCT_ID, jambMock, TEST_NOW, publicKeyPem)).not.toThrow();
    expectClaimRejected(makeClaim({ bundle: 2 }), VALID_PRODUCT_ID, jambMock);
    expect(() => verifyScoreClaim(makeClaim({ bundle: 2 }), VALID_PRODUCT_ID, waecMock, TEST_NOW, publicKeyPem)).not.toThrow();
    expectClaimRejected(makeClaim({ bundle: 1 }), VALID_PRODUCT_ID, waecMock);
  });

  it("rejects unknown exam IDs, including both, even for a BOTH-bundle claim", () => {
    const bothClaim = makeClaim({ bundle: 3 });
    for (const examId of ["both", "mock-20261102-abcd", "utme", "ssce"]) {
      expectClaimErrorCode(bothClaim, { ...mock, title: "JAMB and WAEC Combined Mock", exam_id: examId }, "unsupported_exam_id");
    }
  });
});
