// Bravo report intake: strict validation + durable storage in Turso.
// Question reports carry only a stable reference; general_feedback is the only free-text category.
import type { Client } from "@libsql/client";

export const REPORT_CATEGORIES = [
  "incorrect_answer",
  "question_issue",
  "incomplete_question",
  "diagram_issue",
  "general_feedback",
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

/** Fields that must never appear in a report payload (question content / PII). */
const FORBIDDEN_FIELDS = [
  "stem",
  "options",
  "answer",
  "explanation",
  "passage",
  "image",
  "imageData",
  "email",
  "phone",
  "name",
  "contact",
];

export class ReportValidationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type QuestionReportPayload = {
  kind: "question";
  id: string;
  category: Exclude<ReportCategory, "general_feedback">;
  createdAt: string;
  productId: string;
  appVersion: string;
  examId: string;
  subjectId: string;
  questionId: string;
  year?: string;
  model?: string;
};

export type FeedbackReportPayload = {
  kind: "feedback";
  id: string;
  category: "general_feedback";
  createdAt: string;
  productId: string;
  appVersion: string;
  message: string;
};

export type ReportPayload = QuestionReportPayload | FeedbackReportPayload;

const ID_RE = /^[A-Za-z0-9_-]{8,80}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:?\d{2})$/;

function requireString(value: unknown, field: string, max = 120): string {
  if (typeof value !== "string" || !value.trim()) throw new ReportValidationError(`invalid_${field}`, `${field} is required`);
  const v = value.trim();
  if (v.length > max) throw new ReportValidationError(`invalid_${field}`, `${field} is too long`);
  return v;
}

function optionalString(value: unknown, field: string, max = 120): string | undefined {
  if (value === undefined || value === null) return undefined;
  return requireString(value, field, max);
}

function requireIso(value: unknown, field: string): string {
  const v = requireString(value, field, 40);
  if (!ISO_RE.test(v) || Number.isNaN(Date.parse(v))) throw new ReportValidationError(`invalid_${field}`, `${field} must be an ISO 8601 timestamp`);
  return v;
}

/**
 * Strictly validates a client report body. Unknown fields (including any question
 * content) are rejected, so no stem/options/answer/explanation/passage/image or
 * student contact data can be stored.
 */
export function validateReportPayload(body: Record<string, unknown>): ReportPayload {
  const keys = Object.keys(body);
  for (const f of FORBIDDEN_FIELDS) {
    if (keys.includes(f)) throw new ReportValidationError("forbidden_field", `Field '${f}' is not allowed in a report`);
  }

  const id = requireString(body.id, "id");
  if (!ID_RE.test(id)) throw new ReportValidationError("invalid_id", "id must be 8-80 chars of [A-Za-z0-9_-]");

  const category = body.category;
  if (typeof category !== "string" || !REPORT_CATEGORIES.includes(category as ReportCategory)) {
    throw new ReportValidationError("invalid_category", "Unknown report category");
  }

  const createdAt = requireIso(body.createdAt, "createdAt");
  // The Bravo client may send productId: null (e.g. before activation); store as empty string.
  const productId = body.productId === null ? "" : requireString(body.productId, "productId", 40);
  const appVersion = requireString(body.appVersion, "appVersion", 40);

  if (category === "general_feedback") {
    // general_feedback must not carry a question reference.
    for (const f of ["examId", "subjectId", "questionId", "year", "model"]) {
      if (body[f] !== undefined) throw new ReportValidationError("forbidden_field", `Field '${f}' is not allowed for general_feedback`);
    }
    const message = requireString(body.message, "message", 1000);
    return { kind: "feedback", id, category, createdAt, productId, appVersion, message };
  }

  // Question reports: reference only, no free text.
  if (body.message !== undefined) throw new ReportValidationError("forbidden_field", "message is only allowed for general_feedback");
  return {
    kind: "question",
    id,
    category: category as Exclude<ReportCategory, "general_feedback">,
    createdAt,
    productId,
    appVersion,
    examId: requireString(body.examId, "examId"),
    subjectId: requireString(body.subjectId, "subjectId"),
    questionId: requireString(body.questionId, "questionId"),
    year: optionalString(body.year, "year", 20),
    model: optionalString(body.model, "model"),
  };
}

export type ReportRow = {
  id: string;
  category: ReportCategory;
  product_id: string;
  app_version: string;
  exam_id: string | null;
  subject_id: string | null;
  question_id: string | null;
  year: string | null;
  model: string | null;
  message: string | null;
  status: "open" | "resolved";
  created_at: string;
  received_at: string;
  resolved_at: string | null;
};

/**
 * Persists a report. Idempotent by report id: a duplicate returns { created: false }
 * and never overwrites the original.
 */
export async function storeReport(db: Client, payload: ReportPayload, receivedAt: string) {
  const result = await db.execute({
    sql: `INSERT OR IGNORE INTO bravo_reports
      (id, category, product_id, app_version, exam_id, subject_id, question_id, year, model, message, status, created_at, received_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
    args: [
      payload.id,
      payload.category,
      payload.productId,
      payload.appVersion,
      payload.kind === "question" ? payload.examId : null,
      payload.kind === "question" ? payload.subjectId : null,
      payload.kind === "question" ? payload.questionId : null,
      payload.kind === "question" ? (payload.year ?? null) : null,
      payload.kind === "question" ? (payload.model ?? null) : null,
      payload.kind === "feedback" ? payload.message : null,
      payload.createdAt,
      receivedAt,
    ],
  });
  return { created: result.rowsAffected > 0 };
}

export async function listReports(
  db: Client,
  opts: { status: "open" | "resolved" | "all"; limit: number }
): Promise<ReportRow[]> {
  const limit = Math.min(Math.max(1, opts.limit), 200);
  const where = opts.status === "all" ? "" : "WHERE status = ?";
  const args: (string | number)[] = opts.status === "all" ? [] : [opts.status];
  const result = await db.execute({
    sql: `SELECT * FROM bravo_reports ${where} ORDER BY received_at DESC LIMIT ?`,
    args: [...args, limit],
  });
  return result.rows as unknown as ReportRow[];
}

export async function resolveReport(db: Client, id: string, resolvedAt: string): Promise<ReportRow | null> {
  const result = await db.execute({
    sql: `UPDATE bravo_reports SET status = 'resolved', resolved_at = ? WHERE id = ? AND status = 'open'`,
    args: [resolvedAt, id],
  });
  if (result.rowsAffected === 0) {
    const existing = await db.execute({ sql: "SELECT * FROM bravo_reports WHERE id = ?", args: [id] });
    return (existing.rows[0] as unknown as ReportRow) ?? null;
  }
  const row = await db.execute({ sql: "SELECT * FROM bravo_reports WHERE id = ?", args: [id] });
  return (row.rows[0] as unknown as ReportRow) ?? null;
}

/** Permanently deletes a report (e.g. test entries or already-treated ones). */
export async function deleteReport(db: Client, id: string): Promise<boolean> {
  const result = await db.execute({ sql: "DELETE FROM bravo_reports WHERE id = ?", args: [id] });
  return result.rowsAffected > 0;
}
