// Report validation, idempotent storage, review flow, and route authorization.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, VALID_PRODUCT_ID } from "./helpers";

const STAFF_TOKEN = "test-staff-token";
process.env.BRAVO_STAFF_TOKEN = STAFF_TOKEN;
const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/bravo/db", () => ({ getBravoDb: () => holder.db }));

import { validateReportPayload, storeReport, listReports, resolveReport, ReportValidationError } from "@/lib/bravo/reports";

const questionBody = {
  id: "rep_0001Abcd",
  category: "incorrect_answer",
  createdAt: "2026-11-02T10:00:00.000Z",
  productId: VALID_PRODUCT_ID,
  appVersion: "1.4.0",
  examId: "utme",
  subjectId: "mathematics",
  questionId: "utme-math-2023-q12",
  year: "2023",
  model: "Bravo",
};

const feedbackBody = {
  id: "rep_0002EfGh",
  category: "general_feedback",
  createdAt: "2026-11-02T10:05:00.000Z",
  productId: VALID_PRODUCT_ID,
  appVersion: "1.4.0",
  message: "The app crashes when I open the 2019 physics paper.",
};

let db: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => {
  db = await createTestDb();
  holder.db = db;
});

describe("validateReportPayload", () => {
  it("accepts a valid question report and a valid general feedback report", () => {
    expect(validateReportPayload(questionBody).kind).toBe("question");
    const fb = validateReportPayload(feedbackBody);
    expect(fb.kind).toBe("feedback");
    if (fb.kind === "feedback") expect(fb.message).toContain("crashes");
  });

  it("rejects question content fields (stem/options/answer/explanation/passage/image)", () => {
    for (const field of ["stem", "options", "answer", "explanation", "passage", "image"]) {
      expect(() => validateReportPayload({ ...questionBody, [field]: "x" })).toThrow(ReportValidationError);
    }
  });

  it("rejects student contact fields", () => {
    expect(() => validateReportPayload({ ...feedbackBody, email: "a@b.c" })).toThrow(ReportValidationError);
  });

  it("rejects unknown categories and malformed ids", () => {
    expect(() => validateReportPayload({ ...questionBody, category: "spam" })).toThrow(ReportValidationError);
    expect(() => validateReportPayload({ ...questionBody, id: "x" })).toThrow(ReportValidationError);
  });

  it("requires a non-empty message of at most 1000 chars for general_feedback and forbids question refs", () => {
    expect(() => validateReportPayload({ ...feedbackBody, message: "" })).toThrow(ReportValidationError);
    expect(() => validateReportPayload({ ...feedbackBody, message: "x".repeat(1001) })).toThrow(ReportValidationError);
    expect(() => validateReportPayload({ ...feedbackBody, questionId: "q1" })).toThrow(ReportValidationError);
    expect(validateReportPayload({ ...feedbackBody, message: "x".repeat(1000) }).kind).toBe("feedback");
  });
});

describe("report storage", () => {
  it("is idempotent by report id", async () => {
    const first = await storeReport(db, validateReportPayload(questionBody), "2026-11-02T10:00:01.000Z");
    expect(first.created).toBe(true);
    const dup = await storeReport(db, validateReportPayload(questionBody), "2026-11-02T10:00:02.000Z");
    expect(dup.created).toBe(false);
    const all = await listReports(db, { status: "all", limit: 10 });
    expect(all.filter((r) => r.id === questionBody.id)).toHaveLength(1);
  });

  it("filters by status and resolves a report with resolvedAt", async () => {
    await storeReport(db, validateReportPayload(feedbackBody), "2026-11-02T10:05:01.000Z");
    const open = await listReports(db, { status: "open", limit: 50 });
    expect(open.every((r) => r.status === "open")).toBe(true);
    expect(open.length).toBeGreaterThanOrEqual(2);

    const resolved = await resolveReport(db, feedbackBody.id, "2026-11-02T11:00:00.000Z");
    expect(resolved?.status).toBe("resolved");
    expect(resolved?.resolved_at).toBe("2026-11-02T11:00:00.000Z");
    const openAfter = await listReports(db, { status: "open", limit: 50 });
    expect(openAfter.find((r) => r.id === feedbackBody.id)).toBeUndefined();
    expect(await resolveReport(db, "missing-id", "2026-11-02T11:00:00.000Z")).toBeNull();
  });
});

describe("report routes", () => {
  const postRoute = async () => (await import("@/app/api/reports/route")).POST;
  const getRoute = async () => (await import("@/app/api/reports/route")).GET;
  const resolveRoute = async () => (await import("@/app/api/reports/[id]/resolve/route")).POST;
  const jsonReq = (url: string, body: unknown, token?: string) =>
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
  const authedGet = (url: string, token = STAFF_TOKEN) =>
    new Request(url, { headers: { authorization: `Bearer ${token}` } });

  it("POST /api/reports is public, returns the Bravo success contract (ok + reportId), and rejects question-content payloads", async () => {
    const POST = await postRoute();
    const ok = await POST(jsonReq("https://site.test/api/reports", questionBody));
    expect(ok.status).toBe(200); // duplicate of the stored id -> idempotent 200
    const okBody = (await ok.json()) as { ok: boolean; reportId: string };
    expect(okBody.ok).toBe(true);
    expect(okBody.reportId).toBe(questionBody.id);
    const bad = await POST(jsonReq("https://site.test/api/reports", { ...questionBody, id: "rep_0003IjKl", stem: "2+2=?" }));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe("forbidden_field");
  });

  it("accepts productId: null and answers CORS preflight", async () => {
    const POST = await postRoute();
    const res = await POST(jsonReq("https://site.test/api/reports", { ...feedbackBody, id: "rep_nullPid1", productId: null }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { ok: boolean; reportId: string };
    expect(body).toMatchObject({ ok: true, reportId: "rep_nullPid1" });
    expect(res.headers.get("access-control-allow-origin")).toBe("*");

    const mod = await import("@/app/api/reports/route");
    const pre = await mod.OPTIONS();
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-methods")).toContain("POST");
  });

  it("GET /api/reports requires the Bravo staff token", async () => {
    const GET = await getRoute();
    const denied = await GET(new Request("https://site.test/api/reports?status=open"));
    expect(denied.status).toBe(401);
    const wrong = await GET(authedGet("https://site.test/api/reports?status=open", "wrong"));
    expect(wrong.status).toBe(401);
    const res = await GET(authedGet("https://site.test/api/reports?status=all&limit=10"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { reports: unknown[] };
    expect(body.reports.length).toBeGreaterThanOrEqual(2);
  });

  it("POST /api/reports/:id/resolve requires the staff token and marks the report resolved", async () => {
    const POST = await resolveRoute();
    const denied = await POST(jsonReq("https://site.test/api/reports/x/resolve", {}), { params: Promise.resolve({ id: questionBody.id }) });
    expect(denied.status).toBe(401);
    const res = await POST(jsonReq("https://site.test/api/reports/x/resolve", {}, STAFF_TOKEN), { params: Promise.resolve({ id: questionBody.id }) });
    expect(res.status).toBe(200);
    const missing = await POST(jsonReq("https://site.test/api/reports/x/resolve", {}, STAFF_TOKEN), { params: Promise.resolve({ id: "nope" }) });
    expect(missing.status).toBe(404);
  });
});
