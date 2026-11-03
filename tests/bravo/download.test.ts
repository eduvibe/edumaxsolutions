import { afterEach, describe, expect, it } from "vitest";

const ORIGINAL = process.env.BRAVO_DOWNLOAD_URL;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.BRAVO_DOWNLOAD_URL;
  else process.env.BRAVO_DOWNLOAD_URL = ORIGINAL;
});

describe("GET /bravo/download", () => {
  it("returns 503 coming soon when BRAVO_DOWNLOAD_URL is not set", async () => {
    delete process.env.BRAVO_DOWNLOAD_URL;
    const { GET } = await import("@/app/bravo/download/route");
    const res = await GET();
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("download_not_available");
  });

  it("302-redirects to the configured download URL", async () => {
    process.env.BRAVO_DOWNLOAD_URL = "https://res.cloudinary.com/demo/raw/upload/fl_attachment/edumax/downloads/bravo-cbt-setup.exe";
    const { GET } = await import("@/app/bravo/download/route");
    const res = await GET();
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("fl_attachment");
  });

  it("rejects non-https values", async () => {
    process.env.BRAVO_DOWNLOAD_URL = "http://evil.example/x.exe";
    const { GET } = await import("@/app/bravo/download/route");
    expect((await GET()).status).toBe(503);
  });
});
