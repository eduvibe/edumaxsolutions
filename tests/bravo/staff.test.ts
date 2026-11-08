// Bravo staff accounts: per-staff tokens, permission enforcement, revocation, export.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./helpers";

const SUPER_TOKEN = "super-secret-env-token";
const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/bravo/db", () => ({ getBravoDb: () => holder.db }));
process.env.BRAVO_STAFF_TOKEN = SUPER_TOKEN;

import { authenticateBravoStaff, createStaff, revokeStaff, hashStaffToken } from "@/lib/bravo/staff";
import { storeReport, validateReportPayload } from "@/lib/bravo/reports";

let db: Awaited<ReturnType<typeof createTestDb>>;
const req = (token?: string) =>
  new Request("https://site.test/api/x", token ? { headers: { authorization: `Bearer ${token}` } } : {});

beforeAll(async () => {
  db = await createTestDb();
  holder.db = db;
});

beforeEach(async () => {
  await db.execute("DELETE FROM bravo_staff");
  await db.execute("DELETE FROM bravo_reports");
});

describe("staff accounts", () => {
  it("env token is a super-admin with all permissions; unknown/revoked tokens are rejected", async () => {
    const superAdmin = await authenticateBravoStaff(req(SUPER_TOKEN), db);
    expect("ctx" in superAdmin && superAdmin.ctx.isSuperAdmin).toBe(true);

    const none = await authenticateBravoStaff(req(), db);
    expect("error" in none && none.error.status).toBe(401);
    const wrong = await authenticateBravoStaff(req("nope"), db);
    expect("error" in wrong && wrong.error.status).toBe(401);

    const { staff, token } = await createStaff(db, { name: "Ada", permissions: ["reports_review"] }, "2026-11-02T12:00:00.000Z");
    expect(hashStaffToken(token)).not.toBe(token); // only the hash is stored
    const row = await db.execute({ sql: "SELECT token_hash FROM bravo_staff WHERE id = ?", args: [staff.id] });
    expect(row.rows[0]?.token_hash).toBe(hashStaffToken(token));

    const ok = await authenticateBravoStaff(req(token), db);
    expect("ctx" in ok && ok.ctx.permissions).toEqual(["reports_review"]);
    expect("ctx" in ok && ok.ctx.isSuperAdmin).toBe(false);

    expect(await revokeStaff(db, staff.id, "2026-11-02T13:00:00.000Z")).toBe(true);
    const after = await authenticateBravoStaff(req(token), db);
    expect("error" in after && after.error.status).toBe(401);
    expect(await revokeStaff(db, staff.id, "2026-11-02T13:01:00.000Z")).toBe(false);
  });

  it("createStaff validates name and permissions", async () => {
    await expect(createStaff(db, { name: " ", permissions: ["reports_review"] }, "t")).rejects.toThrow(/name/);
    await expect(createStaff(db, { name: "Bob", permissions: [] }, "t")).rejects.toThrow(/permission/);
  });
});

describe("permission enforcement on routes", () => {
  const jsonReq = (url: string, body: unknown, token?: string) =>
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });

  it("reports_review staff can list/resolve but not create mocks; mock_manage cannot review reports", async () => {
    const { token: reviewer } = await createStaff(db, { name: "Rev", permissions: ["reports_review", "reports_export"] }, "t");
    const { token: manager } = await createStaff(db, { name: "Mgr", permissions: ["mock_manage"] }, "t");

    const reportsGet = (await import("@/app/api/reports/route")).GET;
    const resolvePost = (await import("@/app/api/reports/[id]/resolve/route")).POST;
    const mockCreate = (await import("@/app/api/mock/create/route")).POST;
    const staffGet = (await import("@/app/api/staff/route")).GET;

    // no token -> 401
    expect((await reportsGet(req())).status).toBe(401);
    // reviewer can list reports
    expect((await reportsGet(req(reviewer))).status).toBe(200);
    // reviewer cannot create mocks -> 403
    expect(
      (
        await mockCreate(
          jsonReq("https://site.test/api/mock/create", { title: "T", examId: "jamb", durationMin: 60, editionYear: 2026, seed: "s", startsAt: "2026-11-02T09:00:00.000Z", closeAt: "2026-11-02T11:00:00.000Z" }, reviewer)
        )
      ).status
    ).toBe(403);
    // manager can create mocks but not list reports
    expect(
      (
        await mockCreate(
          jsonReq("https://site.test/api/mock/create", { title: "T", examId: "jamb", durationMin: 60, editionYear: 2026, seed: "s", startsAt: "2026-11-02T09:00:00.000Z", closeAt: "2026-11-02T11:00:00.000Z" }, manager)
        )
      ).status
    ).toBe(201);
    expect((await reportsGet(req(manager))).status).toBe(403);
    // staff listing is super-admin only
    expect((await staffGet(req(reviewer))).status).toBe(403);
    expect((await staffGet(req(SUPER_TOKEN))).status).toBe(200);
    // reviewer can resolve
    await storeReport(db, validateReportPayload({ id: "rep_0001Abcd", category: "general_feedback", createdAt: "2026-11-02T10:00:00.000Z", productId: "BCBT-YDR9-G5WQ-0860", appVersion: "1.4.0", message: "hi" }), "2026-11-02T10:00:01.000Z");
    const res = await resolvePost(jsonReq("https://site.test/api/reports/x/resolve", {}, reviewer), { params: Promise.resolve({ id: "rep_0001Abcd" }) });
    expect(res.status).toBe(200);
  });

  it("export returns CSV of report references only and requires reports_export", async () => {
    const { token: viewer } = await createStaff(db, { name: "View", permissions: ["reports_review"] }, "t");
    const { token: exporter } = await createStaff(db, { name: "Exp", permissions: ["reports_export"] }, "t");

    await storeReport(db, validateReportPayload({ id: "rep_0002EfGh", category: "incorrect_answer", createdAt: "2026-11-02T10:00:00.000Z", productId: "BCBT-YDR9-G5WQ-0860", appVersion: "1.4.0", examId: "utme", subjectId: "math", questionId: "q-1" }), "2026-11-02T10:00:01.000Z");

    const exp = (await import("@/app/api/reports/export/route")).GET;
    expect((await exp(req(viewer))).status).toBe(403);
    const res = await exp(new Request("https://site.test/api/reports/export?format=csv&status=all", { headers: { authorization: `Bearer ${exporter}` } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const csv = await res.text();
    expect(csv).toContain("rep_0002EfGh");
    expect(csv).toContain("utme,math,q-1");
    expect(csv).not.toContain("stem");
  });
});
