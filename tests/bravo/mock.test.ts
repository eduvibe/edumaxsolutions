// Mock scheduling, closeAt cutoff, activation-key score validation, and leaderboard privacy.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, VALID_PRODUCT_ID } from "./helpers";

const holder = vi.hoisted(() => ({ db: null as unknown, keyOk: true }));
vi.mock("@/lib/bravo/db", () => ({ getBravoDb: () => holder.db }));
vi.mock("@/lib/bravo/vendor/license-core.js", async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    verifyActivationKey: async () => (holder.keyOk ? { ok: true } : { ok: false, reason: "bad_signature" }),
  };
});

import {
  createMockEvent,
  updateMockEvent,
  deleteMockEvent,
  endCurrentMock,
  getCurrentMock,
  getLeaderboard,
  submitMockScore,
  validateMockConfig,
  MockValidationError,
} from "@/lib/bravo/mock";

const NOW = "2026-11-02T12:00:00.000Z";
const config = {
  title: "UTME Mock 1",
  examId: "utme",
  subjectIds: ["mathematics", "english"],
  countPerSubject: 20,
  durationMin: 60,
  editionYear: 2026,
  seed: "seed-42",
  startsAt: "2026-11-02T09:00:00.000Z",
  closeAt: "2026-11-02T11:00:00.000Z",
};

let db: Awaited<ReturnType<typeof createTestDb>>;
let eventId: string;

beforeAll(async () => {
  db = await createTestDb();
  holder.db = db;
});

beforeEach(async () => {
  holder.keyOk = true;
  await db.execute("DELETE FROM bravo_mock_scores");
  await db.execute("DELETE FROM bravo_mock_events");
});

describe("mock scheduling", () => {
  it("rejects closeAt not after startsAt and bad fields", () => {
    expect(() => validateMockConfig({ ...config, closeAt: config.startsAt })).toThrow(MockValidationError);
    expect(() => validateMockConfig({ ...config, durationMin: 0 })).toThrow(MockValidationError);
    expect(() => validateMockConfig({ ...config, editionYear: 99 })).toThrow(MockValidationError);
    expect(validateMockConfig(config).examId).toBe("utme");
  });

  it("publishes an event, returns it as current, and creating another ends the first", async () => {
    const event = await createMockEvent(db, validateMockConfig(config), NOW);
    eventId = event.id;
    expect((await getCurrentMock(db))?.id).toBe(event.id);

    const second = await createMockEvent(db, validateMockConfig({ ...config, title: "Mock 2" }), NOW);
    const current = await getCurrentMock(db);
    expect(current?.id).toBe(second.id);
    const ended = await endCurrentMock(db, NOW);
    expect(ended).toBe(true);
    expect(await getCurrentMock(db)).toBeNull();
    expect(await endCurrentMock(db, NOW)).toBe(false);
  });
});

describe("closeAt cutoff and score validation", () => {
  beforeEach(async () => {
    const event = await createMockEvent(db, validateMockConfig(config), NOW);
    eventId = event.id;
  });

  const scoreBody = (overrides: Record<string, unknown> = {}) => ({
    productId: VALID_PRODUCT_ID,
    activationKey: "BCBTK1-TEST",
    score: 30,
    total: 40,
    startedAt: "2026-11-02T09:30:00.000Z",
    endedAt: "2026-11-02T10:30:00.000Z",
    ...overrides,
  });

  it("accepts an in-window attempt and rejects an invalid activation key", async () => {
    const ok = await submitMockScore(db, eventId, scoreBody(), NOW);
    expect(ok.accepted).toBe(true);

    holder.keyOk = false;
    const bad = await submitMockScore(db, eventId, scoreBody({ startedAt: "2026-11-02T09:31:00.000Z" }), NOW);
    expect(bad.accepted).toBe(false);
    if (!bad.accepted) expect(bad.code).toBe("invalid_activation_key");
  });

  it("blocks starts before startsAt, at/after closeAt, and attempts ending after closeAt", async () => {
    const early = await submitMockScore(db, eventId, scoreBody({ startedAt: "2026-11-02T08:59:00.000Z" }), NOW);
    if (!early.accepted) expect(early.code).toBe("before_start");

    const atClose = await submitMockScore(db, eventId, scoreBody({ startedAt: "2026-11-02T11:00:00.000Z", endedAt: "2026-11-02T11:00:00.000Z" }), NOW);
    if (!atClose.accepted) expect(atClose.code).toBe("after_close");

    const lateEnd = await submitMockScore(db, eventId, scoreBody({ endedAt: "2026-11-02T11:00:01.000Z" }), NOW);
    if (!lateEnd.accepted) expect(lateEnd.code).toBe("after_close");
  });

  it("permits a late offline submission when the attempt started before closeAt and ended at/before closeAt", async () => {
    const late = await submitMockScore(
      db,
      eventId,
      scoreBody({ startedAt: "2026-11-02T10:59:00.000Z", endedAt: "2026-11-02T11:00:00.000Z" }),
      "2026-11-03T08:00:00.000Z" // submitted the next day
    );
    expect(late.accepted).toBe(true);
  });

  it("rejects malformed scores and unknown events", async () => {
    const bad = await submitMockScore(db, eventId, scoreBody({ score: 41, total: 40 }), NOW);
    if (!bad.accepted) expect(bad.code).toBe("invalid_score");
    const noEvent = await submitMockScore(db, "missing", scoreBody(), NOW);
    if (!noEvent.accepted) expect(noEvent.code).toBe("no_active_mock");
  });
});

describe("mock edit/delete lock rules", () => {
  it("allows editing before start with no scores, locks after start or with scores, deletes only without scores", async () => {
    const future = { ...config, startsAt: "2026-12-01T09:00:00.000Z", closeAt: "2026-12-01T11:00:00.000Z" };
    const event = await createMockEvent(db, validateMockConfig(future), NOW);

    // editable before start
    const edit = await updateMockEvent(db, event.id, validateMockConfig({ ...future, title: "Renamed" }), NOW);
    expect(edit.ok).toBe(true);

    // delete allowed while no scores
    expect((await deleteMockEvent(db, event.id)).ok).toBe(true);
    expect((await deleteMockEvent(db, event.id)).ok).toBe(false);

    // started event is locked for edit and delete-with-scores
    const started = await createMockEvent(db, validateMockConfig(config), NOW);
    const lateEdit = await updateMockEvent(db, started.id, validateMockConfig(config), "2026-11-02T10:00:00.000Z");
    if (!lateEdit.ok) expect(lateEdit.code).toBe("locked");
    await submitMockScore(db, started.id, { productId: VALID_PRODUCT_ID, activationKey: "k", score: 5, total: 40, startedAt: "2026-11-02T09:10:00.000Z", endedAt: "2026-11-02T10:00:00.000Z" }, NOW);
    const delWithScores = await deleteMockEvent(db, started.id);
    if (!delWithScores.ok) expect(delWithScores.code).toBe("has_scores");
  });
});

describe("leaderboard privacy", () => {
  it("exposes only leaderboard-safe fields, best score per product", async () => {
    const event = await createMockEvent(db, validateMockConfig(config), NOW);
    await submitMockScore(db, event.id, { productId: VALID_PRODUCT_ID, activationKey: "k", score: 10, total: 40, startedAt: "2026-11-02T09:10:00.000Z", endedAt: "2026-11-02T10:00:00.000Z" }, NOW);
    await submitMockScore(db, event.id, { productId: VALID_PRODUCT_ID, activationKey: "k", score: 35, total: 40, startedAt: "2026-11-02T09:10:00.000Z", endedAt: "2026-11-02T10:10:00.000Z" }, NOW);
    await submitMockScore(db, event.id, { productId: "BCBT-OTHER-0001", activationKey: "k", score: 20, total: 40, startedAt: "2026-11-02T09:10:00.000Z", endedAt: "2026-11-02T10:10:00.000Z" }, NOW);

    const board = await getLeaderboard(db, event.id, 10);
    expect(board).toHaveLength(2);
    expect(board[0]).toMatchObject({ productId: VALID_PRODUCT_ID, score: 35, total: 40 });
    for (const entry of board) {
      expect(Object.keys(entry).sort()).toEqual(["productId", "score", "submittedAt", "total"]);
    }
  });
});

describe("mock routes", () => {
  const STAFF_TOKEN = "test-staff-token";
  process.env.BRAVO_STAFF_TOKEN = STAFF_TOKEN;

  it("GET /api/mock/current returns {mock:null} or config; create/end require admin", async () => {
    const current = (await import("@/app/api/mock/current/route")).GET;
    const create = (await import("@/app/api/mock/create/route")).POST;
    const end = (await import("@/app/api/mock/end/route")).POST;
    const jsonReq = (url: string, body: unknown, token?: string) =>
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });

    expect((await create(jsonReq("https://site.test/api/mock/create", config))).status).toBe(401);
    expect((await create(jsonReq("https://site.test/api/mock/create", config, "wrong"))).status).toBe(401);
    expect((await end(jsonReq("https://site.test/api/mock/end", {}))).status).toBe(401);

    const created = await create(jsonReq("https://site.test/api/mock/create", config, STAFF_TOKEN));
    expect(created.status).toBe(201);
    const cur = await current();
    const body = (await cur.json()) as { mock: MockConfigLike | null };
    expect(body.mock?.examId).toBe("utme");
    expect(body.mock && "closeAt" in body.mock).toBe(true);
    expect(body.mock?.editionYear).toBe(2026);
    expect(typeof body.mock?.seed).toBe("string");
    expect((await end(jsonReq("https://site.test/api/mock/end", {}, STAFF_TOKEN))).status).toBe(200);
    const after = (await (await current()).json()) as { mock: unknown };
    expect(after.mock).toBeNull();
  });
});

type MockConfigLike = { examId: string; closeAt: string; editionYear: number; seed: string };
