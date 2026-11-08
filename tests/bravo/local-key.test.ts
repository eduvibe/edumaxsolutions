// Raw activation keys are no longer accepted by the mock score endpoint.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestDb, VALID_PRODUCT_ID } from "./helpers";

const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/bravo/db", () => ({ getBravoDb: () => holder.db }));

import { createMockEvent, submitMockScore, validateMockConfig } from "@/lib/bravo/mock";

const config = {
  title: "T", examId: "utme", durationMin: 60, editionYear: 2026, seed: "s",
  startsAt: "2026-11-02T09:00:00.000Z", closeAt: "2026-11-02T11:00:00.000Z",
};

afterEach(() => {
  delete process.env.BRAVO_ACTIVATION_PUBLIC_KEY_PEM_LOCAL;
});

describe("raw activation key rejection", () => {
  it("rejects activationKey even when a local public key is configured", async () => {
    const db = await createTestDb();
    holder.db = db;
    const event = await createMockEvent(db, validateMockConfig(config), "2026-11-02T12:00:00.000Z");
    process.env.BRAVO_ACTIVATION_PUBLIC_KEY_PEM_LOCAL = "unused-local-key";
    const result = await submitMockScore(db, event.id, {
      productId: VALID_PRODUCT_ID,
      activationKey: "raw-key-must-never-be-accepted",
      score: 10,
      total: 180,
      startedAt: Date.parse("2026-11-02T09:30:00.000Z"),
      endedAt: Date.parse("2026-11-02T10:00:00.000Z"),
    }, "2026-11-02T12:00:00.000Z");

    expect(result).toMatchObject({ accepted: false, code: "raw_activation_key_rejected" });
  });
});
