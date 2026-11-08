// Mock scheduling, closeAt cutoff, scoreClaim eligibility validation, and leaderboard privacy.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, VALID_PRODUCT_ID } from "./helpers";

const holder = vi.hoisted(() => {
  class MockScoreClaimError extends Error {
    constructor(readonly code: string, message: string) { super(message); }
  }
  return { db: null as unknown, claimOk: true, MockScoreClaimError };
});
vi.mock("@/lib/bravo/db", () => ({ getBravoDb: () => holder.db }));
vi.mock("@/lib/bravo/score-claim", () => ({
  ScoreClaimError: holder.MockScoreClaimError,
  verifyScoreClaim: () => {
    if (!holder.claimOk) throw new holder.MockScoreClaimError("invalid_score_claim", "bad test claim");
    return {};
  },
}));

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
const config = {
  title: "UTME Mock 1",
  examId: "jamb",
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
  holder.claimOk = true;
  await db.execute("DELETE FROM bravo_mock_scores");
  await db.execute("DELETE FROM bravo_mock_events");
});

describe("mock scheduling", () => {
  it("rejects closeAt not after startsAt and bad fields", () => {
    expect(() => validateMockConfig({ ...config, closeAt: config.startsAt })).toThrow(MockValidationError);
    expect(() => validateMockConfig({ ...config, durationMin: 0 })).toThrow(MockValidationError);
    expect(() => validateMockConfig({ ...config, editionYear: 99 })).toThrow(MockValidationError);
    expect(validateMockConfig(config).examId).toBe("jamb");
    expect(validateMockConfig({ ...config, examId: " WAEC " }).examId).toBe("waec");
    for (const examId of ["both", "utme", "mock-20261102-abcd"]) {
      expect(() => validateMockConfig({ ...config, examId })).toThrow(MockValidationError);
    }
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
    scoreClaim: "BCBTSC1-TEST",
    score: 30,
    total: 40,
    startedAt: "2026-11-02T09:30:00.000Z",
    endedAt: "2026-11-02T10:30:00.000Z",
    ...overrides,
  });

  it("accepts an in-window attempt and rejects an invalid signed scoreClaim", async () => {
    const ok = await submitMockScore(db, eventId, scoreBody(), NOW);
    expect(ok.accepted).toBe(true);

    holder.claimOk = false;
    const bad = await submitMockScore(db, eventId, scoreBody({ startedAt: "2026-11-02T09:31:00.000Z" }), NOW);
    expect(bad.accepted).toBe(false);
    if (!bad.accepted) expect(bad.code).toBe("invalid_score_claim");
  });

  it("rejects raw activationKey even when a scoreClaim is also present", async () => {
    const event = await createMockEvent(db, validateMockConfig(config), NOW);
    const result = await submitMockScore(db, event.id, {
      productId: VALID_PRODUCT_ID, scoreClaim: "BCBTSC1-TEST", activationKey: "must-not-be-accepted",
      score: 1, total: 1, startedAt: "2026-11-02T09:10:00.000Z", endedAt: "2026-11-02T09:11:00.000Z",
    }, NOW);
    expect(result).toMatchObject({ accepted: false, code: "raw_activation_key_rejected" });
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
    await submitMockScore(db, started.id, { productId: VALID_PRODUCT_ID, scoreClaim: "BCBTSC1-TEST", score: 5, total: 40, startedAt: "2026-11-02T09:10:00.000Z", endedAt: "2026-11-02T10:00:00.000Z" }, NOW);
    const delWithScores = await deleteMockEvent(db, started.id);
    if (!delWithScores.ok) expect(delWithScores.code).toBe("has_scores");
  });
});

describe("score endpoint contract (ms timestamps, closed-mock delayed sync, idempotent retry)", () => {
  const MS = (iso: string) => Date.parse(iso); // Bravo sends Unix ms
  const base = {
    productId: VALID_PRODUCT_ID,
    scoreClaim: "BCBTSC1-TEST",
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

  it("5. rejects invalid scoreClaim and invalid score", async () => {
    holder.claimOk = false;
    const badKey = await submitMockScore(db, eventId, base, NOW);
    if (!badKey.accepted) expect(badKey.code).toBe("invalid_score_claim");
    holder.claimOk = true;
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
    await submitMockScore(db, event.id, { productId: VALID_PRODUCT_ID, scoreClaim: "BCBTSC1-TEST", score: 12, total: 180, startedAt: Date.parse("2026-11-02T09:10:00.000Z"), endedAt: Date.parse("2026-11-02T10:00:00.000Z") }, NOW);
    await endCurrentMock(db, NOW);

    // current shows none, but history and by-id still expose the ended mock
    expect(await getCurrentMock(db)).toBeNull();
    const history = await listMockEvents(db, 50);
    expect(history.find((e) => e.id === event.id)?.status).toBe("ended");
    const byId = await getMockEvent(db, event.id);
    expect(byId?.status).toBe("ended");
    expect(byId?.editionYear).toBe(2026);
    const board = await getLeaderboard(db, event.id, 10);
    expect(board[0]).toEqual({ name: "Candidate", score: 12 });

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
    await submitMockScore(db, event.id, { productId: VALID_PRODUCT_ID, scoreClaim: "BCBTSC1-TEST", score: 35, total: 40, startedAt: "2026-11-02T09:10:00.000Z", endedAt: "2026-11-02T10:10:00.000Z" }, NOW);
    await submitMockScore(db, event.id, { productId: "BCBT-AAAA-BBBB-0001", scoreClaim: "BCBTSC1-TEST", score: 20, total: 40, startedAt: "2026-11-02T09:10:00.000Z", endedAt: "2026-11-02T10:10:00.000Z" }, NOW);

    const board = await getLeaderboard(db, event.id, 10);
    expect(board).toHaveLength(2);
    expect(board[0]).toEqual({ name: "Candidate", score: 35 });
    for (const entry of board) {
      expect(Object.keys(entry).sort()).toEqual(["name", "score"]);
      expect(JSON.stringify(entry)).not.toMatch(/productId|total|submittedAt|phone/i);
    }
  });

  it("sanitizes profiles, merges them on a lower-score retry without touching best score", async () => {
    const event = await createMockEvent(db, validateMockConfig(config), NOW);
    const mk = (score: number, profile: unknown) => ({
      productId: VALID_PRODUCT_ID, scoreClaim: "BCBTSC1-TEST", score, total: 180,
      startedAt: Date.parse("2026-11-02T09:10:00.000Z"), endedAt: Date.parse("2026-11-02T10:00:00.000Z"),
      profile,
    });
    // partial profile, plus junk fields that must be dropped
    const first = await submitMockScore(db, event.id, mk(100, { name: "  Ada Lovelace ", email: "ada@example.com", hacker: "x", phone: " " }), NOW);
    expect(first.accepted).toBe(true);
    // lower score, newer phone, empty name must not erase the existing name
    const retry = await submitMockScore(db, event.id, mk(40, { name: "", phone: "08012345678", school: "LAGOS HIGH" }), NOW);
    expect(retry.accepted).toBe(true);

    const results = await getStaffResults(db, event.id, 10);
    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(100); // best score kept
    expect(results[0].submittedAt).toBe(results[0].submittedAt); // unchanged best time
    expect(results[0].profile).toEqual({ name: "Ada Lovelace", phone: "08012345678" });
    expect(JSON.stringify(results[0].profile)).not.toContain("hacker");

    // public leaderboard contains only candidate name and score
    const board = await getLeaderboard(db, event.id, 10);
    expect(board[0]).toEqual({ name: "Ada Lovelace", score: 100 });
    expect(JSON.stringify(board[0])).not.toMatch(/ada@example|0801|YDR9|total|submittedAt|productId/);
  });

  it("returns only name and score from the public leaderboard route", async () => {
    const event = await createMockEvent(db, validateMockConfig(config), NOW);
    await submitMockScore(db, event.id, {
      productId: VALID_PRODUCT_ID, scoreClaim: "BCBTSC1-TEST", score: 17, total: 25,
      startedAt: "2026-11-02T09:10:00.000Z", endedAt: "2026-11-02T10:00:00.000Z",
      profile: { name: "Candidate Name", phone: "08012345678" },
    }, NOW);
    const route = (await import("@/app/api/mock/[id]/leaderboard/route")).GET;
    const response = await route(new Request("https://site.test/api/mock/x/leaderboard"), { params: Promise.resolve({ id: event.id }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ leaderboard: [{ name: "Candidate Name", score: 17 }] });
  });

  it("accepts profile name and phone, keeps them staff-only, and ignores extra fields", async () => {
    const event = await createMockEvent(db, validateMockConfig(config), NOW);
    const r = await submitMockScore(db, event.id, {
      productId: VALID_PRODUCT_ID, scoreClaim: "BCBTSC1-TEST", score: 20, total: 180,
      startedAt: Date.parse("2026-11-02T09:10:00.000Z"), endedAt: Date.parse("2026-11-02T10:00:00.000Z"),
      phone: "top-level-ignored", profile: { name: "Bee", phone: "09099999999", email: "not-stored@example.com", state: "hidden" },
    }, NOW);
    expect(r.accepted).toBe(true);
    const results = await getStaffResults(db, event.id, 10);
    expect(results[0].profile).toEqual({ name: "Bee", phone: "09099999999" });
    const board = await getLeaderboard(db, event.id, 10);
    expect(board[0]).toEqual({ name: "Bee", score: 20 });
    expect(JSON.stringify(board[0])).not.toMatch(/0909|not-stored|productId|total|submittedAt/);
  });

  it("accepts submissions with no profile at all", async () => {
    const event = await createMockEvent(db, validateMockConfig(config), NOW);
    const r = await submitMockScore(db, event.id, {
      productId: VALID_PRODUCT_ID, scoreClaim: "BCBTSC1-TEST", score: 5, total: 180,
      startedAt: Date.parse("2026-11-02T09:10:00.000Z"), endedAt: Date.parse("2026-11-02T10:00:00.000Z"),
    }, NOW);
    expect(r.accepted).toBe(true);
    const board = await getLeaderboard(db, event.id, 10);
    expect(board[0]).toEqual({ name: "Candidate", score: 5 });
  });
});

describe("staff results route authorization", () => {
  const STAFF_TOKEN = "test-staff-token";
  process.env.BRAVO_STAFF_TOKEN = STAFF_TOKEN;
  it("rejects unauthenticated results access and returns profiles to staff", async () => {
    const event = await createMockEvent(db, validateMockConfig(config), NOW);
    await submitMockScore(db, event.id, {
      productId: VALID_PRODUCT_ID, scoreClaim: "BCBTSC1-TEST", score: 7, total: 180,
      startedAt: Date.parse("2026-11-02T09:10:00.000Z"), endedAt: Date.parse("2026-11-02T10:00:00.000Z"),
      profile: { name: "Grace", phone: "08012345678" },
    }, NOW);
    const route = (await import("@/app/api/mock/[id]/results/route")).GET;
    const anon = await route(new Request("https://site.test/api/mock/x/results"), { params: Promise.resolve({ id: event.id }) });
    expect(anon.status).toBe(401);
    const authed = await route(new Request("https://site.test/api/mock/x/results", { headers: { authorization: `Bearer ${STAFF_TOKEN}` } }), { params: Promise.resolve({ id: event.id }) });
    expect(authed.status).toBe(200);
    const body = (await authed.json()) as { results: { productId: string; profile: { name?: string; phone?: string } }[] };
    expect(body.results[0].productId).toBe(VALID_PRODUCT_ID);
    expect(body.results[0].profile).toEqual({ name: "Grace", phone: "08012345678" });
  });
});

describe("mock routes", () => {
  const STAFF_TOKEN = "test-staff-token";
  process.env.BRAVO_STAFF_TOKEN = STAFF_TOKEN;

  it("POST /api/mock/:id/score returns the unchanged 201 success contract and rejects raw keys", async () => {
    const event = await createMockEvent(db, validateMockConfig(config), NOW);
    const postScore = (await import("@/app/api/mock/[id]/score/route")).POST;
    const request = (body: Record<string, unknown>) => new Request(`https://site.test/api/mock/${event.id}/score`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const base = {
      productId: VALID_PRODUCT_ID, scoreClaim: "BCBTSC1-TEST", score: 18, total: 25,
      startedAt: "2026-11-02T09:10:00.000Z", endedAt: "2026-11-02T10:00:00.000Z",
      profile: { name: "A Candidate", phone: "08012345678" },
    };
    const accepted = await postScore(request(base), { params: Promise.resolve({ id: event.id }) });
    expect(accepted.status).toBe(201);
    expect(Object.keys(await accepted.json()).sort()).toEqual(["id", "ok"]);

    const rejected = await postScore(request({ ...base, activationKey: "raw-key-is-not-accepted" }), { params: Promise.resolve({ id: event.id }) });
    expect(rejected.status).toBe(400);
    expect((await rejected.json()).error).toBe("raw_activation_key_rejected");
  });

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
    expect(body.mock?.examId).toBe("jamb");
    expect(body.mock && "closeAt" in body.mock).toBe(true);
    expect(body.mock?.editionYear).toBe(2026);
    expect(typeof body.mock?.seed).toBe("string");
    expect((await end(jsonReq("https://site.test/api/mock/end", {}, STAFF_TOKEN))).status).toBe(200);
    const after = (await (await current()).json()) as { mock: unknown };
    expect(after.mock).toBeNull();
  });
});

type MockConfigLike = { examId: string; closeAt: string; editionYear: number; seed: string };
