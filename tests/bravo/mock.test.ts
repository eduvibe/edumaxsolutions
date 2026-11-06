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
  listMockEvents,
  getMockEvent,
  endCurrentMock,
  getCurrentMock,
  getLeaderboard,
  getStaffResults,
  submitMockScore,
  validateMockConfig,
  MockValidationError,
} from "@/lib/bravo/mock";

const NOW = "2026-11-02T12:00:00.000Z";
const maskedLabel = (pid: string) => `${pid.slice(0, 4)}****${pid.slice(-4)}`;
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

describe("score endpoint contract (ms timestamps, closed-mock delayed sync, idempotent retry)", () => {
  const MS = (iso: string) => Date.parse(iso); // Bravo sends Unix ms
  const base = {
    productId: VALID_PRODUCT_ID,
    activationKey: "BCBTK1-TEST",
    score: 30,
    total: 400,
    startedAt: MS("2026-11-02T09:30:00.000Z"),
    endedAt: MS("2026-11-02T10:30:00.000Z"),
  };

  beforeEach(async () => {
    const event = await createMockEvent(db, validateMockConfig(config), NOW);
    eventId = event.id;
  });

  it("1. accepts a valid score while the mock is active", async () => {
    const r = await submitMockScore(db, eventId, base, NOW);
    expect(r.accepted).toBe(true);
  });

  it("2. accepts a delayed score for a known mock after it closes (started < closeAt, ended <= closeAt)", async () => {
    await endCurrentMock(db, NOW); // mock is now ended
    const late = await submitMockScore(db, eventId, base, "2026-11-05T09:00:00.000Z"); // days later
    expect(late.accepted).toBe(true);
  });

  it("3. rejects endedAt after closeAt (after_close) even for a known ended mock", async () => {
    await endCurrentMock(db, NOW);
    const r = await submitMockScore(db, eventId, { ...base, endedAt: MS("2026-11-02T11:00:01.000Z") }, NOW);
    if (!r.accepted) expect(r.code).toBe("after_close");
  });

  it("4. rejects an unknown mock id with no_active_mock", async () => {
    const r = await submitMockScore(db, "does-not-exist", base, NOW);
    if (!r.accepted) expect(r.code).toBe("no_active_mock");
  });

  it("5. rejects invalid activation key and invalid score", async () => {
    holder.keyOk = false;
    const badKey = await submitMockScore(db, eventId, base, NOW);
    if (!badKey.accepted) expect(badKey.code).toBe("invalid_activation_key");
    holder.keyOk = true;
    const badScore = await submitMockScore(db, eventId, { ...base, score: 401, total: 400 }, NOW);
    if (!badScore.accepted) expect(badScore.code).toBe("invalid_score");
  });

  it("accepts Unix seconds as well as milliseconds", async () => {
    const secs = Math.floor(Date.parse("2026-11-02T09:30:00.000Z") / 1000);
    const r = await submitMockScore(db, eventId, { ...base, startedAt: secs, endedAt: secs + 1800 }, NOW);
    expect(r.accepted).toBe(true);
  });

  it("6. idempotent retry: identical resubmission acknowledged; lower score never overwrites best, higher score becomes best", async () => {
    const first = await submitMockScore(db, eventId, base, NOW);
    expect(first.accepted).toBe(true);
    const retry = await submitMockScore(db, eventId, base, "2026-11-03T08:00:00.000Z");
    expect(retry.accepted).toBe(true);
    if (retry.accepted) expect(retry.duplicate).toBe(true);
    // lower score: accepted but best score unchanged
    const lower = await submitMockScore(db, eventId, { ...base, score: 10 }, NOW);
    expect(lower.accepted).toBe(true);
    expect((await getLeaderboard(db, eventId, 10))[0].score).toBe(30);
    // higher score: becomes the best
    const higher = await submitMockScore(db, eventId, { ...base, score: 99 }, NOW);
    expect(higher.accepted).toBe(true);
    expect((await getLeaderboard(db, eventId, 10))[0].score).toBe(99);
  });
});

describe("mock history and ended-event access", () => {
  it("history lists ended events and GET by id + leaderboard work after the mock ends", async () => {
    const event = await createMockEvent(db, validateMockConfig(config), NOW);
    await submitMockScore(db, event.id, { productId: VALID_PRODUCT_ID, activationKey: "k", score: 12, total: 180, startedAt: Date.parse("2026-11-02T09:10:00.000Z"), endedAt: Date.parse("2026-11-02T10:00:00.000Z") }, NOW);
    await endCurrentMock(db, NOW);

    // current shows none, but history and by-id still expose the ended mock
    expect(await getCurrentMock(db)).toBeNull();
    const history = await listMockEvents(db, 50);
    expect(history.find((e) => e.id === event.id)?.status).toBe("ended");
    const byId = await getMockEvent(db, event.id);
    expect(byId?.status).toBe("ended");
    expect(byId?.editionYear).toBe(2026);
    const board = await getLeaderboard(db, event.id, 10);
    expect(board[0]).toMatchObject({ score: 12, total: 180 });
    expect(board[0].label).toBe(maskedLabel(VALID_PRODUCT_ID));

    // routes
    const histRoute = (await import("@/app/api/mock/history/route")).GET;
    const histRes = await histRoute(new Request("https://site.test/api/mock/history?limit=10"));
    expect(histRes.status).toBe(200);
    expect(histRes.headers.get("access-control-allow-origin")).toBe("*");
    const idRoute = await import("@/app/api/mock/[id]/route");
    const getRes = await idRoute.GET(new Request("https://site.test/api/mock/x"), { params: Promise.resolve({ id: event.id }) });
    expect(getRes.status).toBe(200);
    expect(((await getRes.json()) as { mock: { status: string } }).mock.status).toBe("ended");
    const missing = await idRoute.GET(new Request("https://site.test/api/mock/x"), { params: Promise.resolve({ id: "nope" }) });
    expect(missing.status).toBe(404);
  });
});

describe("leaderboard privacy", () => {
  it("exposes only leaderboard-safe fields, best score per product", async () => {
    const event = await createMockEvent(db, validateMockConfig(config), NOW);
    // one accepted score per product now; submit the best directly
    await submitMockScore(db, event.id, { productId: VALID_PRODUCT_ID, activationKey: "k", score: 35, total: 40, startedAt: "2026-11-02T09:10:00.000Z", endedAt: "2026-11-02T10:10:00.000Z" }, NOW);
    await submitMockScore(db, event.id, { productId: "BCBT-OTHER-0001", activationKey: "k", score: 20, total: 40, startedAt: "2026-11-02T09:10:00.000Z", endedAt: "2026-11-02T10:10:00.000Z" }, NOW);

    const board = await getLeaderboard(db, event.id, 10);
    expect(board).toHaveLength(2);
    expect(board[0]).toMatchObject({ score: 35, total: 40 });
    for (const entry of board) {
      expect(Object.keys(entry).sort()).toEqual(["label", "score", "submittedAt", "total"]);
      expect(JSON.stringify(entry)).not.toContain(VALID_PRODUCT_ID); // raw id masked
      expect(JSON.stringify(entry)).not.toMatch(/email|phone/i);
    }
  });

  it("sanitizes profiles, merges them on a lower-score retry without touching best score", async () => {
    const event = await createMockEvent(db, validateMockConfig(config), NOW);
    const mk = (score: number, profile: unknown) => ({
      productId: VALID_PRODUCT_ID, activationKey: "k", score, total: 180,
      startedAt: Date.parse("2026-11-02T09:10:00.000Z"), endedAt: Date.parse("2026-11-02T10:00:00.000Z"),
      profile,
    });
    // partial profile, plus junk fields that must be dropped
    const first = await submitMockScore(db, event.id, mk(100, { name: "  Ada Lovelace ", email: "ada@example.com", hacker: "x", phone: " " }), NOW);
    expect(first.accepted).toBe(true);
    // lower score, newer profile details (phone + school), empty name must not erase existing
    const retry = await submitMockScore(db, event.id, mk(40, { name: "", phone: "08012345678", school: "LAGOS HIGH" }), NOW);
    expect(retry.accepted).toBe(true);

    const results = await getStaffResults(db, event.id, 10);
    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(100); // best score kept
    expect(results[0].submittedAt).toBe(results[0].submittedAt); // unchanged best time
    expect(results[0].profile).toMatchObject({ name: "Ada Lovelace", email: "ada@example.com", phone: "08012345678", school: "LAGOS HIGH" });
    expect(JSON.stringify(results[0].profile)).not.toContain("hacker");

    // public leaderboard shows the name as label, never email/phone/raw id
    const board = await getLeaderboard(db, event.id, 10);
    expect(board[0].label).toBe("Ada Lovelace");
    expect(JSON.stringify(board[0])).not.toMatch(/ada@example|0801|YDR9/);
  });

  it("accepts submissions with no profile at all", async () => {
    const event = await createMockEvent(db, validateMockConfig(config), NOW);
    const r = await submitMockScore(db, event.id, {
      productId: VALID_PRODUCT_ID, activationKey: "k", score: 5, total: 180,
      startedAt: Date.parse("2026-11-02T09:10:00.000Z"), endedAt: Date.parse("2026-11-02T10:00:00.000Z"),
    }, NOW);
    expect(r.accepted).toBe(true);
    const board = await getLeaderboard(db, event.id, 10);
    expect(board[0].label).toMatch(/^BCBT\*\*\*\*/); // masked id fallback
  });
});

describe("staff results route authorization", () => {
  const STAFF_TOKEN = "test-staff-token";
  process.env.BRAVO_STAFF_TOKEN = STAFF_TOKEN;
  it("rejects unauthenticated results access and returns profiles to staff", async () => {
    const event = await createMockEvent(db, validateMockConfig(config), NOW);
    await submitMockScore(db, event.id, {
      productId: VALID_PRODUCT_ID, activationKey: "k", score: 7, total: 180,
      startedAt: Date.parse("2026-11-02T09:10:00.000Z"), endedAt: Date.parse("2026-11-02T10:00:00.000Z"),
      profile: { name: "Grace", email: "g@x.io" },
    }, NOW);
    const route = (await import("@/app/api/mock/[id]/results/route")).GET;
    const anon = await route(new Request("https://site.test/api/mock/x/results"), { params: Promise.resolve({ id: event.id }) });
    expect(anon.status).toBe(401);
    const authed = await route(new Request("https://site.test/api/mock/x/results", { headers: { authorization: `Bearer ${STAFF_TOKEN}` } }), { params: Promise.resolve({ id: event.id }) });
    expect(authed.status).toBe(200);
    const body = (await authed.json()) as { results: { productId: string; profile: { email: string } }[] };
    expect(body.results[0].productId).toBe(VALID_PRODUCT_ID);
    expect(body.results[0].profile.email).toBe("g@x.io");
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
