import { describe, it, expect } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import {
  createLicenseCoreSigner,
  BRAVO_ACTIVATION_PUBLIC_KEY_PEM,
} from "../../src/lib/bravo/activation-key";
import { verifyActivationKey } from "../../src/lib/bravo/vendor/license-core.js";
import { getBravoServerConfig, BravoConfigError } from "../../src/lib/bravo/config";

function testKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  return {
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}

const PID = "BCBT-YDR9-G5WQ-0860";

describe("license-core signer", () => {
  it("issues a key that verifies offline for the same product id only", async () => {
    const { privateKeyPem, publicKeyPem } = testKeyPair();
    const sign = createLicenseCoreSigner({ privateKeyPem, publicKeyPem, editionYear: 2025 });
    const key = await sign({ productId: "bcbt-ydr9-g5wq-0860", plan: "first", orderRef: "BCBT_X" });

    expect(key.startsWith("BCBTK1-")).toBe(true);
    const ok = await verifyActivationKey({ activationKey: key, productId: PID, publicKeyPem });
    expect(ok.ok).toBe(true);
    expect((ok.payload as { editionYear: number; bundle: number; expiresAt: number }).editionYear).toBe(2025);
    expect((ok.payload as { bundle: number }).bundle).toBe(3); // BOTH by default
    expect((ok.payload as { expiresAt: number }).expiresAt).toBe(0);

    const other = await verifyActivationKey({ activationKey: key, productId: "BCBT-AAAA-BBBB-CCCC", publicKeyPem });
    expect(other.reason).toBe("wrong_device");
  });

  it("refuses to return a key that does not verify against the committed public key", async () => {
    const { privateKeyPem } = testKeyPair(); // not the committed key pair
    const sign = createLicenseCoreSigner({ privateKeyPem, editionYear: 2025 });
    await expect(sign({ productId: PID, plan: "first", orderRef: "BCBT_X" })).rejects.toThrow(/self-check/);
  });

  it("the committed public key is the one used by default", () => {
    expect(BRAVO_ACTIVATION_PUBLIC_KEY_PEM).toContain("MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE");
  });

  it("rejects an implausible edition year when building the signer", () => {
    const { privateKeyPem, publicKeyPem } = testKeyPair();
    expect(() => createLicenseCoreSigner({ privateKeyPem, publicKeyPem, editionYear: 26 })).toThrow(/editionYear/);
  });

  it("config reads BRAVO_EDITION_YEAR strictly and leaves it undefined when unset", () => {
    const base = {
      PAYSTACK_SECRET_KEY: "sk_test_x",
      TURSO_DATABASE_URL: "file:/tmp/x.db",
      RESEND_API_KEY: "re_x",
      EMAIL_FROM: "a@b.c",
    };
    expect(getBravoServerConfig(base).editionYear).toBeUndefined();
    expect(getBravoServerConfig({ ...base, BRAVO_EDITION_YEAR: "2025" }).editionYear).toBe(2025);
    expect(() => getBravoServerConfig({ ...base, BRAVO_EDITION_YEAR: "25" })).toThrow(BravoConfigError);
    expect(() => getBravoServerConfig({ ...base, BRAVO_EDITION_YEAR: "2025x" })).toThrow(BravoConfigError);
  });
});
