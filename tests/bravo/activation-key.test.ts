import { describe, it, expect } from "vitest";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import {
  createLicenseCoreSigner,
  BRAVO_ACTIVATION_PUBLIC_KEY_PEM,
} from "../../src/lib/bravo/activation-key";
import { verifyActivationKey, verifyScoreClaim } from "../../src/lib/bravo/vendor/license-core.js";
import { parseContentRootKeySet } from "../../src/lib/bravo/content-key-core";
import { BRAVO_SIGNED_RELEASE_KEY_CONTEXT } from "../../src/lib/bravo/release-context";
import { getBravoServerConfig, BravoConfigError } from "../../src/lib/bravo/config";

function testKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  return {
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}

const PID = "BCBT-YDR9-G5WQ-0860";

function testRootKeySet() {
  return parseContentRootKeySet({
    schemaVersion: 1,
    keyEpoch: 71, // fake test metadata only
    rootYear: 2026, // fake test metadata only
    roots: { jamb: randomBytes(32).toString("base64url"), waec: randomBytes(32).toString("base64url") },
  });
}

function signerOptions(privateKeyPem: string, publicKeyPem: string) {
  const contentRootKeySet = testRootKeySet();
  return {
    privateKeyPem,
    publicKeyPem,
    contentRootKeySet,
    releaseKeyContext: { keyEpoch: contentRootKeySet.keyEpoch, rootYear: contentRootKeySet.rootYear },
  };
}

describe("license-core signer", () => {
  it("issues a v3 key and separate score claim that verify only for the same product id", async () => {
    const { privateKeyPem, publicKeyPem } = testKeyPair();
    const sign = createLicenseCoreSigner(signerOptions(privateKeyPem, publicKeyPem));
    const key = await sign({ productId: "bcbt-ydr9-g5wq-0860", plan: "first", orderRef: "BCBT_X", editionYear: 2025 });

    expect(key.startsWith("BCBTK3-")).toBe(true);
    const ok = await verifyActivationKey({ activationKey: key, productId: PID, publicKeyPem });
    expect(ok.ok).toBe(true);
    expect(ok.payload).toMatchObject({ version: 3, editionYear: 2025, bundle: 3, expiresAt: 0, keyEpoch: 71, rootYear: 2026 });
    const payload = ok.payload as { scoreClaim: string; contentKeys: Record<string, Uint8Array> };
    expect(Object.keys(payload.contentKeys)).toEqual(["jamb", "waec"]);
    expect(payload.scoreClaim.startsWith("BCBTSC1-")).toBe(true);
    expect(await verifyScoreClaim({ scoreClaim: payload.scoreClaim, productId: PID, publicKeyPem })).toMatchObject({ ok: true, payload: { bundle: 3, editionYear: 2025 } });

    const other = await verifyActivationKey({ activationKey: key, productId: "BCBT-AAAA-BBBB-CCCC", publicKeyPem });
    expect(other.reason).toBe("wrong_device");
    expect(await verifyScoreClaim({ scoreClaim: payload.scoreClaim, productId: "BCBT-AAAA-BBBB-CCCC", publicKeyPem })).toMatchObject({ ok: false, reason: "wrong_device" });
  });

  it("issues only the included exam key for a single-exam bundle", async () => {
    const { privateKeyPem, publicKeyPem } = testKeyPair();
    const contentRootKeySet = testRootKeySet();
    const sign = createLicenseCoreSigner({ ...signerOptions(privateKeyPem, publicKeyPem), bundle: 1 });
    const key = await sign({ productId: PID, plan: "first", orderRef: "BCBT_X", editionYear: 2026 });
    const result = await verifyActivationKey({ activationKey: key, productId: PID, publicKeyPem });
    expect(result).toMatchObject({ ok: true, payload: { bundle: 1, contentKeys: { jamb: expect.any(Uint8Array) } } });
    expect(Object.keys((result.payload as { contentKeys: Record<string, Uint8Array> }).contentKeys)).toEqual(["jamb"]);
    expect(contentRootKeySet.roots.waec).toHaveLength(32); // both roots are required in the root set
  });

  it("refuses to return a key that does not verify against the configured public key", async () => {
    const { privateKeyPem } = testKeyPair(); // not the committed key pair
    const { publicKeyPem: otherPublicKeyPem } = testKeyPair();
    const sign = createLicenseCoreSigner(signerOptions(privateKeyPem, otherPublicKeyPem));
    await expect(sign({ productId: PID, plan: "first", orderRef: "BCBT_X", editionYear: 2026 })).rejects.toThrow(/self-check/);
  });

  it("fails closed when root metadata does not match the verified signed release", () => {
    const { privateKeyPem, publicKeyPem } = testKeyPair();
    const contentRootKeySet = testRootKeySet();
    expect(() => createLicenseCoreSigner({
      privateKeyPem,
      publicKeyPem,
      contentRootKeySet,
      releaseKeyContext: { keyEpoch: contentRootKeySet.keyEpoch + 1, rootYear: contentRootKeySet.rootYear },
    })).toThrow(/does not match/);
    expect(BRAVO_SIGNED_RELEASE_KEY_CONTEXT).toEqual({ keyEpoch: 1, rootYear: 2035 });
  });

  it("the committed public key is the one used by default", () => {
    expect(BRAVO_ACTIVATION_PUBLIC_KEY_PEM).toContain("MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE");
  });

  it("refuses to sign editions outside the verified bank range", async () => {
    const { privateKeyPem, publicKeyPem } = testKeyPair();
    const sign = createLicenseCoreSigner(signerOptions(privateKeyPem, publicKeyPem));
    for (const editionYear of [26, 2014, 2027]) {
      await expect(sign({ productId: PID, plan: "first", orderRef: "BCBT_X", editionYear })).rejects.toThrow(/editionYear/);
    }
  });

  it("accepts both endpoints of the verified bank range", async () => {
    const { privateKeyPem, publicKeyPem } = testKeyPair();
    const sign = createLicenseCoreSigner(signerOptions(privateKeyPem, publicKeyPem));
    for (const editionYear of [2015, 2026]) {
      const key = await sign({ productId: PID, plan: "renewal", orderRef: "BCBT_A", editionYear });
      const ok = await verifyActivationKey({ activationKey: key, productId: PID, publicKeyPem });
      expect(ok).toMatchObject({ ok: true, payload: { editionYear } });
    }
  });

  it("config reads BRAVO_EDITION_YEAR strictly and leaves it undefined when unset", () => {
    const base = {
      PAYSTACK_SECRET_KEY: "sk_test_x",
      TURSO_DATABASE_URL: "file:/tmp/x.db",
      RESEND_API_KEY: "re_x",
      EMAIL_FROM: "a@b.c",
    };
    expect(getBravoServerConfig(base).editionYear).toBeUndefined();
    expect(getBravoServerConfig({ ...base, BRAVO_EDITION_YEAR: "2015" }).editionYear).toBe(2015);
    expect(getBravoServerConfig({ ...base, BRAVO_EDITION_YEAR: "2026" }).editionYear).toBe(2026);
    expect(() => getBravoServerConfig({ ...base, BRAVO_EDITION_YEAR: "2014" })).toThrow(BravoConfigError);
    expect(() => getBravoServerConfig({ ...base, BRAVO_EDITION_YEAR: "2027" })).toThrow(BravoConfigError);
    expect(() => getBravoServerConfig({ ...base, BRAVO_EDITION_YEAR: "25" })).toThrow(BravoConfigError);
    expect(() => getBravoServerConfig({ ...base, BRAVO_EDITION_YEAR: "2025x" })).toThrow(BravoConfigError);
  });
});
