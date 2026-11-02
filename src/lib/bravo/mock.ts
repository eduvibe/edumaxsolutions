// Central mock event configuration, closeAt enforcement, and activation-key-verified scores.
import type { Client } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { verifyActivationKey } from "./vendor/license-core.js";
import { BRAVO_ACTIVATION_PUBLIC_KEY_PEM } from "./activation-key";

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

/** Validates the staff-supplied event configuration (same fields as the Bravo Manager page). */
export function validateMockConfig(body: Record<string, unknown>): Omit<MockEventConfig, "id"> {
  const title = requireString(body.title, "title", 200);
  const examId = requireString(body.examId, "examId", 60);
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
  activationKey: string;
  score: number;
  total: number;
  startedAt: string;
  endedAt: string;
};

export type ScoreResult = { accepted: true; id: string } | { accepted: false; code: string; message: string };

/**
 * Validates an activation key against its Product ID using the vendored Bravo
 * verification logic, enforces startsAt/closeAt, and stores the score.
 * Offline submissions are accepted late only when the validated attempt started
 * before closeAt and ended at or before closeAt.
 */
export async function submitMockScore(db: Client, eventId: string, body: Record<string, unknown>, now: string): Promise<ScoreResult> {
  const event = await db.execute({ sql: "SELECT * FROM bravo_mock_events WHERE id = ?", args: [eventId] });
  const ev = event.rows[0] as unknown as MockEventDbRow | undefined;
  if (!ev || ev.status !== "active") return { accepted: false, code: "no_active_mock", message: "No active mock event" };

  const productId = requireString(body.productId, "productId", 40);
  const activationKey = requireString(body.activationKey, "activationKey", 120);
  const score = body.score;
  const total = body.total;
  if (!Number.isInteger(score) || !Number.isInteger(total) || (score as number) < 0 || (total as number) <= 0 || (score as number) > (total as number)) {
    return { accepted: false, code: "invalid_score", message: "score/total must be integers with 0 <= score <= total" };
  }
  let startedAt: string;
  let endedAt: string;
  try {
    startedAt = requireIso(body.startedAt, "startedAt");
    endedAt = requireIso(body.endedAt, "endedAt");
  } catch (e) {
    return { accepted: false, code: (e as MockValidationError).code, message: (e as Error).message };
  }

  // Verify the activation key for this Product ID (offline-capable Bravo license check).
  const keyCheck = await verifyActivationKey({
    activationKey,
    productId,
    publicKeyPem: BRAVO_ACTIVATION_PUBLIC_KEY_PEM,
  });
  if (!keyCheck.ok) return { accepted: false, code: "invalid_activation_key", message: `Activation key check failed: ${keyCheck.reason}` };

  // Cutoff enforcement: startsAt blocks early starts; closeAt is the hard boundary.
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

  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO bravo_mock_scores (id, event_id, product_id, score, total, started_at, ended_at, submitted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, eventId, productId, score as number, total as number, startedAt, endedAt, now],
  });
  return { accepted: true, id };
}

export type LeaderboardEntry = {
  productId: string;
  score: number;
  total: number;
  submittedAt: string;
};

/** Leaderboard-safe fields only: productId and score. Never email/phone/contact data. */
export async function getLeaderboard(db: Client, eventId: string, limit = 100): Promise<LeaderboardEntry[]> {
  // Best score per Product ID (one row per product), highest first.
  const result = await db.execute({
    sql: `SELECT product_id AS productId, score, total, submitted_at AS submittedAt
          FROM bravo_mock_scores WHERE event_id = ? ORDER BY score DESC, submitted_at ASC`,
    args: [eventId],
  });
  const seen = new Set<string>();
  const entries: LeaderboardEntry[] = [];
  for (const row of result.rows as unknown as LeaderboardEntry[]) {
    if (seen.has(row.productId)) continue;
    seen.add(row.productId);
    entries.push(row);
    if (entries.length >= Math.min(Math.max(1, limit), 500)) break;
  }
  return entries;
}
