// Central mock event configuration, closeAt enforcement, and signed scoreClaim eligibility.
import type { Client } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { normalizeProductId } from "./vendor/license-core.js";
import { ScoreClaimError, verifyScoreClaim } from "./score-claim";

export class MockValidationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type MockEventConfig = {
  id: string;
  title: string;
  examId: string;
  subjectIds?: string[];
  countPerSubject?: number;
  durationMin: number;
  editionYear: number;
  seed: string;
  startsAt: string;
  closeAt: string;
};

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:?\d{2})$/;

function requireString(value: unknown, field: string, max = 120): string {
  if (typeof value !== "string" || !value.trim()) throw new MockValidationError(`invalid_${field}`, `${field} is required`);
  const v = value.trim();
  if (v.length > max) throw new MockValidationError(`invalid_${field}`, `${field} is too long`);
  return v;
}

function requireIso(value: unknown, field: string): string {
  const v = requireString(value, field, 40);
  if (!ISO_RE.test(v) || Number.isNaN(Date.parse(v))) throw new MockValidationError(`invalid_${field}`, `${field} must be an ISO 8601 timestamp`);
  return v;
}

/**
 * Accepts attempt timestamps as ISO 8601 strings OR Unix epoch milliseconds
 * (number or numeric string) — Bravo's offline queue stores ms. Returns ISO 8601 UTC.
 */
function parseTimestamp(value: unknown, field: string): string {
  const asNumber = typeof value === "number" ? value : typeof value === "string" && /^\d{10,14}$/.test(value.trim()) ? Number(value.trim()) : NaN;
  if (Number.isFinite(asNumber)) {
    // Heuristic: values below 1e12 are Unix SECONDS, otherwise milliseconds.
    const ms = asNumber < 1e12 ? asNumber * 1000 : asNumber;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) throw new MockValidationError(`invalid_${field}`, `${field} is not a valid timestamp`);
    return d.toISOString();
  }
  return requireIso(value, field);
}

export type ScoreProfile = {
  name?: string;
  phone?: string;
};

const PROFILE_FIELDS: Record<keyof ScoreProfile, number> = {
  name: 80,
  phone: 30,
};

/** Accept only the candidate name and phone that staff results are permitted to expose. */
export function sanitizeProfile(value: unknown): ScoreProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const out: ScoreProfile = {};
  for (const [field, max] of Object.entries(PROFILE_FIELDS) as [keyof ScoreProfile, number][]) {
    const raw = input[field];
    if (typeof raw !== "string") continue;
    const v = raw.trim().slice(0, max);
    if (v) out[field] = v;
  }
  return out;
}

/** Candidate name and phone are accepted only inside profile; other fields are ignored. */
export function extractProfile(body: Record<string, unknown>): ScoreProfile {
  return sanitizeProfile(body.profile);
}

/** Merges non-empty profile details; never overwrites with empty values. */
function mergeProfile(existing: ScoreProfile, incoming: ScoreProfile): ScoreProfile {
  const merged: ScoreProfile = { ...existing };
  for (const [k, v] of Object.entries(incoming) as [keyof ScoreProfile, string][]) {
    if (v) merged[k] = v;
  }
  return merged;
}

function maskProductId(productId: string): string {
  if (productId.length <= 8) return "****";
  return `${productId.slice(0, 4)}****${productId.slice(-4)}`;
}

/** Validates the staff-supplied event configuration (same fields as the Bravo Manager page). */
export function validateMockConfig(body: Record<string, unknown>): Omit<MockEventConfig, "id"> {
  const title = requireString(body.title, "title", 200);
  const examId = requireString(body.examId, "examId", 60).toLowerCase();
  if (examId !== "jamb" && examId !== "waec") {
    throw new MockValidationError("invalid_examId", "examId must be jamb or waec");
  }
  const durationMin = body.durationMin;
  if (!Number.isInteger(durationMin) || (durationMin as number) <= 0 || (durationMin as number) > 24 * 60) {
    throw new MockValidationError("invalid_durationMin", "durationMin must be a positive integer of minutes");
  }
  const editionYear = body.editionYear;
  if (!Number.isInteger(editionYear) || (editionYear as number) < 2000 || (editionYear as number) > 2100) {
    throw new MockValidationError("invalid_editionYear", "editionYear must be a four-digit year");
  }
  const seed = requireString(body.seed, "seed", 80);
  const startsAt = requireIso(body.startsAt, "startsAt");
  const closeAt = requireIso(body.closeAt, "closeAt");
  if (Date.parse(closeAt) <= Date.parse(startsAt)) {
    throw new MockValidationError("invalid_window", "closeAt must be after startsAt");
  }

  let subjectIds: string[] | undefined;
  if (body.subjectIds !== undefined) {
    if (!Array.isArray(body.subjectIds) || body.subjectIds.length === 0 || body.subjectIds.some((s) => typeof s !== "string" || !s.trim() || s.length > 60)) {
      throw new MockValidationError("invalid_subjectIds", "subjectIds must be a non-empty array of strings");
    }
    subjectIds = body.subjectIds.map((s) => (s as string).trim());
  }
  let countPerSubject: number | undefined;
  if (body.countPerSubject !== undefined) {
    if (!Number.isInteger(body.countPerSubject) || (body.countPerSubject as number) <= 0 || (body.countPerSubject as number) > 500) {
      throw new MockValidationError("invalid_countPerSubject", "countPerSubject must be a positive integer");
    }
    countPerSubject = body.countPerSubject as number;
  }

  return { title, examId, subjectIds, countPerSubject, durationMin: durationMin as number, editionYear: editionYear as number, seed, startsAt, closeAt };
}

type MockEventDbRow = {
  id: string;
  title: string;
  exam_id: string;
  subject_ids: string | null;
  count_per_subject: number | null;
  duration_min: number;
  edition_year: number;
  seed: string;
  starts_at: string;
  close_at: string;
  status: "active" | "ended";
  created_at: string;
  ended_at: string | null;
};

function rowToConfig(row: MockEventDbRow): MockEventConfig {
  return {
    id: row.id,
    title: row.title,
    examId: row.exam_id,
    subjectIds: row.subject_ids ? (JSON.parse(row.subject_ids) as string[]) : undefined,
    countPerSubject: row.count_per_subject ?? undefined,
    durationMin: row.duration_min,
    editionYear: row.edition_year,
    seed: row.seed,
    startsAt: row.starts_at,
    closeAt: row.close_at,
  };
}

/** The currently published event, or null. closeAt stays visible so clients can cap attempts. */
export async function getCurrentMock(db: Client): Promise<MockEventConfig | null> {
  const result = await db.execute({
    sql: `SELECT * FROM bravo_mock_events WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`,
    args: [],
  });
  const row = result.rows[0] as unknown as MockEventDbRow | undefined;
  if (!row) return null;
  return rowToConfig(row);
}

/** Publishes a new event; any previously active event is ended first (one active event at a time). */
export async function createMockEvent(db: Client, config: Omit<MockEventConfig, "id">, now: string): Promise<MockEventConfig> {
  const id = randomUUID();
  await db.execute("UPDATE bravo_mock_events SET status = 'ended', ended_at = ? WHERE status = 'active'", [now]);
  await db.execute({
    sql: `INSERT INTO bravo_mock_events
      (id, title, exam_id, subject_ids, count_per_subject, duration_min, edition_year, seed, starts_at, close_at, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
    args: [
      id,
      config.title,
      config.examId,
      config.subjectIds ? JSON.stringify(config.subjectIds) : null,
      config.countPerSubject ?? null,
      config.durationMin,
      config.editionYear,
      config.seed,
      config.startsAt,
      config.closeAt,
      now,
    ],
  });
  return { id, ...config };
}

/** Ends the active event immediately. */
export async function endCurrentMock(db: Client, now: string): Promise<boolean> {
  const result = await db.execute({
    sql: "UPDATE bravo_mock_events SET status = 'ended', ended_at = ? WHERE status = 'active'",
    args: [now],
  });
  return result.rowsAffected > 0;
}

export type ScoreSubmission = {
  productId: string;
  scoreClaim: string;
  score: number;
  total: number;
  startedAt: string;
  endedAt: string;
  profile?: ScoreProfile;
};

export type ScoreResult = { accepted: true; id: string; duplicate?: boolean } | { accepted: false; code: string; message: string };

/**
 * Verifies Bravo's signed scoreClaim for licence eligibility, enforces score/timing
 * rules, and stores the score. The claim does not authenticate score, timing, profile,
 * or event ID. Offline submissions are accepted only when the attempt fits the event window.
 */
export async function submitMockScore(db: Client, eventId: string, body: Record<string, unknown>, now: string): Promise<ScoreResult> {
  // Look up the mock by the ID in the path — a closed/ended mock must still accept delayed
  // offline scores when its timing rules permit. no_active_mock is only for unknown IDs.
  const event = await db.execute({ sql: "SELECT * FROM bravo_mock_events WHERE id = ?", args: [eventId] });
  const ev = event.rows[0] as unknown as MockEventDbRow | undefined;
  if (!ev) return { accepted: false, code: "no_active_mock", message: "Unknown mock event id" };

  if (Object.prototype.hasOwnProperty.call(body, "activationKey")) {
    return { accepted: false, code: "raw_activation_key_rejected", message: "Send scoreClaim instead of activationKey" };
  }
  const rawProductId = requireString(body.productId, "productId", 40);
  const productId = normalizeProductId(rawProductId);
  if (!productId) throw new MockValidationError("invalid_product_id", "Enter a valid Bravo Product ID");
  const score = body.score;
  const total = body.total;
  if (!Number.isInteger(score) || !Number.isInteger(total) || (score as number) < 0 || (total as number) <= 0 || (score as number) > (total as number)) {
    return { accepted: false, code: "invalid_score", message: "score/total must be integers with 0 <= score <= total" };
  }
  let startedAt: string;
  let endedAt: string;
  try {
    startedAt = parseTimestamp(body.startedAt, "startedAt");
    endedAt = parseTimestamp(body.endedAt, "endedAt");
  } catch (e) {
    return { accepted: false, code: (e as MockValidationError).code, message: (e as Error).message };
  }

  // The signed claim proves licence eligibility only; score/timing/profile/event fields
  // remain separately validated and are not covered by this signature.
  try {
    verifyScoreClaim(body.scoreClaim, productId, {
      title: ev.title,
      exam_id: ev.exam_id,
      edition_year: ev.edition_year,
    }, Date.parse(now));
  } catch (error) {
    if (error instanceof ScoreClaimError) return { accepted: false, code: error.code, message: error.message };
    throw error;
  }

  // Cutoff enforcement against the event's configured window (regardless of active status).
  if (Date.parse(startedAt) < Date.parse(ev.starts_at)) {
    return { accepted: false, code: "before_start", message: "Attempt started before the mock startsAt" };
  }
  if (Date.parse(startedAt) >= Date.parse(ev.close_at)) {
    return { accepted: false, code: "after_close", message: "Attempt started at/after closeAt" };
  }
  if (Date.parse(endedAt) > Date.parse(ev.close_at)) {
    return { accepted: false, code: "after_close", message: "Attempt ended after closeAt" };
  }
  if (Date.parse(endedAt) < Date.parse(startedAt)) {
    return { accepted: false, code: "invalid_window", message: "endedAt must be at/after startedAt" };
  }

  const profile = extractProfile(body);

  // One row per (event, product). Best score wins; retries merge profile details without
  // touching the best score, rank, or its submission time.
  const existing = await db.execute({
    sql: `SELECT id, score, total, started_at, ended_at, submitted_at, profile_name, profile_phone
          FROM bravo_mock_scores WHERE event_id = ? AND product_id = ?`,
    args: [eventId, productId],
  });
  const prior = existing.rows[0] as unknown as {
    id: string; score: number; total: number; started_at: string; ended_at: string; submitted_at: string;
    profile_name: string | null; profile_phone: string | null;
  } | undefined;

  if (prior) {
    const identical = prior.score === score && prior.total === total && prior.started_at === startedAt && prior.ended_at === endedAt;
    const merged = mergeProfile(
      { name: prior.profile_name ?? undefined, phone: prior.profile_phone ?? undefined },
      profile
    );
    if (identical && Object.keys(profile).length === 0) return { accepted: true, id: prior.id, duplicate: true };
    if ((score as number) > prior.score) {
      // new best score: replace score/timing, keep merged profile
      await db.execute({
        sql: `UPDATE bravo_mock_scores SET score = ?, total = ?, started_at = ?, ended_at = ?, submitted_at = ?,
              profile_name = ?, profile_phone = ? WHERE id = ?`,
        args: [score as number, total as number, startedAt, endedAt, now, merged.name ?? null, merged.phone ?? null, prior.id],
      });
    } else {
      // lower/equal score: keep best score and its submitted_at; merge any new profile details only
      await db.execute({
        sql: `UPDATE bravo_mock_scores SET profile_name = ?, profile_phone = ? WHERE id = ?`,
        args: [merged.name ?? null, merged.phone ?? null, prior.id],
      });
    }
    return { accepted: true, id: prior.id, duplicate: true };
  }

  const id = randomUUID();
  await db.execute({
    sql: `INSERT OR IGNORE INTO bravo_mock_scores (id, event_id, product_id, score, total, started_at, ended_at, submitted_at,
          profile_name, profile_phone)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, eventId, productId, score as number, total as number, startedAt, endedAt, now,
      profile.name ?? null, profile.phone ?? null],
  });
  return { accepted: true, id };
}

export type LeaderboardEntry = {
  name: string;
  score: number;
};

type ScoreRow = ScoreProfile & {
  productId: string;
  score: number;
  total: number;
  startedAt: string;
  endedAt: string;
  submittedAt: string;
};

function rowToScore(r: Record<string, unknown>): ScoreRow {
  return {
    productId: r.product_id as string,
    score: r.score as number,
    total: r.total as number,
    startedAt: r.started_at as string,
    endedAt: r.ended_at as string,
    submittedAt: r.submitted_at as string,
    name: (r.profile_name as string) ?? undefined,
    phone: (r.profile_phone as string) ?? undefined,
  };
}

/** Public leaderboard returns only candidate name (or Candidate) and score. */
export async function getLeaderboard(db: Client, eventId: string, limit = 100): Promise<LeaderboardEntry[]> {
  const result = await db.execute({
    sql: `SELECT profile_name, score FROM bravo_mock_scores
          WHERE event_id = ? ORDER BY score DESC, submitted_at ASC`,
    args: [eventId],
  });
  return (result.rows as unknown as Record<string, unknown>[])
    .slice(0, Math.min(Math.max(1, limit), 500))
    .map((row) => ({ name: (row.profile_name as string)?.trim() || "Candidate", score: Number(row.score) }));
}

export type StaffResultEntry = {
  label: string;
  productId: string;
  score: number;
  total: number;
  submittedAt: string;
  profile: ScoreProfile;
};

/** Staff-only results: includes raw product id and full profile for contacting reward recipients. */
export async function getStaffResults(db: Client, eventId: string, limit = 200): Promise<StaffResultEntry[]> {
  const result = await db.execute({
    sql: `SELECT * FROM bravo_mock_scores WHERE event_id = ? ORDER BY score DESC, submitted_at ASC`,
    args: [eventId],
  });
  return (result.rows as unknown as Record<string, unknown>[]).slice(0, Math.min(Math.max(1, limit), 500)).map((r) => {
    const row = rowToScore(r);
    return {
      label: row.name ?? maskProductId(row.productId),
      productId: row.productId,
      score: row.score,
      total: row.total,
      submittedAt: row.submittedAt,
      profile: { name: row.name, phone: row.phone },
    };
  });
}

export type MockEventSummary = MockEventConfig & { status: "active" | "ended" };

/** All events, newest first — lets clients show past mocks and their results after they end. */
export async function listMockEvents(db: Client, limit = 50): Promise<MockEventSummary[]> {
  const result = await db.execute({
    sql: "SELECT * FROM bravo_mock_events ORDER BY created_at DESC LIMIT ?",
    args: [Math.min(Math.max(1, limit), 200)],
  });
  return (result.rows as unknown as MockEventDbRow[]).map((row) => ({ ...rowToConfig(row), status: row.status }));
}

export async function getMockEvent(db: Client, id: string): Promise<(MockEventConfig & { status: string }) | null> {
  const result = await db.execute({ sql: "SELECT * FROM bravo_mock_events WHERE id = ?", args: [id] });
  const row = result.rows[0] as unknown as MockEventDbRow | undefined;
  return row ? { ...rowToConfig(row), status: row.status } : null;
}

async function eventScoreCount(db: Client, eventId: string): Promise<number> {
  const r = await db.execute({ sql: "SELECT COUNT(*) AS n FROM bravo_mock_scores WHERE event_id = ?", args: [eventId] });
  return Number((r.rows[0] as unknown as { n: number | string }).n);
}

/**
 * Edits an active event's configuration. Only allowed before the event starts
 * (now < startsAt) and while no scores have been submitted — once students have
 * started, the event is locked and can only be ended.
 */
export async function updateMockEvent(
  db: Client,
  id: string,
  config: Omit<MockEventConfig, "id">,
  now: string
): Promise<{ ok: true; mock: MockEventConfig } | { ok: false; code: string; message: string }> {
  const ev = await getMockEvent(db, id);
  if (!ev) return { ok: false, code: "not_found", message: "Mock event not found" };
  if (ev.status !== "active") return { ok: false, code: "locked", message: "Event is ended and cannot be edited" };
  if (Date.parse(now) >= Date.parse(ev.startsAt)) return { ok: false, code: "locked", message: "Event has already started; end it instead" };
  if ((await eventScoreCount(db, id)) > 0) return { ok: false, code: "locked", message: "Scores already submitted; event is locked" };
  await db.execute({
    sql: `UPDATE bravo_mock_events SET title = ?, exam_id = ?, subject_ids = ?, count_per_subject = ?,
          duration_min = ?, edition_year = ?, seed = ?, starts_at = ?, close_at = ? WHERE id = ?`,
    args: [
      config.title, config.examId,
      config.subjectIds ? JSON.stringify(config.subjectIds) : null,
      config.countPerSubject ?? null,
      config.durationMin, config.editionYear, config.seed, config.startsAt, config.closeAt, id,
    ],
  });
  return { ok: true, mock: { id, ...config } };
}

/**
 * Deletes a mock event. Only allowed while no scores exist for it
 * (an event with results is kept and can be ended instead).
 */
export async function deleteMockEvent(db: Client, id: string): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const ev = await getMockEvent(db, id);
  if (!ev) return { ok: false, code: "not_found", message: "Mock event not found" };
  if ((await eventScoreCount(db, id)) > 0) {
    return { ok: false, code: "has_scores", message: "Event already has submitted scores; end it instead of deleting" };
  }
  await db.execute({ sql: "DELETE FROM bravo_mock_events WHERE id = ?", args: [id] });
  return { ok: true };
}
