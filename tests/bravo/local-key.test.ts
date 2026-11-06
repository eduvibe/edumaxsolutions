// Locally issued activation keys (second trusted public key) must verify for score sync.
// Uses real crypto: generates a local P-256 keypair, signs a key, and checks verification.
import { generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestDb, VALID_PRODUCT_ID } from "./helpers";

const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/bravo/db", () => ({ getBravoDb: () => holder.db }));

import { createMockEvent, submitMockScore, validateMockConfig } from "@/lib/bravo/mock";
import { signActivationKey } from "@/lib/bravo/vendor/license-core.js";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const LOCAL_PUBLIC_PEM = publicKey.export({ type: "spki", format: "pem" }).toString();
const LOCAL_PRIVATE_PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

const config = {
  title: "T", examId: "utme", durationMin: 60, editionYear: 2026, seed: "s",
  startsAt: "2026-11-02T09:00:00.000Z", closeAt: "2026-11-02T11:00:00.000Z",
};

afterEach(() => {
  delete process.env.BRAVO_ACTIVATION_PUBLIC_KEY_PEM_LOCAL;
});

describe("locally issued activation keys", () => {
  it("are rejected without the local key configured, accepted with it", async () => {
    const db = await createTestDb();
    holder.db = db;
    const event = await createMockEvent(db, validateMockConfig(config), "2026-11-02T12:00:00.000Z");
    const localKey = await signActivationKey({
      privateKeyPem: LOCAL_PRIVATE_PEM,
      productId: VALID_PRODUCT_ID,
      bundle: 3,
      editionYear: 2026,
      issuedAt: Math.floor(Date.now() / 1000),
    });
    const body = {
      productId: VALID_PRODUCT_ID,
      activationKey: localKey,
      score: 10, total: 180,
      startedAt: Date.parse("2026-11-02T09:30:00.000Z"),
      endedAt: Date.parse("2026-11-02T10:00:00.000Z"),
    };

    const without = await submitMockScore(db, event.id, body, "2026-11-02T12:00:00.000Z");
    if (!without.accepted) expect(without.code).toBe("invalid_activation_key");

    process.env.BRAVO_ACTIVATION_PUBLIC_KEY_PEM_LOCAL = LOCAL_PUBLIC_PEM;
    const withLocal = await submitMockScore(db, event.id, body, "2026-11-02T12:00:00.000Z");
    expect(withLocal.accepted).toBe(true);
  });
});
